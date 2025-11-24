document.addEventListener('DOMContentLoaded', () => {
    // Get references to the HTML elements we need to update
    const statusText = document.getElementById('status-text');
    const tlStatus = document.getElementById('tl-status');
    const dpaStatus = document.getElementById('dpa-status');
    const isAppText = document.getElementById('is-app-text');
    const viewAllLink = document.getElementById('view-all-link');
    const requestFormLink = document.getElementById('request-form-link'); // Get the new button

    // Get the current tab to determine its URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.url) {
            statusText.textContent = 'No active tab found.';
            viewAllLink.style.display = 'none'; // Hide the button
            requestFormLink.style.display = 'none'; // Hide the new button too
            return;
        }

        // Send a message to the background script to get all necessary info for this URL
        chrome.runtime.sendMessage({ action: "getSiteInfoForUrl", url: tab.url }, (response) => {
            if (chrome.runtime.lastError) {
                statusText.textContent = 'Error: Could not connect to the extension.';
                console.error(chrome.runtime.lastError.message);
                viewAllLink.style.display = 'none'; // Hide the button on error
                requestFormLink.style.display = 'none'; // Hide the new button too
                return;
            }
            
            if (response.error) {
                 statusText.textContent = response.error;
                 viewAllLink.style.display = 'none'; // Hide the button on error
                 requestFormLink.style.display = 'none'; // Hide the new button too
                 return;
            }

            const { siteInfo, domainInfo } = response;

            // --- Primary Display Logic ---

            // First, always display the app store source if it's an installed app.
            if (domainInfo && domainInfo.isInstalled) {
                const sourceText = domainInfo.appStoreName
                    ? `the ${domainInfo.appStoreName}.`
                    : 'an unknown source.';
                isAppText.textContent = `Installed from ${sourceText}`;
            } else {
                isAppText.textContent = '';
            }

            // Next, display the DPA status information
            if (siteInfo) {
                // If a match is found in the district list
                statusText.textContent = siteInfo.software_name;
                tlStatus.textContent = `T&L: ${siteInfo.current_tl_status || 'N/A'}`;
                dpaStatus.textContent = `DPA: ${siteInfo.current_dpa_status || 'N/A'}`;

                // Set the href for the "View All Entries" link
                if (siteInfo.id) {
                    viewAllLink.href = `viewer.html?id=${siteInfo.id}`;
                    viewAllLink.style.display = 'block'; // Ensure button is visible
                } else {
                    viewAllLink.style.display = 'none'; // Hide if no ID for current site
                }
                requestFormLink.style.display = 'none'; // Hide request button if site is found

            } else {
                // If no match is found
                statusText.textContent = 'This site is not in the district list.';
                tlStatus.textContent = 'Recommend for review submission.';
                dpaStatus.textContent = '';
                viewAllLink.style.display = 'none'; // Hide the view all button if no site info

                // Show request form button and set its URL
                chrome.storage.local.get('formUrl', (data) => {
                    if (data.formUrl) {
                        requestFormLink.href = data.formUrl;
                        requestFormLink.style.display = 'block';
                    } else {
                        requestFormLink.style.display = 'none'; // Hide if no form URL configured
                    }
                });
            }
        });
    });
});