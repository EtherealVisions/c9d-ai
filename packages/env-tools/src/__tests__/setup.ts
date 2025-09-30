/**
 * Jest test setup
 */

// Store original environment
const originalEnv = process.env;

beforeEach(() => {
  // Reset environment for each test
  jest.resetModules();
  process.env = { ...originalEnv };
  
  // Clear all mocks
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore original environment
  process.env = originalEnv;
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};









