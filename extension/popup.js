/**
 * Parses a URL string and returns domain information, including app store detection.
 * This is a copy of the function from the background script to ensure the popup
 * can perform the same logic without needing to message the service worker.
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
        try{
            if (url.hostname === 'apps.apple.com'){
                isAppStore = true;
                appStoreName = 'Apple App Store';
                let pathParts = url.pathname.split("/");
                appID = pathParts[pathParts.length - 1];
            } else if (url.hostname === 'chromewebstore.google.com'){
                isAppStore = true;
                appStoreName = 'Chrome Web Store';
                let pathParts = url.pathname.split("/");
                appID = pathParts[pathParts.length - 1];
            } else if (url.hostname === 'play.google.com'){
                isAppStore = true;
                appStoreName = 'Google Play Store';
                appID = url.searchParams.get("id");
            }
        } catch (error) {
            console.warn(`Could not parse the path to determine app-id: ${urlString}`);
            // Don't return null here, as the base domain info is still valid.
        }   

        return {
            fullHostname: url.hostname,
            hostname: hostnameParts.slice(-2).join('.'),
            isInstalled: appID !== null,
            appID: appID,
            isAppStore: isAppStore,
            appStoreName: appStoreName // Return the specific store name
        };
    } catch (error) {
        console.warn(`Could not parse invalid URL: ${urlString}`);
        return null;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    // Get references to the elements we need to update
    const statusText = document.getElementById('status-text');
    const tlStatus = document.getElementById('tl-status');
    const dpaStatus = document.getElementById('dpa-status');
    const isAppText = document.getElementById('is-app-text');

    // Get the current tab to determine the URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
        statusText.textContent = 'No active tab found.';
        return;
    }

    const tabDomainInfo = getDomainInfo(tab.url);
    if (!tabDomainInfo) {
        statusText.textContent = 'Invalid URL.';
        return;
    }

    const { dpaList } = await chrome.storage.local.get('dpaList');
    if (!dpaList) {
        statusText.textContent = 'DPA data not yet loaded.';
        return;
    }
    
    let siteInfo = null;
    // Find the matching site in our cached data
    if (tabDomainInfo.isInstalled) {
        // If it's an app, prioritize matching by App ID
        siteInfo = dpaList.find(site => {
            const siteDomainInfo = getDomainInfo(site.resource_link);
            return siteDomainInfo && siteDomainInfo.appID === tabDomainInfo.appID;
        });
    } else {
        // Otherwise, match by the root domain name
        siteInfo = dpaList.find(site => {
            const siteDomainInfo = getDomainInfo(site.resource_link);
            return siteDomainInfo && siteDomainInfo.hostname === tabDomainInfo.hostname;
        });
    }

    if (siteInfo) {
        // If a match is found, display its details
        statusText.textContent = siteInfo.software_name;
        tlStatus.textContent = `T&L: ${siteInfo.current_tl_status || 'N/A'}`;
        dpaStatus.textContent = `DPA: ${siteInfo.current_dpa_status || 'N/A'}`;
        
        // --- UPDATED LOGIC FOR INSTALLED APPS ---
        if (tabDomainInfo.isInstalled) {
            const sourceText = tabDomainInfo.appStoreName
                ? `the ${tabDomainInfo.appStoreName}.`
                : 'an unknown source.';
            isAppText.textContent = `Installed from ${sourceText}`;
        } else {
            isAppText.textContent = ''; // Clear text if not an installed app
        }
    } else {
        // If no match is found, show the "Unlisted" status
        statusText.textContent = 'This site is not in the district list.';
        tlStatus.textContent = 'Recommend for review submission.';
        dpaStatus.textContent = '';
        isAppText.textContent = ''; // Ensure this is also cleared for unlisted sites
    }
});

