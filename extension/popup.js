document.addEventListener('DOMContentLoaded', () => {
    // Get references to the HTML elements
    const statusText = document.getElementById('status-text');
    const tlStatus = document.getElementById('tl-status');
    const dpaStatus = document.getElementById('dpa-status');
    const isAppText = document.getElementById('is-app-text');
    const viewAllLink = document.getElementById('view-all-link');
    const requestFormLink = document.getElementById('request-form-link');

    // Get the current tab to determine its URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.url) {
            statusText.textContent = 'No active tab found.';
            viewAllLink.style.display = 'none';
            requestFormLink.style.display = 'none';
            return;
        }

        // Send a message to the background script
        chrome.runtime.sendMessage({ action: "getSiteInfoForUrl", url: tab.url }, (response) => {
            if (chrome.runtime.lastError) {
                statusText.textContent = 'Error connecting to extension.';
                console.error(chrome.runtime.lastError.message);
                viewAllLink.style.display = 'none';
                requestFormLink.style.display = 'none';
                return;
            }

            if (response && response.error) {
                statusText.textContent = response.error;
                viewAllLink.style.display = 'block'; // Allow viewing the list even on error
                return;
            }

            const { siteInfo, domainInfo } = response;

            if (domainInfo.isAppStore) {
                isAppText.textContent = `Store: ${domainInfo.appStoreName}`;
            }

            if (siteInfo) {
                // If a match is found
                statusText.textContent = siteInfo.software_name || 'Software Found';
                tlStatus.textContent = `T&L: ${siteInfo.current_tl_status || 'N/A'}`;
                dpaStatus.textContent = `DPA: ${siteInfo.current_dpa_status || 'N/A'}`;

                // Set the href for the "View Details" link using the ID (synthetic or real)
                if (siteInfo.id) {
                    viewAllLink.href = `viewer.html?id=${siteInfo.id}`;
                    viewAllLink.textContent = "View Details";
                } else {
                    viewAllLink.href = "viewer.html";
                }
                viewAllLink.style.display = 'block';
                requestFormLink.style.display = 'none';

            } else {
                // If no match is found
                statusText.textContent = 'Site not in district list.';
                tlStatus.textContent = 'Recommend for review.';
                dpaStatus.textContent = '';
                
                // Ensure View All button remains visible
                viewAllLink.href = "viewer.html";
                viewAllLink.textContent = "View All Entries";
                viewAllLink.style.display = 'block';

                // Show request form button if URL is configured
                chrome.storage.local.get('formUrl', (data) => {
                    if (data.formUrl) {
                        requestFormLink.href = data.formUrl;
                        requestFormLink.style.display = 'block';
                    }
                });
            }
        });
    });
});