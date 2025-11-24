document.addEventListener('DOMContentLoaded', () => {
    // Get references to the HTML elements
    const statusText = document.getElementById('status-text');
    const tlStatus = document.getElementById('tl-status');
    const dpaStatus = document.getElementById('dpa-status');
    const isAppText = document.getElementById('is-app-text');
    const viewAllLink = document.getElementById('view-all-link');
    const requestFormLink = document.getElementById('request-form-link');
    const optionsLink = document.getElementById('options-link');

    // Helper to open options page
    optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Step 1: Check if the extension is configured (has a CSV URL)
    chrome.storage.local.get('sheetUrl', (data) => {
        if (!data.sheetUrl) {
            // Configuration is missing
            statusText.textContent = 'Setup Required';
            tlStatus.textContent = 'No district data found.';
            dpaStatus.textContent = 'Please configure a CSV source.';
            
            viewAllLink.style.display = 'none';
            requestFormLink.style.display = 'none';
            
            optionsLink.style.display = 'block';
            optionsLink.textContent = "Go to Options";
            return; // Stop execution here
        }

        // Step 2: Proceed with checking the current tab
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
                    // If the specific error is about missing data (e.g. fetch failed), show options
                    if (response.error.includes('DPA data not yet loaded')) {
                        optionsLink.style.display = 'block';
                        viewAllLink.style.display = 'none';
                    } else {
                        viewAllLink.style.display = 'block'; // Allow viewing the list on other errors
                    }
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
                    chrome.storage.local.get('formUrl', (formData) => {
                        if (formData.formUrl) {
                            requestFormLink.href = formData.formUrl;
                            requestFormLink.style.display = 'block';
                        }
                    });
                }
            });
        });
    });
});