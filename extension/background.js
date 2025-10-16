// --- Constants and Configuration ---
// This placeholder will be replaced by your build script
const API_URL = '__API_URI_PLACEHOLDER__';
// This placeholder will be replaced by your build script
const API_KEY = '__API_KEY_PLACEHOLDER__';
const CACHE_DURATION_MINUTES = 60 * 24; // Cache data for 24 hours

// --- NEW: Robust URL Parsing Function ---

/**
 * Parses a URL string and returns domain information, including app store detection.
 * Handles subdomains and invalid URLs gracefully.
 * @param {string | null | undefined} urlString The URL to parse.
 * @returns {object | null} An object containing domain information or null if the URL is invalid.
 * {
 * fullHostname: string, //with subdomain
 * hostname: string,      //root domain
 * isInstalled: string | null // app-id or null
 * }
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
        try{
            if (url.hostname === 'apps.apple.com'){
                isAppStore = true;
                let pathParts = url.pathname.split("/");
                appID = pathParts[pathParts.length - 1];
            } else if (url.hostname === 'chromewebstore.google.com'){
                isAppStore = true;
                let pathParts = url.pathname.split("/");
                appID = pathParts[pathParts.length - 1];
            } else if (url.hostname === 'play.google.com'){
                isAppStore = true;
                appID = url.searchParams.get("id");
            }
        } catch (error) {
            console.warn(`Could not parse the path to determine app-id: ${urlString}`);
            return null;
        }   

        let domainInfo = {
            fullHostname: url.hostname, //with subdomain
            hostname: hostnameParts.slice(-2).join('.'),
            isInstalled: appID !== null,
            appID: appID,
            isAppStore: isAppStore
        };
        return domainInfo;
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
        'User-Agent': 'SB29-Guard-Chrome-Extension/1.0.0'
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
 * Determines a single, overall status based on the logic in icon_status_logic.yaml.
 * @param {object} siteInfo - The data object for a specific site from the API.
 * @returns {string} The simplified status key (e.g., 'approved', 'denied', 'default').
 */
function determineOverallStatus(siteInfo) {
    // Normalize blank, null, or undefined statuses to a consistent '(blank)' string for easier matching.
    const tlStatus = siteInfo.current_tl_status || '(blank)';
    const dpaStatus = siteInfo.current_dpa_status || '(blank)';

    // The order of these checks is important and follows the logic in icon_status_logic.yaml.

    // 'denied': TL is 'Rejected'
    if (tlStatus === 'Rejected') {
        return 'denied';
    }

    // 'staff_only': DPA is 'Denied'
    if (dpaStatus === 'Denied') {
        return 'staff_only';
    }

    // 'approved': Combinations of 'Approved'/'Not Required' for TL and 'Received'/'Not Required' for DPA
    if ((tlStatus === 'Approved' || tlStatus === 'Not Required') &&
        (dpaStatus === 'Received' || dpaStatus === 'Not Required')) { // Note: Treats "Recieved" in YAML as "Received"
        return 'approved';
    }
    
    // 'pending': Covers several combinations including 'Pending', 'Requested', or blank statuses.
    if ((tlStatus === 'Approved' || tlStatus === 'Not Required') &&
        (dpaStatus === 'Requested' || dpaStatus === '(blank)')) {
        return 'pending';
    }
    if (tlStatus === 'Pending' || tlStatus === '(blank)') {
        return 'pending';
    }

    // 'default': A fallback for any combinations not explicitly covered above.
    return 'default';
}

/**
 * Updates the extension icon based on the site's status, aligned with icon_status_logic.yaml.
 * @param {string} status - The simplified status key.
 * @param {number} tabId - The ID of the tab to update.
 * @param {boolean} isInstalled - A flag to indicate if this is an installed app.
 */
function updateIcon(status, tabId, isInstalled) {
    let iconPaths = {};
    switch (status) {
        case 'approved':
            iconPaths = { "48": "images/icon-green-circle.png" };
            break;
        case 'denied':
            iconPaths = { "48": "images/icon-red-x.png" };
            break;
        case 'staff_only':
            iconPaths = { "48": "images/icon-yellow-triangle.png" };
            break;
        case 'pending':
            iconPaths = { "48": "images/icon-orange-square.png" };
            break;
        case 'unlisted':
            iconPaths = { "48": "images/icon-purple-diamond.png" };
            break;
        case 'default':
        default: // This handles both 'default' and any unexpected status.
            iconPaths = {
                "16": "images/icon-neutral16.png",
                "48": "images/icon-neutral48.png",
                "128": "images/icon-neutral128.png"
            };
            break;
    }
    chrome.action.setIcon({ path: iconPaths, tabId: tabId });

    if (isInstalled){
        chrome.action.setBadgeText({ text: '⇲', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#ebebeb', tabId: tabId });
    } else {
        chrome.action.setBadgeText({ text: '', tabId: tabId }); // Clear badge
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
        updateIcon('default', tabId, false);
        return;
    }

    const dpaList = await getAndUpdateDpaList();
    if (!dpaList) {
        console.log('No DPA list available to check against.');
        updateIcon('default', tabId, tabDomainInfo.isInstalled);
        return;
    }
    
    let siteInfo = null;

    //Prioritize app-ID matches for installed items
    if (tabDomainInfo.isInstalled){
        siteInfo = dpaList.find(site => {
        const siteDomainInfo = getDomainInfo(site.resource_link);
            return siteDomainInfo && siteDomainInfo.appID === tabDomainInfo.appID;
    });
    } else {
    // Find the site by matching the root domain of the 'resource_link' field.
        siteInfo = dpaList.find(site => {
            const siteDomainInfo = getDomainInfo(site.resource_link);
            return siteDomainInfo && siteDomainInfo.hostname === tabDomainInfo.hostname;
        });
    }

    if (siteInfo) {
        const overallStatus = determineOverallStatus(siteInfo);
        console.log(`Site found: ${tabDomainInfo.hostname}, Status: ${overallStatus}`);
        updateIcon(overallStatus, tabId, tabDomainInfo.isInstalled);
    } else {
        console.log(`Site not found in DPA list: ${tabDomainInfo.hostname}`);
        updateIcon('unlisted', tabId, tabDomainInfo.isInstalled);
    }
}


// --- Event Listeners ---
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.runtime.onStartup.addListener(getAndUpdateDpaList);
chrome.runtime.onInstalled.addListener(getAndUpdateDpaList);
chrome.alarms.create('refreshDpaList', { delayInMinutes: 1, periodInMinutes: CACHE_DURATION_MINUTES });

// Refactor the alarm listener to use a named function
function handleAlarm(alarm) {
    if (alarm.name === 'refreshDpaList') {
        console.log('Periodic alarm triggered. Refreshing DPA list.');
        getAndUpdateDpaList();
    }
}

chrome.alarms.onAlarm.addListener(handleAlarm);

// --- Message Listener for Popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSiteInfoForUrl") {
        // This is an async wrapper to allow using await inside the listener
        (async () => {
            const domainInfo = getDomainInfo(request.url);
            if (!domainInfo) {
                sendResponse({ error: 'Invalid URL.' });
                return;
            }

            const { dpaList } = await chrome.storage.local.get('dpaList');
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

            // Send the final data back to the popup
            sendResponse({ siteInfo, domainInfo });
        })();

        return true; // Required to indicate you will send a response asynchronously
    }
});

