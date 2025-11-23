module.exports = {
  // The root directory that Jest should scan for tests and modules within
  rootDir: '.',

  // A list of paths to directories that Jest should use to search for files in
  roots: [
    "<rootDir>/tests"
  ],

  // The test environment that will be used for testing
  // 'jsdom' is needed for tests that interact with the popup's HTML (DOM)
  testEnvironment: 'jsdom',

  // A list of file extensions your modules use
  moduleFileExtensions: ['js', 'json'],

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '<rootDir>/tests/**/*.tests.js',
  ],

  // A path to a module which exports an async function that is triggered once before all test suites
  // We use this to load the jest-chrome mock environment
  setupFilesAfterEnv: ['jest-chrome'],

  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};

