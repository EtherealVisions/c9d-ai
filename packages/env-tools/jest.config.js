/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/cli.ts',
    '!src/validate-cli.ts',
    '!src/vercel-prebuild.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: process.env.CI ? 30000 : 10000, // 30s in CI, 10s locally
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
  // CI-specific configurations
  ...(process.env.CI && {
    maxWorkers: 2, // Limit workers in CI
    bail: false, // Don't bail on first failure in CI
    verbose: true, // Verbose output in CI
    forceExit: true, // Force exit after tests complete
    detectOpenHandles: true, // Detect open handles that prevent Jest from exiting
  })
};









