/**
 * Test Data Fixtures for E2E Tests
 * 
 * This file contains test data and fixtures used across E2E tests
 * to ensure consistent and realistic test scenarios.
 */

export interface TestUserData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: string
  organizationId?: string
}

export interface TestOrganizationData {
  name: string
  slug: string
  description: string
  industry?: string
  size?: string
}

/**
 * Generate unique test email addresses
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}@test.c9d.ai`
}

/**
 * Generate unique organization names
 */
export function generateOrgName(prefix: string = 'Test Org'): string {
  const timestamp = Date.now()
  return `${prefix} ${timestamp}`
}

/**
 * Test user profiles for different scenarios
 */
export const TEST_USER_PROFILES = {
  ADMIN: {
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    password: 'AdminPassword123!'
  },
  MEMBER: {
    firstName: 'Member',
    lastName: 'User', 
    role: 'member',
    password: 'MemberPassword123!'
  },
  DEVELOPER: {
    firstName: 'Developer',
    lastName: 'User',
    role: 'developer',
    password: 'DevPassword123!'
  },
  DESIGNER: {
    firstName: 'Designer',
    lastName: 'User',
    role: 'designer',
    password: 'DesignPassword123!'
  }
} as const

/**
 * Test organization profiles
 */
export const TEST_ORGANIZATION_PROFILES = {
  TECH_STARTUP: {
    name: 'Tech Startup',
    description: 'A fast-growing technology startup',
    industry: 'technology',
    size: '1-10'
  },
  ENTERPRISE: {
    name: 'Enterprise Corp',
    description: 'Large enterprise organization',
    industry: 'enterprise',
    size: '1000+'
  },
  AGENCY: {
    name: 'Creative Agency',
    description: 'Digital marketing and design agency',
    industry: 'marketing',
    size: '11-50'
  }
} as const

/**
 * Create test user with unique email
 */
export function createTestUser(profile: keyof typeof TEST_USER_PROFILES = 'MEMBER'): TestUserData {
  const userProfile = TEST_USER_PROFILES[profile]
  return {
    email: generateTestEmail(profile.toLowerCase()),
    ...userProfile
  }
}

/**
 * Create test organization with unique name
 */
export function createTestOrganization(profile: keyof typeof TEST_ORGANIZATION_PROFILES = 'TECH_STARTUP'): TestOrganizationData {
  const orgProfile = TEST_ORGANIZATION_PROFILES[profile]
  return {
    ...orgProfile,
    name: generateOrgName(orgProfile.name),
    slug: generateOrgName(orgProfile.name).toLowerCase().replace(/\s+/g, '-')
  }
}

/**
 * Form validation test data
 */
export const VALIDATION_TEST_DATA = {
  INVALID_EMAILS: [
    'invalid-email',
    '@example.com',
    'user@',
    'user..name@example.com',
    'user@example',
    ''
  ],
  WEAK_PASSWORDS: [
    '123',
    'password',
    '12345678',
    'abc',
    ''
  ],
  STRONG_PASSWORDS: [
    'StrongPassword123!',
    'MySecureP@ssw0rd',
    'C0mpl3x!P@ssw0rd'
  ],
  INVALID_NAMES: [
    '',
    'a',
    'a'.repeat(100),
    '123',
    '!@#$%'
  ],
  VALID_NAMES: [
    'John',
    'Jane',
    'Alex',
    'Maria'
  ]
} as const

/**
 * Error message test data
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred',
  SERVER_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed',
  AUTH_ERROR: 'Authentication failed',
  PERMISSION_ERROR: 'Permission denied',
  NOT_FOUND: 'Resource not found',
  RATE_LIMIT: 'Too many requests'
} as const

/**
 * Test URLs and paths
 */
export const TEST_PATHS = {
  HOME: '/',
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  PROFILE: '/settings/profile',
  ORGANIZATION: '/settings/organization',
  ONBOARDING: '/onboarding',
  NOT_FOUND: '/non-existent-page'
} as const

/**
 * Test timeouts and delays
 */
export const TEST_TIMEOUTS = {
  SHORT: 1000,
  MEDIUM: 5000,
  LONG: 10000,
  VERY_LONG: 30000,
  NETWORK_TIMEOUT: 15000,
  AUTH_TIMEOUT: 20000
} as const

/**
 * Browser viewport sizes for responsive testing
 */
export const VIEWPORT_SIZES = {
  MOBILE: { width: 375, height: 667 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP: { width: 1200, height: 800 },
  LARGE_DESKTOP: { width: 1920, height: 1080 }
} as const

/**
 * Test data for performance testing
 */
export const PERFORMANCE_TEST_DATA = {
  LARGE_TEXT: 'Lorem ipsum '.repeat(1000),
  MANY_ITEMS: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`
  })),
  LARGE_OBJECT: Object.fromEntries(
    Array.from({ length: 1000 }, (_, i) => [`key${i}`, `value${i}`])
  )
} as const

/**
 * Mock API responses for testing
 */
export const MOCK_API_RESPONSES = {
  SUCCESS: {
    status: 200,
    data: { success: true, message: 'Operation successful' }
  },
  VALIDATION_ERROR: {
    status: 400,
    error: 'Validation failed',
    details: ['Email is required', 'Password is too weak']
  },
  UNAUTHORIZED: {
    status: 401,
    error: 'Unauthorized',
    message: 'Authentication required'
  },
  FORBIDDEN: {
    status: 403,
    error: 'Forbidden',
    message: 'Insufficient permissions'
  },
  NOT_FOUND: {
    status: 404,
    error: 'Not Found',
    message: 'Resource not found'
  },
  RATE_LIMITED: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded'
  },
  SERVER_ERROR: {
    status: 500,
    error: 'Internal Server Error',
    message: 'Something went wrong'
  }
} as const

/**
 * Accessibility test data
 */
export const ACCESSIBILITY_TEST_DATA = {
  ARIA_LABELS: [
    'Email input',
    'Password input',
    'Submit button',
    'Navigation menu',
    'User profile'
  ],
  KEYBOARD_NAVIGATION: [
    'Tab',
    'Shift+Tab',
    'Enter',
    'Space',
    'Escape'
  ],
  SCREEN_READER_TEXT: [
    'Sign in to your account',
    'Required field',
    'Error message',
    'Success notification'
  ]
} as const

/**
 * Generate test data for bulk operations
 */
export function generateBulkTestUsers(count: number, profile: keyof typeof TEST_USER_PROFILES = 'MEMBER'): TestUserData[] {
  return Array.from({ length: count }, () => createTestUser(profile))
}

/**
 * Generate test data for bulk organizations
 */
export function generateBulkTestOrganizations(count: number, profile: keyof typeof TEST_ORGANIZATION_PROFILES = 'TECH_STARTUP'): TestOrganizationData[] {
  return Array.from({ length: count }, () => createTestOrganization(profile))
}

/**
 * Clean up test data (for use in teardown)
 */
export function getTestDataCleanupPatterns(): string[] {
  return [
    'test-*@test.c9d.ai',
    'Test Org *',
    'test-org-*'
  ]
}