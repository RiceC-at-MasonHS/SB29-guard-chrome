/**
 * Parses a URL string and returns its root domain.
 * This function is a duplicate of the one in background.js to ensure consistent logic.
 * @param {string | null | undefined} urlString The URL to parse.
 * @returns {string|null} The root domain or null if the URL is invalid.
 */
function getRootDomain(urlString) {
    if (!urlString || typeof urlString !== 'string') {
        return null;
    }
    try {
        const url = new URL(urlString);
        const hostnameParts = url.hostname.split('.');
        if (hostnameParts.length <= 1) return url.hostname;
        return hostnameParts.slice(-2).join('.');
    } catch (error) {
        return null;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    // Get references to the elements we need to update
    const statusText = document.getElementById('status-text');
    const tlStatus = document.getElementById('tl-status');
    const dpaStatus = document.getElementById('dpa-status');

    // Get the current tab to determine the URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
        statusText.textContent = 'No active tab found.';
        return;
    }

    const tabRootDomain = getRootDomain(tab.url);
    const { dpaList } = await chrome.storage.local.get('dpaList');

    if (!dpaList) {
        statusText.textContent = 'DPA data not yet loaded.';
        return;
    }
    
    // Find the matching site in our cached data using the same root domain logic
    const siteInfo = dpaList.find(site => {
        const siteRootDomain = getRootDomain(site.resource_link);
        return siteRootDomain && siteRootDomain === tabRootDomain;
    });

    if (siteInfo) {
        // If a match is found, display its details
        statusText.textContent = siteInfo.software_name;
        tlStatus.textContent = `T&L: ${siteInfo.current_tl_status || 'N/A'}`;
        dpaStatus.textContent = `DPA: ${siteInfo.current_dpa_status || 'N/A'}`;
    } else {
        // If no match is found, show the "Unlisted" status
        statusText.textContent = 'This site is not in the district list.';
        tlStatus.textContent = 'Recommend for review submission.';
        dpaStatus.textContent = '';
    }
});

