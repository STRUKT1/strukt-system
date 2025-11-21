module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  testMatch: [
    '**/__tests__/security/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
