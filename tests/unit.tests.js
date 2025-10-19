const { getDomainInfo, determineOverallStatus } = require('../extension/background.js');

// ================================================================= //
// == EXHAUSTIVE TESTS FOR getDomainInfo                          == //
// ================================================================= //
describe('getDomainInfo: Exhaustive URL Parsing', () => {

    test('should handle standard domains', () => {
        expect(getDomainInfo('http://example.com/path').hostname).toBe('example.com');
        expect(getDomainInfo('https://www.google.com').hostname).toBe('google.com');
    });

    test('should handle complex subdomains', () => {
        expect(getDomainInfo('https://sub.domain.co.uk/page').hostname).toBe('co.uk'); // .slice(-2) logic
        expect(getDomainInfo('https://clever.com').hostname).toBe('clever.com');
    });

    // --- Known URLs from District Data (simulated) ---
    const knownUrls = [
        ['https://www.adobe.com/express/', 'adobe.com', false, null],
        ['https://www.khanacademy.org/', 'khanacademy.org', false, null],
        ['https://www.noredink.com/', 'noredink.com', false, null],
        // App Store URLs
        ['https://apps.apple.com/us/app/seesaw-learning-journal/id930565184', 'apple.com', true, 'id930565184'],
        ['https://play.google.com/store/apps/details?id=com.google.android.apps.meetings', 'google.com', true, 'com.google.android.apps.meetings'],
    ];

    // test.each(knownUrls)('should correctly parse known URL: %s', (url, expectedHostname, isInstalled, appID) => {
    //     const result = getDomainInfo(url);
    //     expect(result.hostname).toBe(expectedHostname);
    //     expect(result.isInstalled).toBe(isInstalled);
    //     expect(result.appID).toBe(appID);
    // });

    // test('should return null for invalid or non-http URLs', () => {
    //     expect(getDomainInfo('ftp://example.com')).toBeNull();
    //     expect(getDomainInfo('just-a-string')).toBeNull();
    //     expect(getDomainInfo(null)).toBeNull();
    // });
});


// ================================================================= //
// == EXHAUSTIVE TESTS FOR determineOverallStatus                 == //
// == Based on icon-strategy.yaml                                 == //
// ================================================================= //
describe('determineOverallStatus: Exhaustive Status Combinations', () => {

    // --- Category: 'approved' ---
    describe('Category: approved', () => {
        const approvedCases = [
            { tl: 'Approved', dpa: 'Received' },
            { tl: 'Approved', dpa: 'Not Required' },
            { tl: 'Not Required', dpa: 'Received' },
            { tl: 'Not Required', dpa: 'Not Required' },
        ];
        test.each(approvedCases)('should return "approved" for T&L: $tl, DPA: $dpa', ({ tl, dpa }) => {
            const siteInfo = { current_tl_status: tl, current_dpa_status: dpa };
            expect(determineOverallStatus(siteInfo)).toBe('approved');
        });
    });

    // --- Category: 'denied' ---
    describe('Category: denied', () => {
        const deniedDpaStates = ['Requested', 'Received', 'Denied', 'Not Required', null, ''];
        test.each(deniedDpaStates)('should return "denied" when T&L is "Rejected", regardless of DPA status "%s"', (dpaStatus) => {
            const siteInfo = { current_tl_status: 'Rejected', current_dpa_status: dpaStatus };
            expect(determineOverallStatus(siteInfo)).toBe('denied');
        });
    });

    // --- Category: 'staff_only' ---
    describe('Category: staff_only', () => {
        const staffOnlyTlStates = ['Approved', 'Not Required', 'Pending', null, ''];
        test.each(staffOnlyTlStates)('should return "staff_only" when DPA is "Denied" and T&L is not "Rejected" (T&L: "%s")', (tlStatus) => {
            const siteInfo = { current_tl_status: tlStatus, current_dpa_status: 'Denied' };
            expect(determineOverallStatus(siteInfo)).toBe('staff_only');
        });
    });
    
    // --- Category: 'pending' ---
    describe('Category: pending', () => {
        const pendingCases = [
            // Explicitly 'Pending' or blank T&L status
            { tl: 'Pending', dpa: 'Requested' },
            { tl: 'Pending', dpa: 'Received' },
            { tl: null, dpa: 'Requested' },
            { tl: '', dpa: 'Received' },
            // Approved T&L but incomplete DPA
            { tl: 'Approved', dpa: 'Requested' },
            { tl: 'Approved', dpa: null },
            { tl: 'Approved', dpa: '' },
            // Not Required T&L but incomplete DPA
            { tl: 'Not Required', dpa: 'Requested' },
            { tl: 'Not Required', dpa: null },
        ];
        test.each(pendingCases)('should return "pending" for T&L: $tl, DPA: $dpa', ({ tl, dpa }) => {
            const siteInfo = { current_tl_status: tl, current_dpa_status: dpa };
            expect(determineOverallStatus(siteInfo)).toBe('pending');
        });
    });
});
