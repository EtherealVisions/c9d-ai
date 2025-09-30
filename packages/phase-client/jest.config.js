module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Just exports
    '!src/types.ts', // Just types
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  reporters: process.env.CI 
    ? [
        'default',
        ['jest-junit', {
          outputDirectory: 'test-results',
          outputName: 'junit.xml',
          classNameTemplate: '{classname}',
          titleTemplate: '{title}',
          ancestorSeparator: ' › ',
          usePathForSuiteName: true,
        }]
      ]
    : ['default'],
  testTimeout: process.env.CI ? 30000 : 10000, // 30s in CI, 10s locally
  // CI-specific configurations
  ...(process.env.CI && {
    maxWorkers: 2, // Limit workers in CI
    bail: false, // Don't bail on first failure in CI
    verbose: true, // Verbose output in CI
    forceExit: true, // Force exit after tests complete
    detectOpenHandles: true, // Detect open handles that prevent Jest from exiting
  }),
};