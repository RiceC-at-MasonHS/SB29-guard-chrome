document.addEventListener('DOMContentLoaded', () => {
    // Get references to the elements we need to update
    const statusText = document.getElementById('status-text');
    const tlStatus = document.getElementById('tl-status');
    const dpaStatus = document.getElementById('dpa-status');
    const isAppText = document.getElementById('is-app-text');

    // Get the current tab to determine the URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.url) {
            statusText.textContent = 'No active tab found.';
            return;
        }

        // Send a message to the background script with the current URL
        chrome.runtime.sendMessage({ action: "getSiteInfoForUrl", url: tab.url }, (response) => {
            if (chrome.runtime.lastError) {
                // Handle potential errors (e.g., if the background script is inactive)
                statusText.textContent = 'Error: Could not contact background script.';
                console.error(chrome.runtime.lastError.message);
                return;
            }
            
            if (response.error) {
                 statusText.textContent = response.error;
                 return;
            }

            const { siteInfo, domainInfo } = response;

            if (siteInfo) {
                // If a match is found, display its details
                statusText.textContent = siteInfo.software_name;
                tlStatus.textContent = `T&L: ${siteInfo.current_tl_status || 'N/A'}`;
                dpaStatus.textContent = `DPA: ${siteInfo.current_dpa_status || 'N/A'}`;
                
                if (domainInfo.isInstalled) {
                    const sourceText = domainInfo.appStoreName
                        ? `the ${domainInfo.appStoreName}.`
                        : 'an unknown source.';
                    isAppText.textContent = `Installed from ${sourceText}`;
                } else {
                    isAppText.textContent = '';
                }
            } else {
                // If no match is found, show the "Unlisted" status
                statusText.textContent = 'This site is not in the district list.';
                tlStatus.textContent = 'Recommend for review submission.';
                dpaStatus.textContent = '';
                isAppText.textContent = '';
            }
        });
    });
});
