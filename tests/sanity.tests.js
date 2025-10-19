// This is our "Hello World" test. It confirms that Jest itself is running correctly.
test('should be true', () => {
    expect(true).toBe(true);
});

// This is the most important test. It attempts to load your background script.
// If this test passes, it means our fix for the "ReferenceError: chrome is not defined"
// issue is working correctly, because the conditional wrappers are preventing
// the chrome.* API calls from running in the Node.js test environment.
describe('Background Script Sanity Check', () => {
    test('should load without crashing', () => {
        let backgroundScript;
        let error = null;
        try {
            // We require the script inside a try/catch block to gracefully handle errors.
            backgroundScript = require('../extension/background.js');
        } catch (e) {
            error = e;
        }

        // The test passes if no error was thrown during the import.
        expect(error).toBeNull();
        // We also check that the script exported an object, as expected.
        expect(typeof backgroundScript).toBe('object');
    });
});
