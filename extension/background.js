const USER_AGENT = 'SB29-Guard-Chrome-Extension/0.2.1';
const CACHE_DURATION_MINUTES = 60 * 24; // Cache data for 24 hours

/**
 * Parses a URL string and returns domain information, including app store detection.
 * Handles subdomains and invalid URLs gracefully.
 * @param {string | null | undefined} urlString The URL to parse.
 * @returns {object | null} An object containing domain information or null if the URL is invalid.
 */
function getDomainInfo(urlString) {
    if (!urlString || typeof urlString !== 'string') {
        return null;
    }
    try {
        const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
        const hostname = url.hostname.toLowerCase();

        let appID = null;
        let isAppStore = false;
        let appStoreName = null;
        
        try {
            switch (hostname) {
                case 'apps.apple.com':
                    isAppStore = true;
                    appStoreName = 'Apple App Store';
                    if (url.pathname.includes('/app/')) {
                        const applePathParts = url.pathname.split("/");
                        appID = applePathParts[applePathParts.length - 1];
                    }
                    break;
                case 'chromewebstore.google.com':
                    isAppStore = true;
                    appStoreName = 'Chrome Web Store';
                    const chromePathParts = url.pathname.split("/");
                    if (chromePathParts.length > 2) {
                         appID = chromePathParts[chromePathParts.length - 1];
                    }
                    break;
                case 'play.google.com':
                    isAppStore = true;
                    appStoreName = 'Google Play Store';
                    appID = url.searchParams.get('id');
                    break;
                case 'workspace.google.com':
                    isAppStore = true;
                    appStoreName = 'Google Workspace App';
                    const marketplacePathParts = url.pathname.split("/");
                    const potentialAppID = marketplacePathParts[marketplacePathParts.length - 1];
                    if (/^[a-zA-Z0-9\-_]+$/.test(potentialAppID)) {
                        appID = potentialAppID;
                    }
                    break;
                default:
                    isAppStore = false;
                    break;
            }
        } catch (e) {
            console.warn("Error parsing app store URL:", e);
        }

        return {
            hostname: hostname,
            isAppStore: isAppStore,
            appStoreName: appStoreName,
            appID: appID
        };

    } catch (e) {
        console.error("Invalid URL:", urlString, e);
        return null;
    }
}

/**
 * Fetches and parses the DPA list from the CSV URL stored in options.
 */
async function getAndUpdateDpaList() {
    const data = await chrome.storage.local.get(['dpaList', 'lastUpdated', 'sheetUrl']);
    const now = Date.now();

    if (data.dpaList && data.lastUpdated && (now - data.lastUpdated < CACHE_DURATION_MINUTES * 60 * 1000)) {
        return data.dpaList;
    }

    if (!data.sheetUrl) {
        return null;
    }

    try {
        const response = await fetch(data.sheetUrl);
        const csvText = await response.text();
        const dpaList = parseCsv(csvText);

        await chrome.storage.local.set({
            dpaList: dpaList,
            lastUpdated: now
        });
        return dpaList;
    } catch (error) {
        console.error('Failed to fetch DPA list:', error);
        return null;
    }
}

/**
 * Parses CSV text into an array of objects.
 */
function parseCsv(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const row = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        row.push(currentValue.trim());

        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });

        if (!obj.id) {
            obj.id = `row-${i}`; 
        }

        result.push(obj);
    }
    return result;
}

/**
 * Determines the icon path based on DPA and T&L status.
 */
function getIconPath(tlStatus, dpaStatus) {
    const tl = (tlStatus || '').trim();
    let dpa = (dpaStatus || '').trim();
    if (dpa === 'Recieved') dpa = 'Received';

    if (tl === 'Approved' && (dpa === 'Received' || dpa === 'Not Required')) return 'images/icon-green-circle.png';
    if (tl === 'Not Required' && (dpa === 'Received' || dpa === 'Not Required')) return 'images/icon-green-circle.png';
    if (dpa === 'Denied') return 'images/icon-yellow-triangle.png';
    if (tl === 'Rejected') return 'images/icon-red-x.png';
    if (dpa === 'Requested') return 'images/icon-orange-square.png';
    
    return 'images/icon-neutral48.png';
}

// --- Event Listeners ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'updateDpaList') {
        await getAndUpdateDpaList();
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('updateDpaList', { periodInMinutes: 60 });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const domainInfo = getDomainInfo(tab.url);
        if (!domainInfo) return;

        const dpaList = await getAndUpdateDpaList();
        if (!dpaList) return;

        let siteInfo = null;
        
        if (domainInfo.isAppStore && domainInfo.appID) {
            siteInfo = dpaList.find(site => {
                const siteDomainInfo = getDomainInfo(site.resource_link);
                return siteDomainInfo && siteDomainInfo.appID === domainInfo.appID;
            });
        } else {
            // Updated matching logic: Checks explicit hostname column first
            siteInfo = dpaList.find(site => {
                // 1. Try explicit hostname column
                let targetHostname = site.hostname;

                // 2. Fallback to extracting from resource_link
                if (!targetHostname && site.resource_link) {
                    const extracted = getDomainInfo(site.resource_link);
                    if (extracted) targetHostname = extracted.hostname;
                }

                if (!targetHostname) return false;

                // Normalize
                targetHostname = targetHostname.toLowerCase().trim();

                // Match: Exact or Subdomain (e.g., canvas.instructure.com ends with instructure.com)
                return domainInfo.hostname === targetHostname || 
                       domainInfo.hostname.endsWith('.' + targetHostname);
            });
        }

        const iconPath = siteInfo 
            ? getIconPath(siteInfo.current_tl_status, siteInfo.current_dpa_status)
            : 'images/icon-neutral48.png';

        chrome.action.setIcon({ path: iconPath, tabId: tabId });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSiteInfoForUrl") {
        (async () => {
            try {
                const domainInfo = getDomainInfo(request.url);
                if (!domainInfo) {
                    sendResponse({ error: 'Invalid URL.' });
                    return;
                }

                const dpaList = await getAndUpdateDpaList();
                if (!dpaList) {
                    sendResponse({ error: 'DPA data not yet loaded. Please check Options.' });
                    return;
                }

                let siteInfo = null;

                if (domainInfo.isAppStore && domainInfo.appID) {
                    siteInfo = dpaList.find(site => {
                        const siteDomainInfo = getDomainInfo(site.resource_link);
                        return siteDomainInfo && siteDomainInfo.appID === domainInfo.appID;
                    });
                } else {
                    // Same updated matching logic for Popup
                    siteInfo = dpaList.find(site => {
                        let targetHostname = site.hostname;
                        if (!targetHostname && site.resource_link) {
                            const extracted = getDomainInfo(site.resource_link);
                            if (extracted) targetHostname = extracted.hostname;
                        }

                        if (!targetHostname) return false;
                        targetHostname = targetHostname.toLowerCase().trim();

                        return domainInfo.hostname === targetHostname || 
                               domainInfo.hostname.endsWith('.' + targetHostname);
                    });
                }

                sendResponse({ siteInfo, domainInfo });
            } catch (error) {
                console.error("Error in onMessage handler:", error);
                sendResponse({ error: 'An internal error occurred.' });
            }
        })();

        return true;
    }
});