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
        const url = new URL(urlString);
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
                         // Usually the ID is the last part, or second to last if there are params
                         // Taking the last segment that looks like an ID
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
                    // Typical path: /marketplace/app/app_name/app_id
                    const potentialAppID = marketplacePathParts[marketplacePathParts.length - 1];
                    // FIX: Allow alphanumeric IDs (hashes), not just digits
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

        // FIX: Naive slice(-2) removed. Return full hostname.
        // The matching logic will handle "endsWith" or exact matches.
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
 * Assumes the first row contains headers.
 */
function parseCsv(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Handle quoted fields properly (basic implementation)
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

        // FIX: Generate a synthetic ID if one is missing. 
        // This ensures the viewer always has a reference ID.
        if (!obj.id) {
            obj.id = `row-${i}`; 
        }

        result.push(obj);
    }
    return result;
}

/**
 * Determines the icon path based on DPA and T&L status.
 * Matches logic from icon-strategy.yaml
 */
function getIconPath(tlStatus, dpaStatus) {
    const tl = (tlStatus || '').trim();
    // Normalize "Received" to handle common misspelling "Recieved"
    let dpa = (dpaStatus || '').trim();
    if (dpa === 'Recieved') dpa = 'Received';

    if (tl === 'Approved' && (dpa === 'Received' || dpa === 'Not Required')) return 'images/icon-green-circle.png';
    if (tl === 'Not Required' && (dpa === 'Received' || dpa === 'Not Required')) return 'images/icon-green-circle.png';
    
    if (dpa === 'Denied') return 'images/icon-yellow-triangle.png'; // Staff only / Caution
    if (tl === 'Rejected') return 'images/icon-red-x.png';

    // Pending/Default cases
    if (dpa === 'Requested') return 'images/icon-orange-square.png';
    
    // Default neutral
    return 'images/icon-neutral48.png';
}

// --- Event Listeners ---

// On Alarm (Periodic Update)
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'updateDpaList') {
        await getAndUpdateDpaList();
    }
});

// Setup Alarm on Install
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('updateDpaList', { periodInMinutes: 60 });
});

// Tab Update Listener (Icon Update)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const domainInfo = getDomainInfo(tab.url);
        if (!domainInfo) return;

        const dpaList = await getAndUpdateDpaList();
        if (!dpaList) return;

        let siteInfo = null;
        
        // Find match
        if (domainInfo.isAppStore && domainInfo.appID) {
            siteInfo = dpaList.find(site => {
                const siteDomainInfo = getDomainInfo(site.resource_link);
                return siteDomainInfo && siteDomainInfo.appID === domainInfo.appID;
            });
        } else {
            // FIX: Robust hostname matching. 
            // Checks if the visited hostname ends with the saved hostname (handles subdomains)
            // or if they are exact matches.
            siteInfo = dpaList.find(site => {
                const siteDomainInfo = getDomainInfo(site.resource_link);
                if (!siteDomainInfo) return false;
                
                // Example: visited 'canvas.instructure.com', stored 'instructure.com' -> Match
                // Example: visited 'google.com', stored 'google.com' -> Match
                return domainInfo.hostname === siteDomainInfo.hostname || 
                       domainInfo.hostname.endsWith('.' + siteDomainInfo.hostname);
            });
        }

        const iconPath = siteInfo 
            ? getIconPath(siteInfo.current_tl_status, siteInfo.current_dpa_status)
            : 'images/icon-neutral48.png'; // Default if not found

        chrome.action.setIcon({ path: iconPath, tabId: tabId });
    }
});

// Message Listener for Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSiteInfoForUrl") {
        // FIX: Wrap async IIFE in try/catch to handle errors gracefully
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
                    siteInfo = dpaList.find(site => {
                        const siteDomainInfo = getDomainInfo(site.resource_link);
                        if (!siteDomainInfo) return false;
                        return domainInfo.hostname === siteDomainInfo.hostname || 
                               domainInfo.hostname.endsWith('.' + siteDomainInfo.hostname);
                    });
                }

                // Send the final data back to the popup
                sendResponse({ siteInfo, domainInfo });
            } catch (error) {
                console.error("Error in onMessage handler:", error);
                sendResponse({ error: 'An internal error occurred.' });
            }
        })();

        return true; // Required to indicate response will be sent asynchronously
    }
});