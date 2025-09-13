# Testing Standards & Quality Assurance

## Overview
This document defines comprehensive testing standards and quality assurance practices that must be followed for every task and feature completion in the C9D AI platform. These standards ensure 100% test success rates, excellent coverage, and robust functionality validation.

## Testing Philosophy

### Core Principles
- **Test Functionality, Not Implementation**: Focus on behavior and outcomes, not internal code structure
- **Idempotent Testing**: Tests must be repeatable without side effects or dependencies
- **Isolation**: Each test must run independently without affecting others
- **Comprehensive Coverage**: Unit, integration, and E2E tests must cover all critical paths
- **Performance Awareness**: Tests should execute efficiently and support parallel execution

### Quality Gates
Before any task or feature is considered complete, it MUST pass all quality gates:

1. **Zero TypeScript Errors**: `pnpm typecheck` must pass with no errors
2. **Successful Build**: `pnpm build` must complete successfully  
3. **100% Test Success Rate**: All tests must pass without skips or failures
4. **Coverage Requirements**: Minimum 90% code coverage for new code
5. **No Regression**: Existing functionality must remain unaffected
6. **Performance Standards**: Tests must complete within defined time limits
7. **Clean State**: No test artifacts or data pollution after execution

### Critical Build Requirements

**MANDATORY**: Every task completion MUST include:

- ✅ **TypeScript Compilation**: `pnpm typecheck` passes with zero errors
- ✅ **Build Success**: `pnpm build` completes without failures
- ✅ **Import Resolution**: All module imports resolve correctly
- ✅ **Type Safety**: All type annotations are correct and complete
- ✅ **No Any Types**: Avoid `any` types, use proper typing
- ✅ **Interface Compliance**: All implementations match their interfaces

## Test Organization & Structure

### Directory Structure
```
apps/web/__tests__/
├── unit/                    # Unit tests for individual functions/components
│   ├── components/         # Component unit tests
│   ├── services/          # Service layer unit tests
│   ├── utils/             # Utility function tests
│   └── hooks/             # Custom hook tests
├── integration/            # Integration tests for API routes and services
│   ├── api/               # API route integration tests
│   ├── database/          # Database integration tests
│   ├── auth/              # Authentication flow tests
│   └── services/          # Service integration tests
├── e2e/                   # End-to-end user journey tests
│   ├── user-flows/        # Complete user workflows
│   ├── admin-flows/       # Administrative workflows
│   └── edge-cases/        # Error scenarios and edge cases
├── performance/           # Performance and load tests
├── setup/                 # Test configuration and utilities
│   ├── mocks/             # Mock implementations
│   ├── fixtures/          # Test data fixtures
│   ├── helpers/           # Test helper functions
│   └── config/            # Test environment configuration
└── shared/                # Shared test utilities and constants
```

### File Naming Conventions
- **Unit Tests**: `component-name.test.tsx`, `service-name.test.ts`
- **Integration Tests**: `feature-name.integration.test.ts`
- **E2E Tests**: `user-flow-name.e2e.test.ts`
- **Performance Tests**: `feature-name.performance.test.ts`

## Unit Testing Standards

### Component Testing Requirements
Every React component MUST have comprehensive unit tests covering:

```typescript
// __tests__/unit/components/user-profile.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserProfile } from '@/components/user-profile'
import { createMockUser } from '../../setup/fixtures'

describe('UserProfile Component', () => {
  const mockUser = createMockUser()
  const mockOnUpdate = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  describe('Rendering', () => {
    it('should render user information correctly', () => {
      render(<UserProfile user={mockUser} onUpdate={mockOnUpdate} />)
      
      expect(screen.getByText(mockUser.firstName)).toBeInTheDocument()
      expect(screen.getByText(mockUser.email)).toBeInTheDocument()
      expect(screen.getByRole('img', { name: /avatar/i })).toBeInTheDocument()
    })
    
    it('should show loading state when user is null', () => {
      render(<UserProfile user={null} onUpdate={mockOnUpdate} />)
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })
  
  describe('User Interactions', () => {
    it('should call onUpdate when edit button is clicked', async () => {
      render(<UserProfile user={mockUser} onUpdate={mockOnUpdate} />)
      
      fireEvent.click(screen.getByRole('button', { name: /edit/i }))
      
      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(mockUser)
      })
    })
  })
  
  describe('Error Handling', () => {
    it('should display error message when user data is invalid', () => {
      const invalidUser = { ...mockUser, email: 'invalid-email' }
      
      render(<UserProfile user={invalidUser} onUpdate={mockOnUpdate} />)
      
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })
  
  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<UserProfile user={mockUser} onUpdate={mockOnUpdate} />)
      
      expect(screen.getByRole('region', { name: /user profile/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/user avatar/i)).toBeInTheDocument()
    })
  })
})
```

### Service Layer Testing Requirements
Every service class MUST have comprehensive unit tests:

```typescript
// __tests__/unit/services/user-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from '@/lib/services/user-service'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import { createMockSupabaseClient } from '../../setup/mocks'

vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => createMockSupabaseClient()
}))

describe('UserService', () => {
  const mockSupabase = createMockSupabaseClient()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('getById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      })
      
      const result = await UserService.getById('1')
      
      expect(result).toEqual(mockUser)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })
    
    it('should throw NotFoundError when user not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' }
      })
      
      await expect(UserService.getById('nonexistent')).rejects.toThrow(NotFoundError)
    })
    
    it('should throw DatabaseError on database failure', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Connection failed', code: 'CONNECTION_ERROR' }
      })
      
      await expect(UserService.getById('1')).rejects.toThrow(DatabaseError)
    })
  })
})
```## In
tegration Testing Standards

### API Route Integration Testing
Every API route MUST have comprehensive integration tests:

```typescript
// __tests__/integration/api/users.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/users/[id]/route'
import { createTestDatabase, cleanupTestDatabase } from '../../setup/test-database'
import { createAuthenticatedRequest } from '../../setup/auth-helpers'
import { seedTestUser } from '../../setup/fixtures'

describe('/api/users/[id] Integration Tests', () => {
  let testUserId: string
  
  beforeAll(async () => {
    await createTestDatabase()
  })
  
  afterAll(async () => {
    await cleanupTestDatabase()
  })
  
  beforeEach(async () => {
    const testUser = await seedTestUser()
    testUserId = testUser.id
  })
  
  describe('GET /api/users/[id]', () => {
    it('should return user data for authenticated request', async () => {
      const request = createAuthenticatedRequest('GET', `/api/users/${testUserId}`)
      
      const response = await GET(request, { params: { id: testUserId } })
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('id', testUserId)
      expect(data.data).toHaveProperty('email')
      expect(data.data).not.toHaveProperty('clerk_user_id') // Sensitive data filtered
    })
    
    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest(`http://localhost/api/users/${testUserId}`)
      
      const response = await GET(request, { params: { id: testUserId } })
      
      expect(response.status).toBe(401)
    })
    
    it('should return 404 for non-existent user', async () => {
      const request = createAuthenticatedRequest('GET', '/api/users/nonexistent')
      
      const response = await GET(request, { params: { id: 'nonexistent' } })
      
      expect(response.status).toBe(404)
    })
  })
  
  describe('POST /api/users', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User'
      }
      const request = createAuthenticatedRequest('POST', '/api/users', userData)
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(201)
      expect(data.data).toHaveProperty('id')
      expect(data.data.email).toBe(userData.email)
    })
    
    it('should return 400 for invalid data', async () => {
      const invalidData = { email: 'invalid-email' }
      const request = createAuthenticatedRequest('POST', '/api/users', invalidData)
      
      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })
})
```

### Database Integration Testing
Database operations MUST be tested with real database interactions:

```typescript
// __tests__/integration/database/user-operations.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { UserService } from '@/lib/services/user-service'
import { createTestDatabase, cleanupTestDatabase, clearTestData } from '../../setup/test-database'
import { createTestUser } from '../../setup/fixtures'

describe('User Database Operations Integration', () => {
  beforeAll(async () => {
    await createTestDatabase()
  })
  
  afterAll(async () => {
    await cleanupTestDatabase()
  })
  
  beforeEach(async () => {
    await clearTestData(['users'])
  })
  
  describe('User CRUD Operations', () => {
    it('should create, read, update, and delete user', async () => {
      // Create
      const userData = createTestUser()
      const createdUser = await UserService.create(userData)
      
      expect(createdUser).toHaveProperty('id')
      expect(createdUser.email).toBe(userData.email)
      
      // Read
      const fetchedUser = await UserService.getById(createdUser.id)
      expect(fetchedUser).toEqual(createdUser)
      
      // Update
      const updateData = { firstName: 'Updated' }
      const updatedUser = await UserService.update(createdUser.id, updateData)
      expect(updatedUser.firstName).toBe('Updated')
      
      // Delete
      await UserService.delete(createdUser.id)
      const deletedUser = await UserService.getById(createdUser.id)
      expect(deletedUser).toBeNull()
    })
    
    it('should handle concurrent user operations', async () => {
      const users = Array.from({ length: 10 }, () => createTestUser())
      
      // Create users concurrently
      const createPromises = users.map(user => UserService.create(user))
      const createdUsers = await Promise.all(createPromises)
      
      expect(createdUsers).toHaveLength(10)
      expect(new Set(createdUsers.map(u => u.id))).toHaveProperty('size', 10)
      
      // Fetch users concurrently
      const fetchPromises = createdUsers.map(user => UserService.getById(user.id))
      const fetchedUsers = await Promise.all(fetchPromises)
      
      expect(fetchedUsers.every(user => user !== null)).toBe(true)
    })
  })
  
  describe('Row Level Security', () => {
    it('should enforce RLS policies correctly', async () => {
      // Test with different user contexts
      const user1 = await UserService.create(createTestUser())
      const user2 = await UserService.create(createTestUser())
      
      // User should only access their own data
      const user1Data = await UserService.getByClerkId(user1.clerk_user_id, user1.clerk_user_id)
      expect(user1Data).toBeTruthy()
      
      // User should not access other user's data
      await expect(
        UserService.getByClerkId(user2.clerk_user_id, user1.clerk_user_id)
      ).rejects.toThrow()
    })
  })
})
```

## End-to-End Testing Standards

### User Journey Testing
Complete user workflows MUST be tested end-to-end:

```typescript
// __tests__/e2e/user-flows/complete-user-onboarding.e2e.test.ts
import { test, expect, Page } from '@playwright/test'
import { createTestUser, cleanupTestUser } from '../../setup/e2e-helpers'

test.describe('Complete User Onboarding Flow', () => {
  let testUserEmail: string
  
  test.beforeEach(async () => {
    testUserEmail = `test-${Date.now()}@example.com`
  })
  
  test.afterEach(async () => {
    await cleanupTestUser(testUserEmail)
  })
  
  test('should complete full user onboarding journey', async ({ page }) => {
    // Step 1: User Registration
    await page.goto('/sign-up')
    await page.fill('[data-testid="email-input"]', testUserEmail)
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!')
    await page.fill('[data-testid="confirm-password-input"]', 'SecurePassword123!')
    await page.click('[data-testid="sign-up-button"]')
    
    // Verify email verification page
    await expect(page).toHaveURL(/\/verify-email/)
    await expect(page.locator('[data-testid="verification-message"]'))
      .toContainText('Check your email')
    
    // Step 2: Email Verification (simulate)
    await page.goto(`/verify-email?token=test-token&email=${testUserEmail}`)
    await expect(page).toHaveURL('/onboarding/profile')
    
    // Step 3: Profile Setup
    await page.fill('[data-testid="first-name-input"]', 'Test')
    await page.fill('[data-testid="last-name-input"]', 'User')
    await page.selectOption('[data-testid="role-select"]', 'developer')
    await page.click('[data-testid="continue-button"]')
    
    // Step 4: Organization Setup
    await expect(page).toHaveURL('/onboarding/organization')
    await page.click('[data-testid="create-organization-option"]')
    await page.fill('[data-testid="org-name-input"]', 'Test Organization')
    await page.fill('[data-testid="org-description-input"]', 'Test organization description')
    await page.click('[data-testid="create-org-button"]')
    
    // Step 5: Verify Dashboard Access
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('Welcome, Test!')
    await expect(page.locator('[data-testid="org-name"]'))
      .toContainText('Test Organization')
    
    // Step 6: Verify User Can Access Key Features
    await page.click('[data-testid="profile-menu"]')
    await expect(page.locator('[data-testid="profile-dropdown"]')).toBeVisible()
    
    await page.click('[data-testid="organization-settings"]')
    await expect(page).toHaveURL(/\/organizations\/[^\/]+\/settings/)
    
    // Step 7: Verify User Can Invite Members
    await page.click('[data-testid="invite-members-button"]')
    await page.fill('[data-testid="invite-email-input"]', 'member@example.com')
    await page.selectOption('[data-testid="member-role-select"]', 'member')
    await page.click('[data-testid="send-invitation-button"]')
    
    await expect(page.locator('[data-testid="success-notification"]'))
      .toContainText('Invitation sent successfully')
  })
  
  test('should handle onboarding errors gracefully', async ({ page }) => {
    // Test invalid email format
    await page.goto('/sign-up')
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="sign-up-button"]')
    
    await expect(page.locator('[data-testid="email-error"]'))
      .toContainText('Invalid email format')
    
    // Test password mismatch
    await page.fill('[data-testid="email-input"]', testUserEmail)
    await page.fill('[data-testid="password-input"]', 'password1')
    await page.fill('[data-testid="confirm-password-input"]', 'password2')
    await page.click('[data-testid="sign-up-button"]')
    
    await expect(page.locator('[data-testid="password-error"]'))
      .toContainText('Passwords do not match')
  })
})
```## P
erformance Testing Standards

### Load Testing Requirements
Critical features MUST be performance tested:

```typescript
// __tests__/performance/api-performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { UserService } from '@/lib/services/user-service'
import { createTestUsers } from '../setup/fixtures'

describe('API Performance Tests', () => {
  describe('User Service Performance', () => {
    it('should handle high-volume user queries efficiently', async () => {
      const testUsers = await createTestUsers(100)
      const startTime = performance.now()
      
      // Simulate concurrent user queries
      const queries = testUsers.map(user => UserService.getById(user.id))
      const results = await Promise.all(queries)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / testUsers.length
      
      expect(results).toHaveLength(100)
      expect(results.every(user => user !== null)).toBe(true)
      expect(averageTime).toBeLessThan(10) // Average < 10ms per query
      expect(totalTime).toBeLessThan(1000) // Total < 1 second
    })
    
    it('should maintain performance under concurrent writes', async () => {
      const userData = Array.from({ length: 50 }, () => createTestUser())
      const startTime = performance.now()
      
      // Concurrent user creation
      const createPromises = userData.map(user => UserService.create(user))
      const createdUsers = await Promise.all(createPromises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      expect(createdUsers).toHaveLength(50)
      expect(totalTime).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })
  
  describe('Database Query Performance', () => {
    it('should execute complex queries within time limits', async () => {
      const startTime = performance.now()
      
      // Complex query with joins and filters
      const result = await UserService.getUsersWithOrganizations({
        limit: 100,
        filters: { role: 'admin', active: true }
      })
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      expect(result).toBeDefined()
      expect(queryTime).toBeLessThan(100) // Complex queries < 100ms
    })
  })
})
```

## Test Utilities & Helpers

### Mock Implementations
Standardized mocks for consistent testing:

```typescript
// __tests__/setup/mocks/supabase-client.ts
import { vi } from 'vitest'

export function createMockSupabaseClient() {
  const mockSelect = vi.fn().mockReturnThis()
  const mockInsert = vi.fn().mockReturnThis()
  const mockUpdate = vi.fn().mockReturnThis()
  const mockDelete = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockIn = vi.fn().mockReturnThis()
  const mockSingle = vi.fn()
  
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    single: mockSingle
  }))
  
  return {
    from: mockFrom,
    // Expose individual mocks for test setup
    _mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      single: mockSingle
    }
  }
}

// __tests__/setup/mocks/clerk-auth.ts
import { vi } from 'vitest'

export function createMockClerkAuth(userId?: string, orgId?: string) {
  return vi.fn(() => ({
    userId: userId || 'test-user-id',
    orgId: orgId || 'test-org-id',
    sessionId: 'test-session-id'
  }))
}

export function createUnauthenticatedMockAuth() {
  return vi.fn(() => ({
    userId: null,
    orgId: null,
    sessionId: null
  }))
}
```

### Test Data Fixtures
Consistent test data generation:

```typescript
// __tests__/setup/fixtures/user-fixtures.ts
import { faker } from '@faker-js/faker'
import { UserInsert } from '@/lib/models'

export function createTestUser(overrides: Partial<UserInsert> = {}): UserInsert {
  return {
    clerk_user_id: faker.string.uuid(),
    email: faker.internet.email(),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    avatar_url: faker.image.avatar(),
    preferences: {},
    ...overrides
  }
}

export function createTestUsers(count: number): UserInsert[] {
  return Array.from({ length: count }, () => createTestUser())
}

export function createTestOrganization(overrides = {}) {
  return {
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    description: faker.company.catchPhrase(),
    avatar_url: faker.image.url(),
    metadata: {},
    settings: {},
    ...overrides
  }
}
```

### Database Test Helpers
Idempotent database operations for testing:

```typescript
// __tests__/setup/test-database.ts
import { createSupabaseClient } from '@/lib/database'

const supabase = createSupabaseClient()

export async function createTestDatabase(): Promise<void> {
  // Ensure test database is in clean state
  await cleanupTestDatabase()
  
  // Create test-specific schemas or configurations if needed
  // This should be idempotent
}

export async function cleanupTestDatabase(): Promise<void> {
  // Clean up all test data in reverse dependency order
  const tables = [
    'audit_logs',
    'invitations', 
    'organization_memberships',
    'roles',
    'permissions',
    'organizations',
    'users'
  ]
  
  for (const table of tables) {
    await supabase
      .from(table)
      .delete()
      .like('email', '%@test.example.com') // Only delete test data
  }
}

export async function clearTestData(tables: string[]): Promise<void> {
  for (const table of tables) {
    await supabase
      .from(table)
      .delete()
      .like('email', '%@test.example.com')
  }
}

export async function seedTestUser(): Promise<any> {
  const userData = createTestUser({
    email: `test-${Date.now()}@test.example.com`
  })
  
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

## Test Execution Standards

### Test Execution Philosophy

**CRITICAL REQUIREMENT**: All test executions MUST terminate gracefully without manual intervention.

#### Default Behavior Rules
1. **No Watch Mode by Default**: The default `test` command MUST run tests once and exit
2. **Explicit Watch Mode**: Watch mode is only available through explicit commands (`test:dev`, `test:watch`)
3. **CI/CD Compatibility**: All test commands must be suitable for automated environments
4. **Graceful Termination**: Tests must complete and exit with appropriate exit codes
5. **No Manual Intervention**: Tests should never require manual termination (Ctrl+C)

#### Command Standards
```bash
# ✅ CORRECT: Default test command runs once and exits
pnpm test                    # Runs vitest run (exits after completion)

# ✅ CORRECT: Explicit watch mode for development
pnpm test:dev               # Runs vitest --watch (explicit watch mode)
pnpm test:watch             # Alternative watch command

# ❌ INCORRECT: Default command should not watch
pnpm test                   # Should NOT run vitest (watch mode)
```

### Parallel Execution Configuration
Tests MUST support parallel execution:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Enable parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    // Test timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    // Coverage requirements
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/coverage/**'
      ]
    }
  }
})
```

### Test Scripts and Commands
Standardized test execution commands:

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest run",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run __tests__/unit",
    "test:integration": "vitest run __tests__/integration",
    "test:e2e": "playwright test",
    "test:performance": "vitest run __tests__/performance",
    "test:watch": "vitest --watch",
    "test:dev": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:all": "pnpm test:unit && pnpm test:integration && pnpm test:e2e",
    "test:ci": "pnpm test:coverage && pnpm test:e2e --reporter=junit"
  }
}
```#
# Quality Assurance Checklist

### Pre-Task Completion Checklist
Before marking any task as complete, verify ALL of the following:

#### ✅ Test Coverage Requirements
- [ ] All new functions have unit tests with 90%+ coverage
- [ ] All new components have comprehensive unit tests
- [ ] All new API routes have integration tests
- [ ] Critical user flows have E2E tests
- [ ] Performance-critical features have performance tests

#### ✅ Test Success Requirements
- [ ] All unit tests pass (0 failures, 0 skips)
- [ ] All integration tests pass (0 failures, 0 skips)
- [ ] All E2E tests pass (0 failures, 0 skips)
- [ ] All performance tests meet benchmarks
- [ ] No test warnings or deprecation notices

#### ✅ Regression Prevention
- [ ] Existing tests continue to pass
- [ ] No breaking changes to public APIs
- [ ] Backward compatibility maintained
- [ ] Database migrations are reversible
- [ ] No performance degradation in existing features

#### ✅ Code Quality Standards
- [ ] TypeScript compilation passes with no errors
- [ ] ESLint passes with no errors or warnings
- [ ] Prettier formatting applied consistently
- [ ] All functions have proper JSDoc documentation
- [ ] Error handling follows established patterns

#### ✅ Security & Authentication
- [ ] Authentication flows tested with valid/invalid credentials
- [ ] Authorization checks tested for different user roles
- [ ] Input validation tested with malicious inputs
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

#### ✅ Database & Data Integrity
- [ ] Database operations are transactional where needed
- [ ] Row Level Security policies tested
- [ ] Data validation schemas tested
- [ ] Migration scripts tested in both directions
- [ ] Foreign key constraints respected

#### ✅ Performance Standards
- [ ] API responses under 200ms for simple queries
- [ ] Complex queries under 1 second
- [ ] UI components render under 100ms
- [ ] No memory leaks in long-running operations
- [ ] Proper caching strategies implemented

### Test Execution Workflow

#### 1. Development Phase Testing
```bash
# Run tests once during development (default behavior)
pnpm test

# Run tests in watch mode only when explicitly needed for development
pnpm test:dev

# Run specific test suites (always run once, no watch mode)
pnpm test:unit -- user-service
pnpm test:integration -- auth-flow
```

#### 2. Pre-Commit Testing
```bash
# Full test suite before committing
pnpm test:all
pnpm test:coverage

# Verify no test artifacts remain
git status # Should show no untracked test files
```

#### 3. CI/CD Pipeline Testing
```bash
# Comprehensive testing in CI
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm test:e2e
pnpm build
```

## Test Execution Enforcement

### Mandatory Test Execution Rules

**CRITICAL**: These rules MUST be followed for all test executions:

#### ✅ Required Test Command Behavior
```bash
# ✅ CORRECT: Default test command runs once and exits
pnpm test                    # Must use "vitest run" (no watch mode)
pnpm test:run               # Explicit run mode
pnpm test --filter=web      # Runs specific tests once

# ✅ CORRECT: Explicit watch mode for development only
pnpm test:dev               # Uses "vitest --watch" (explicit watch)
pnpm test:watch             # Alternative watch command

# ✅ CORRECT: CI/CD compatible commands
pnpm test:ci                # Runs with coverage and exits
pnpm test:coverage          # Runs with coverage and exits
```

#### ❌ Forbidden Test Command Patterns
```bash
# ❌ FORBIDDEN: Default command should never watch
pnpm test                   # Should NOT use "vitest" (watch mode)

# ❌ FORBIDDEN: Commands that require manual termination
vitest                      # Starts in watch mode, requires Ctrl+C
npm test                    # May default to watch mode

# ❌ FORBIDDEN: Commands that hang in CI/CD
pnpm test --watch           # Will hang in automated environments
```

### Enforcement Mechanisms

#### 1. Package.json Validation
All package.json files MUST follow this pattern:

```json
{
  "scripts": {
    "test": "vitest run",           // ✅ Runs once and exits
    "test:run": "vitest run",       // ✅ Explicit run mode
    "test:dev": "vitest --watch",   // ✅ Explicit watch mode
    "test:watch": "vitest --watch", // ✅ Alternative watch mode
    "test:ci": "vitest run --coverage" // ✅ CI mode
  }
}
```

#### 2. Turbo Configuration Validation
turbo.json MUST configure test tasks correctly:

```json
{
  "pipeline": {
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:run": {
      "dependsOn": ["^build"], 
      "outputs": ["coverage/**"]
    },
    "test:dev": {
      "cache": false,
      "persistent": true
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    }
  }
}
```

#### 3. CI/CD Pipeline Validation
All CI/CD pipelines MUST use non-watch commands:

```yaml
# ✅ CORRECT: CI pipeline
- run: pnpm test           # Runs once and exits
- run: pnpm test:coverage  # Runs with coverage and exits
- run: pnpm test:ci        # Explicit CI mode

# ❌ FORBIDDEN: CI pipeline
- run: pnpm test:watch     # Will hang CI pipeline
- run: vitest              # May start in watch mode
```

### Validation Scripts

#### Pre-commit Hook Validation
```bash
#!/bin/bash
# .husky/pre-commit

# Validate test commands don't use watch mode by default
if grep -r '"test".*"vitest"[^r]' package.json; then
  echo "❌ ERROR: Default test command uses watch mode"
  echo "Fix: Change 'vitest' to 'vitest run' in package.json"
  exit 1
fi

# Run tests once and ensure they exit
timeout 60s pnpm test || {
  echo "❌ ERROR: Tests did not complete within 60 seconds"
  echo "This indicates tests are in watch mode or hanging"
  exit 1
}

echo "✅ Test execution validation passed"
```

#### Package.json Linting
```javascript
// scripts/validate-test-commands.js
const fs = require('fs');
const path = require('path');

function validatePackageJson(packagePath) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = pkg.scripts || {};
  
  // Check default test command
  if (scripts.test && scripts.test.includes('vitest') && !scripts.test.includes('vitest run')) {
    throw new Error(`❌ ${packagePath}: Default test command uses watch mode. Use 'vitest run' instead.`);
  }
  
  // Ensure explicit watch commands exist
  if (!scripts['test:dev'] && !scripts['test:watch']) {
    console.warn(`⚠️  ${packagePath}: No explicit watch mode command found. Consider adding 'test:dev' or 'test:watch'.`);
  }
  
  console.log(`✅ ${packagePath}: Test commands validated`);
}

// Validate all package.json files
const packages = ['package.json', 'apps/web/package.json'];
packages.forEach(validatePackageJson);
```

### Common Testing Anti-Patterns to Avoid

#### ❌ Testing Implementation Details
```typescript
// BAD: Testing internal state
expect(component.state.isLoading).toBe(true)

// GOOD: Testing user-visible behavior
expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
```

#### ❌ Non-Deterministic Tests
```typescript
// BAD: Time-dependent tests
expect(user.createdAt).toBe(new Date())

// GOOD: Controlled time testing
vi.setSystemTime(new Date('2024-01-01'))
expect(user.createdAt).toBe('2024-01-01T00:00:00.000Z')
```

#### ❌ Shared Test State
```typescript
// BAD: Tests depend on each other
let sharedUser: User

test('creates user', () => {
  sharedUser = createUser()
})

test('updates user', () => {
  updateUser(sharedUser.id) // Depends on previous test
})

// GOOD: Independent tests
test('updates user', () => {
  const user = createUser()
  updateUser(user.id)
})
```

#### ❌ Testing Styles Instead of Functionality
```typescript
// BAD: Testing CSS classes
expect(element).toHaveClass('text-red-500')

// GOOD: Testing semantic meaning
expect(element).toHaveAttribute('aria-invalid', 'true')
```

### Debugging Failed Tests

#### Test Failure Investigation Process
1. **Identify the Failure Type**
   - Unit test failure: Check function logic and mocks
   - Integration test failure: Check API contracts and database state
   - E2E test failure: Check UI interactions and timing

2. **Isolate the Problem**
   ```bash
   # Run single test file
   pnpm test user-service.test.ts
   
   # Run with debug output
   pnpm test --reporter=verbose user-service.test.ts
   
   # Run E2E test in headed mode
   pnpm test:e2e --headed --debug
   ```

3. **Check Test Environment**
   - Verify test database is clean
   - Check mock implementations are correct
   - Ensure test data fixtures are valid

4. **Fix and Verify**
   - Make minimal changes to fix the issue
   - Run the specific test to verify fix
   - Run full test suite to ensure no regressions

### Performance Monitoring in Tests

#### Automated Performance Benchmarks
```typescript
// __tests__/performance/benchmarks.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'

describe('Performance Benchmarks', () => {
  it('should maintain API response time benchmarks', async () => {
    const benchmarks = {
      'GET /api/users': 100,      // 100ms max
      'POST /api/users': 200,     // 200ms max
      'GET /api/organizations': 150, // 150ms max
    }
    
    for (const [endpoint, maxTime] of Object.entries(benchmarks)) {
      const startTime = performance.now()
      await fetch(`http://localhost:3000${endpoint}`)
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(maxTime)
    }
  })
})
```

## Continuous Improvement

### Test Metrics Tracking
Monitor and improve test quality over time:

- **Coverage Trends**: Track coverage percentage over time
- **Test Execution Time**: Monitor and optimize slow tests
- **Flaky Test Detection**: Identify and fix non-deterministic tests
- **Test Maintenance**: Regular review and refactoring of test code

### Regular Test Reviews
Conduct monthly test reviews to:

- Identify gaps in test coverage
- Remove obsolete or redundant tests
- Update test data and fixtures
- Improve test performance and reliability
- Share testing best practices across the team

### Test Documentation
Maintain comprehensive test documentation:

- Test strategy and approach for each feature
- Test data setup and teardown procedures
- Common testing patterns and utilities
- Troubleshooting guides for test failures
- Performance benchmarks and expectations

## Conclusion

These testing standards ensure that every feature and task completion meets the highest quality standards. By following these guidelines, we maintain:

- **Reliability**: Tests accurately reflect system behavior
- **Maintainability**: Tests are easy to understand and modify
- **Performance**: Tests execute efficiently and support parallel execution
- **Coverage**: All critical paths and edge cases are tested
- **Confidence**: Deployments are safe and regressions are prevented

## Task Completion Validation Workflow

### Pre-Completion Checklist

Before marking any task as complete, execute this validation workflow:

```bash
# 1. MANDATORY: TypeScript compilation check
pnpm typecheck
# Must exit with code 0 and zero errors

# 2. MANDATORY: Build validation  
pnpm build
# Must complete successfully without failures

# 3. MANDATORY: Test validation
pnpm test
# Must pass with 100% success rate

# 4. MANDATORY: Lint validation
pnpm lint
# Must pass without errors or warnings

# 5. Optional: Coverage check
pnpm test:coverage
# Should meet 90%+ coverage for new code
```

### Validation Command

Use this single command to validate all requirements:

```bash
pnpm validate
# Runs: typecheck + lint + test + build
```

### Failure Resolution

If any validation step fails:

1. **TypeScript Errors**: Fix all type errors before proceeding
2. **Build Failures**: Resolve import/compilation issues
3. **Test Failures**: Fix failing tests, don't skip or ignore
4. **Lint Errors**: Address all linting issues

**CRITICAL**: Never commit or mark tasks complete with validation failures.

Remember: **No task is complete until TypeScript compiles without errors, build succeeds, and all tests pass.**