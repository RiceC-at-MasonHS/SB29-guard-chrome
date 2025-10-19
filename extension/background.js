// --- Constants and Configuration ---
// This placeholder will be replaced by your build script
const API_URL = '__API_URI_PLACEHOLDER__';
// This placeholder will be replaced by your build script
const API_KEY = '__API_KEY_PLACEHOLDER__';
const USER_AGENT = '__USER_AGENT_PLACEHOLDER__';
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
        const hostnameParts = url.hostname.split('.');

        let appID = null;
        let isAppStore = false;
        let appStoreName = null; // Variable to hold the specific store name
        
        try {
            switch (url.hostname) {
                case 'apps.apple.com':
                    isAppStore = true;
                    appStoreName = 'Apple App Store';
                    const applePathParts = url.pathname.split("/"); // does not include query params (ex: for language-codes)
                    appID = applePathParts[applePathParts.length - 1];
                    break;
                case 'chromewebstore.google.com':
                    isAppStore = true;
                    appStoreName = 'Chrome Web Store';
                    const chromePathParts = url.pathname.split("/"); // does not include query params (ex: for language-codes)
                    appID = chromePathParts[chromePathParts.length - 1];
                    break;
                case 'play.google.com':
                    isAppStore = true;
                    appStoreName = 'Google Play Store';
                    appID = url.searchParams.get("id");
                    break;
            }
        } catch (error) {
            console.warn(`Could not parse the path to determine app-id: ${urlString}`);
            // Do not return null here, continue with domain info
        }

        return {
            fullHostname: url.hostname,
            hostname: hostnameParts.length <= 1 ? url.hostname : hostnameParts.slice(-2).join('.'),
            isInstalled: isAppStore,
            appID: appID,
            isAppStore: isAppStore,
            appStoreName: appStoreName
        };
    } catch (error) {
        console.warn(`Could not parse invalid URL: ${urlString}`);
        return null;
    }
}


// --- Core API Fetching Logic ---

/**
 * Fetches the complete DPA list from the Supabase API.
 * @returns {Promise<Array|null>} A promise that resolves to the array of DPA data or null on error.
 */
async function fetchDpaData() {
    const headers = new Headers({
        'apikey': API_KEY,
        'User-Agent': USER_AGENT
    });

    try {
        const response = await fetch(API_URL, { method: 'GET', headers: headers });
        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        console.log('Successfully fetched and parsed DPA data.');
        return data;
    } catch (error) {
        console.error('Network or fetch error:', error);
        return null;
    }
}

/**
 * Gets DPA data, prioritizing cache, and fetches new data if cache is stale or missing.
 */
async function getAndUpdateDpaList() {
    const now = new Date().getTime();
    const result = await chrome.storage.local.get(['dpaList', 'lastFetch']);

    if (result.dpaList && result.lastFetch && (now - result.lastFetch < CACHE_DURATION_MINUTES * 60 * 1000)) {
        console.log('Using cached DPA list.');
        return result.dpaList;
    }

    console.log('Cache stale or missing. Fetching new DPA list.');
    const dpaList = await fetchDpaData();
    if (dpaList) {
        await chrome.storage.local.set({ dpaList: dpaList, lastFetch: now });
        return dpaList;
    }
    return result.dpaList || null;
}


// --- Extension Logic ---

/**
 * Determines a single, overall status from the detailed site information.
 * @param {object} siteInfo - The data object for a specific site from the API.
 * @returns {string} The simplified status key (e.g., 'approved', 'denied', 'staff_only').
 */
function determineOverallStatus(siteInfo) {
    if (!siteInfo) return 'unlisted';

    const tlStatus = siteInfo.current_tl_status;
    const dpaStatus = siteInfo.current_dpa_status;

    if (tlStatus === 'Rejected') return 'denied';
    if (dpaStatus === 'Denied') return 'staff_only';

    const isApproved = (tlStatus === 'Approved' || tlStatus === 'Not Required');
    const dpaComplete = (dpaStatus === 'Received' || dpaStatus === 'Not Required');

    if (isApproved && dpaComplete) return 'approved';

    return 'pending';
}

/**
 * Updates the extension icon based on the site's status.
 * @param {string} status - The simplified status key.
 * @param {number} tabId - The ID of the tab to update.
 * @param {boolean} isInstalled - A flag to indicate if this is an installed app
 */
function updateIcon(status, tabId, isInstalled) {
    let iconDetails = {};
    switch (status) {
        case 'approved':   iconDetails = { path: "images/icon-green-circle.png"}; break;
        case 'denied':     iconDetails = { path: "images/icon-red-x.png"}; break;
        case 'staff_only': iconDetails = { path: "images/icon-yellow-triangle.png"}; break;
        case 'pending':    iconDetails = { path: "images/icon-orange-square.png"}; break;
        case 'unlisted':   iconDetails = { path: "images/icon-purple-diamond.png"}; break;
        default:           iconDetails = { path: "images/icon-neutral48.png"}; break;
    }
    chrome.action.setIcon({ path: { "48": iconDetails.path }, tabId: tabId });

    if (isInstalled){
        chrome.action.setBadgeText({ text: '⇲', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#ebebeb', tabId: tabId });
    } else {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
}

/**
 * Main handler for tab updates.
 */
async function handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete' || !tab.url || !tab.url.startsWith('http')) {
        return;
    }

    const tabDomainInfo = getDomainInfo(tab.url);
    if (!tabDomainInfo) { // If the current tab's URL is invalid for some reason
        updateIcon('neutral', tabId, false);
        return;
    }

    const dpaList = await getAndUpdateDpaList();
    if (!dpaList) {
        console.warn('No DPA list available to check against.');
        updateIcon('neutral', tabId, tabDomainInfo.isInstalled);
        return;
    }
    
    let siteInfo = null;
    // Find the site by matching the root domain or app ID.
    if (tabDomainInfo.isInstalled){
        siteInfo = dpaList.find(site => {
            const siteDomainInfo = getDomainInfo(site.resource_link);
            return siteDomainInfo && siteDomainInfo.appID === tabDomainInfo.appID;
        });
    } else {
        siteInfo = dpaList.find(site => {
            const siteDomainInfo = getDomainInfo(site.resource_link);
            return siteDomainInfo && siteDomainInfo.hostname === tabDomainInfo.hostname;
        });
    }

    const overallStatus = determineOverallStatus(siteInfo);
    console.log(`Site found: ${tabDomainInfo.hostname}, Status: ${overallStatus}`);
    updateIcon(overallStatus, tabId, tabDomainInfo.isInstalled);
}

/**
 * Handles the periodic alarm to refresh the DPA list.
 * @param {object} alarm - The alarm object from the Chrome API.
 */
function handleAlarm(alarm) {
    if (alarm.name === 'refreshDpaList') {
        console.log('Periodic alarm triggered. Refreshing DPA list.');
        getAndUpdateDpaList();
    }
}


// ======================================================================== //
// CRITICAL JEST FIX: WRAP ALL CHROME API LISTENERS IN A CONDITIONAL BLOCK  //
// ======================================================================== //
// This ensures the code below only runs in the extension environment,
// and is completely ignored when Jest tries to import this file for testing.
if (typeof chrome !== 'undefined' && chrome.runtime) {
    
    // --- Event Listeners ---
    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.runtime.onStartup.addListener(getAndUpdateDpaList);
    chrome.runtime.onInstalled.addListener(getAndUpdateDpaList);
    chrome.alarms.create('refreshDpaList', { delayInMinutes: 1, periodInMinutes: CACHE_DURATION_MINUTES });    
    chrome.alarms.onAlarm.addListener(handleAlarm);

    // --- Message Listener for Popup ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getSiteInfoForUrl") {
            (async () => {
                const domainInfo = getDomainInfo(request.url);
                if (!domainInfo) {
                    sendResponse({ error: 'Invalid URL.' });
                    return;
                }

                const dpaList = await getAndUpdateDpaList();
                if (!dpaList) {
                    sendResponse({ error: 'DPA data not yet loaded.' });
                    return;
                }

                let siteInfo = null;
                if (domainInfo.isInstalled){
                    siteInfo = dpaList.find(site => {
                        const siteDomainInfo = getDomainInfo(site.resource_link);
                        return siteDomainInfo && siteDomainInfo.appID === domainInfo.appID;
                    });
                } else {
                    siteInfo = dpaList.find(site => {
                        const siteDomainInfo = getDomainInfo(site.resource_link);
                        return siteDomainInfo && siteDomainInfo.hostname === domainInfo.hostname;
                    });
                }
                sendResponse({ siteInfo, domainInfo });
            })();
            return true;
        }
    });
}

// --- Testability Exports ---
// This allows Jest to import your functions for testing, but does NOT run
// in the browser extension environment.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDomainInfo,
        determineOverallStatus,
        handleTabUpdate,
        fetchDpaData,
        getAndUpdateDpaList,
        updateIcon
    };
}
