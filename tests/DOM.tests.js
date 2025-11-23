const fs = require('fs');
const path = require('path');
const { chrome } = require('jest-chrome');

// Helper function to load and run the popup script in the JSDOM environment
function loadAndRunPopup() {
    require('../extension/popup.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
}

describe('popup.js DOM tests', () => {

    beforeEach(() => {
        // Manually assign the mocked `chrome` object to the global scope
        global.chrome = chrome;

        // Load the popup's HTML into the testing environment
        const html = fs.readFileSync(path.resolve(__dirname, '../extension/popup.html'), 'utf8');
        document.body.innerHTML = html;

        // Reset mocks to ensure test isolation
        chrome.runtime.sendMessage.mockReset();
        chrome.tabs.query.mockReset();
    });

    // Test Case 1: Standard approved site
    test('should display site info for an approved site', () => {
        const mockResponse = {
            siteInfo: { software_name: 'Khan Academy', current_tl_status: 'Approved', current_dpa_status: 'Received' },
            domainInfo: { isInstalled: false }
        };
        chrome.tabs.query.mockImplementation((query, callback) => callback([{ url: 'https://www.khanacademy.org' }]));
        chrome.runtime.sendMessage.mockImplementation((message, callback) => callback(mockResponse));

        loadAndRunPopup();

        expect(document.getElementById('status-text').textContent).toBe('Khan Academy');
        expect(document.getElementById('tl-status').textContent).toBe('T&L: Approved');
        expect(document.getElementById('dpa-status').textContent).toBe('DPA: Received');
    });

    // Test Case 2: Standard unlisted site
    test('should display "unlisted" message when no siteInfo is found', () => {
        const mockResponse = { siteInfo: null, domainInfo: { isInstalled: false } };
        chrome.tabs.query.mockImplementation((query, callback) => callback([{ url: 'https://www.unknown-site.com' }]));
        chrome.runtime.sendMessage.mockImplementation((message, callback) => callback(mockResponse));
        
        loadAndRunPopup();

        expect(document.getElementById('status-text').textContent).toBe('This site is not in the district list.');
        expect(document.getElementById('tl-status').textContent).toBe('Recommend for review submission.');
    });

    // Test Case 3: App store URL that is also in the DPA list
    test('should display both app store and DPA info', () => {
        const mockResponse = {
            siteInfo: { software_name: 'Google Docs', current_tl_status: 'Approved', current_dpa_status: 'Received' },
            domainInfo: { isInstalled: true, appStoreName: 'Google Play Store' }
        };
        chrome.tabs.query.mockImplementation((query, callback) => callback([{ url: 'https://play.google.com/store/apps/details?id=com.google.android.apps.docs' }]));
        chrome.runtime.sendMessage.mockImplementation((message, callback) => callback(mockResponse));
        
        loadAndRunPopup();

        expect(document.getElementById('is-app-text').textContent).toBe('Installed from the Google Play Store.');
        expect(document.getElementById('status-text').textContent).toBe('Google Docs');
        expect(document.getElementById('tl-status').textContent).toBe('T&L: Approved');
    });

    // Test Case 4: A site with "denied" status
    test('should display details for a denied site', () => {
        const mockResponse = {
            siteInfo: { software_name: 'Questionable Site', current_tl_status: 'Rejected', current_dpa_status: 'Denied' },
            domainInfo: { isInstalled: false }
        };
        chrome.tabs.query.mockImplementation((query, callback) => callback([{ url: 'https://www.questionable.com' }]));
        chrome.runtime.sendMessage.mockImplementation((message, callback) => callback(mockResponse));

        loadAndRunPopup();

        expect(document.getElementById('status-text').textContent).toBe('Questionable Site');
        expect(document.getElementById('tl-status').textContent).toBe('T&L: Rejected');
        expect(document.getElementById('dpa-status').textContent).toBe('DPA: Denied');
    });

    // Test Case 5: A site with missing DPA/TL status fields (should show N/A)
    test('should display N/A for missing status fields', () => {
        const mockResponse = {
            siteInfo: { software_name: 'New Tool', current_tl_status: null, current_dpa_status: 'Requested' },
            domainInfo: { isInstalled: false }
        };
        chrome.tabs.query.mockImplementation((query, callback) => callback([{ url: 'https://www.newtool.com' }]));
        chrome.runtime.sendMessage.mockImplementation((message, callback) => callback(mockResponse));

        loadAndRunPopup();

        expect(document.getElementById('tl-status').textContent).toBe('T&L: N/A');
        expect(document.getElementById('dpa-status').textContent).toBe('DPA: Requested');
    });

    // Test Case 6: Edge Case - No active tab is found
    test('should display "No active tab" message if tab is missing', () => {
        // Mock the tabs query to return an empty array
        chrome.tabs.query.mockImplementation((query, callback) => callback([]));
        
        loadAndRunPopup();

        expect(document.getElementById('status-text').textContent).toBe('No active tab found.');
        // Ensure other fields are empty
        expect(document.getElementById('tl-status').textContent).toBe('');
    });

    // Test Case 7: Edge Case - Background script returns an error
    test('should display error message from background script', () => {
        const mockResponse = { error: 'DPA data could not be loaded.' };
        chrome.tabs.query.mockImplementation((query, callback) => callback([{ url: 'https://www.some-site.com' }]));
        chrome.runtime.sendMessage.mockImplementation((message, callback) => callback(mockResponse));

        loadAndRunPopup();

        expect(document.getElementById('status-text').textContent).toBe('DPA data could not be loaded.');
    });
});

