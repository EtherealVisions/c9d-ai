# Comprehensive Testing Guide

This guide covers all aspects of testing for the Account Management & Organizational Modeling system, including unit tests, integration tests, end-to-end tests, and performance testing.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Environment Setup](#test-environment-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Test Data Management](#test-data-management)
9. [Continuous Integration](#continuous-integration)
10. [Best Practices](#best-practices)

## Testing Strategy

### Test Pyramid

Our testing strategy follows the test pyramid approach:

```
    /\
   /  \     E2E Tests (Few)
  /____\    - User workflows
 /      \   - Critical paths
/________\  Integration Tests (Some)
           - API endpoints
           - Service interactions
___________
           Unit Tests (Many)
           - Individual functions
           - Component logic
```

### Test Categories

1. **Unit Tests (70%)**
   - Individual functions and components
   - Fast execution, isolated testing
   - High code coverage target: >90%

2. **Integration Tests (20%)**
   - Service interactions
   - Database operations
   - API endpoint testing
   - Authentication flows

3. **End-to-End Tests (10%)**
   - Complete user workflows
   - Critical business processes
   - Cross-browser compatibility

### Testing Frameworks

- **Unit Tests**: Vitest + React Testing Library
- **Integration Tests**: Vitest + Supertest
- **E2E Tests**: Playwright
- **Performance Tests**: Artillery + Custom scripts
- **Security Tests**: OWASP ZAP + Custom tools

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Install testing tools
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
npm install -D artillery
```

### Environment Configuration

Create test environment files:

```bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
CLERK_SECRET_KEY=sk_test_mock_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_mock_key
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
```

### Test Database Setup

```sql
-- Create test database
CREATE DATABASE test_db;

-- Run migrations
npm run db:migrate:test

-- Seed test data
npm run db:seed:test
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Unit Testing

### Component Testing

```typescript
// components/__tests__/user-profile.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserProfile } from '../user-profile'
import { mockUser } from '../../__tests__/fixtures/user'

describe('UserProfile', () => {
  const defaultProps = {
    user: mockUser,
    onUpdate: vi.fn(),
    onError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders user information correctly', () => {
    render(<UserProfile {...defaultProps} />)
    
    expect(screen.getByText(mockUser.firstName)).toBeInTheDocument()
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /avatar/i })).toBeInTheDocument()
  })

  it('handles profile updates', async () => {
    const user = userEvent.setup()
    render(<UserProfile {...defaultProps} />)
    
    const nameInput = screen.getByLabelText(/first name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(defaultProps.onUpdate).toHaveBeenCalledWith({
        ...mockUser,
        firstName: 'Updated Name'
      })
    })
  })

  it('displays validation errors', async () => {
    const user = userEvent.setup()
    render(<UserProfile {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.clear(emailInput)
    await user.type(emailInput, 'invalid-email')
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
  })
})
```

### Service Testing

```typescript
// lib/services/__tests__/user-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userService } from '../user-service'
import { createTypedSupabaseClient } from '../../models/database'

vi.mock('../../models/database')
vi.mock('@clerk/nextjs/server')

describe('UserService', () => {
  let mockSupabase: any
  let mockAuth: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
      }))
    }
    
    vi.mocked(createTypedSupabaseClient).mockReturnValue(mockSupabase)
    
    mockAuth = vi.mocked(require('@clerk/nextjs/server').auth)
    vi.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('returns user data for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        clerk_user_id: 'clerk-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      }

      mockAuth.mockReturnValue({ userId: 'clerk-123' })
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null
      })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        id: 'user-123',
        clerkUserId: 'clerk-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      })
    })

    it('returns error for unauthenticated user', async () => {
      mockAuth.mockReturnValue({ userId: null })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
    })

    it('handles database errors', async () => {
      mockAuth.mockReturnValue({ userId: 'clerk-123' })
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      const result = await userService.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })

  describe('updateUser', () => {
    it('updates user successfully', async () => {
      const userId = 'user-123'
      const updateData = { firstName: 'Jane', lastName: 'Smith' }
      const updatedUser = {
        id: userId,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'test@example.com'
      }

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: updatedUser,
        error: null
      })

      const result = await userService.updateUser(userId, updateData)

      expect(result.success).toBe(true)
      expect(result.data?.firstName).toBe('Jane')
      expect(result.data?.lastName).toBe('Smith')
    })

    it('validates required fields', async () => {
      const result = await userService.updateUser('user-123', {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('No update data provided')
    })
  })
})
```

### Hook Testing

```typescript
// hooks/__tests__/use-organization.test.tsx
import { renderHook, act } from '@testing-library/react'
import { useOrganization } from '../use-organization'
import { OrganizationProvider } from '../../lib/contexts/organization-context'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <OrganizationProvider>{children}</OrganizationProvider>
)

describe('useOrganization', () => {
  it('provides organization context', () => {
    const { result } = renderHook(() => useOrganization(), { wrapper })
    
    expect(result.current.currentOrganization).toBeDefined()
    expect(result.current.switchToOrganization).toBeInstanceOf(Function)
    expect(result.current.isLoading).toBe(false)
  })

  it('switches organizations', async () => {
    const { result } = renderHook(() => useOrganization(), { wrapper })
    
    await act(async () => {
      await result.current.switchToOrganization('org-456')
    })
    
    expect(result.current.currentOrganization?.id).toBe('org-456')
  })
})
```

## Integration Testing

### API Endpoint Testing

```typescript
// __tests__/integration/auth-flow.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { createTestUser, cleanupTestData } from '../helpers/test-helpers'

describe('Authentication Flow Integration', () => {
  let testUser: any
  let authToken: string

  beforeEach(async () => {
    testUser = await createTestUser()
    authToken = await getAuthToken(testUser)
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('POST /api/auth/login', () => {
    it('authenticates user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'testpassword'
        })
        .expect(200)

      expect(response.body.data.user.id).toBe(testUser.id)
      expect(response.body.data.token).toBeDefined()
    })

    it('rejects invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401)

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })
  })

  describe('GET /api/users/me', () => {
    it('returns current user data', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.id).toBe(testUser.id)
      expect(response.body.data.email).toBe(testUser.email)
    })

    it('requires authentication', async () => {
      await request(app)
        .get('/api/users/me')
        .expect(401)
    })
  })
})
```

### Database Integration Testing

```typescript
// __tests__/integration/organization-service.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { organizationService } from '../../lib/services/organization-service'
import { createTestUser, createTestOrganization, cleanupTestData } from '../helpers/test-helpers'

describe('Organization Service Integration', () => {
  let testUser: any
  let testOrg: any

  beforeEach(async () => {
    testUser = await createTestUser()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('createOrganization', () => {
    it('creates organization with owner membership', async () => {
      const orgData = {
        name: 'Test Organization',
        description: 'Integration test org'
      }

      const result = await organizationService.createOrganization(orgData, testUser.id)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe(orgData.name)
      expect(result.data?.slug).toBe('test-organization')

      // Verify owner membership was created
      const memberships = await organizationService.getUserOrganizations(testUser.id)
      expect(memberships.data).toHaveLength(1)
      expect(memberships.data?.[0].role).toBe('owner')
    })

    it('prevents duplicate organization names', async () => {
      const orgData = { name: 'Duplicate Org' }

      // Create first organization
      await organizationService.createOrganization(orgData, testUser.id)

      // Attempt to create duplicate
      const result = await organizationService.createOrganization(orgData, testUser.id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Organization name already exists')
    })
  })

  describe('getUserOrganizations', () => {
    it('returns user organizations with roles', async () => {
      // Create multiple organizations
      await createTestOrganization({ name: 'Org 1', ownerId: testUser.id })
      await createTestOrganization({ name: 'Org 2', ownerId: testUser.id })

      const result = await organizationService.getUserOrganizations(testUser.id)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.every(org => org.role === 'owner')).toBe(true)
    })

    it('filters organizations by user access', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' })
      
      // Create org for other user
      await createTestOrganization({ name: 'Other Org', ownerId: otherUser.id })
      
      // Create org for test user
      await createTestOrganization({ name: 'My Org', ownerId: testUser.id })

      const result = await organizationService.getUserOrganizations(testUser.id)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].name).toBe('My Org')
    })
  })
})
```

## End-to-End Testing

### User Workflow Testing

```typescript
// __tests__/e2e/user-registration.e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('User Registration Flow', () => {
  test('complete user registration and organization setup', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/sign-up')

    // Fill registration form
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'SecurePassword123!')
    await page.fill('[data-testid="first-name-input"]', 'John')
    await page.fill('[data-testid="last-name-input"]', 'Doe')

    // Submit registration
    await page.click('[data-testid="register-button"]')

    // Wait for email verification page
    await expect(page.locator('[data-testid="verify-email-message"]')).toBeVisible()

    // Simulate email verification (in test environment)
    await page.goto('/verify-email?token=test-verification-token')

    // Should redirect to organization setup
    await expect(page.locator('[data-testid="org-setup-form"]')).toBeVisible()

    // Create first organization
    await page.fill('[data-testid="org-name-input"]', 'My First Company')
    await page.fill('[data-testid="org-description-input"]', 'A great place to work')
    await page.click('[data-testid="create-org-button"]')

    // Should redirect to dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
    await expect(page.locator('text=My First Company')).toBeVisible()

    // Verify user is owner
    await page.click('[data-testid="user-menu"]')
    await expect(page.locator('text=Owner')).toBeVisible()
  })

  test('handles registration errors gracefully', async ({ page }) => {
    await page.goto('/sign-up')

    // Try to register with invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="register-button"]')

    // Should show validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format')
  })
})
```

### Organization Management E2E

```typescript
// __tests__/e2e/organization-management.e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/sign-in')
    await page.fill('[data-testid="email-input"]', 'testuser@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  })

  test('invites and manages team members', async ({ page }) => {
    // Navigate to members page
    await page.click('[data-testid="members-nav"]')
    await expect(page.locator('[data-testid="members-list"]')).toBeVisible()

    // Invite new member
    await page.click('[data-testid="invite-member-button"]')
    await page.fill('[data-testid="invite-email-input"]', 'newmember@example.com')
    await page.selectOption('[data-testid="invite-role-select"]', 'admin')
    await page.fill('[data-testid="invite-message-input"]', 'Welcome to our team!')
    await page.click('[data-testid="send-invitation-button"]')

    // Verify invitation appears in pending list
    await expect(page.locator('[data-testid="pending-invitations"]')).toBeVisible()
    await expect(page.locator('text=newmember@example.com')).toBeVisible()

    // Simulate member accepting invitation (in separate context)
    const memberPage = await page.context().newPage()
    await memberPage.goto('/invitations/accept?token=test-invitation-token')
    await memberPage.fill('[data-testid="password-input"]', 'memberpassword')
    await memberPage.click('[data-testid="accept-invitation-button"]')

    // Back to original page, verify member appears in active list
    await page.reload()
    await expect(page.locator('[data-testid="active-members"]')).toContainText('newmember@example.com')

    // Change member role
    await page.click('[data-testid="member-actions-newmember@example.com"]')
    await page.click('[data-testid="change-role-option"]')
    await page.selectOption('[data-testid="new-role-select"]', 'member')
    await page.click('[data-testid="confirm-role-change"]')

    // Verify role change
    await expect(page.locator('[data-testid="member-role-newmember@example.com"]')).toContainText('Member')
  })

  test('manages organization settings', async ({ page }) => {
    // Navigate to organization settings
    await page.click('[data-testid="org-settings-nav"]')
    await expect(page.locator('[data-testid="org-settings-form"]')).toBeVisible()

    // Update organization details
    await page.fill('[data-testid="org-name-input"]', 'Updated Company Name')
    await page.fill('[data-testid="org-description-input"]', 'Updated description')
    await page.check('[data-testid="require-approval-checkbox"]')
    await page.click('[data-testid="save-settings-button"]')

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

    // Verify changes are saved
    await page.reload()
    await expect(page.locator('[data-testid="org-name-input"]')).toHaveValue('Updated Company Name')
    await expect(page.locator('[data-testid="require-approval-checkbox"]')).toBeChecked()
  })
})
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"
  variables:
    authToken: "{{ $randomString() }}"

scenarios:
  - name: "User authentication flow"
    weight: 30
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test{{ $randomInt(1, 1000) }}@example.com"
            password: "testpassword"
          capture:
            - json: "$.data.token"
              as: "authToken"
      - get:
          url: "/api/users/me"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Organization operations"
    weight: 40
    flow:
      - post:
          url: "/api/organizations"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            name: "Test Org {{ $randomString() }}"
            description: "Load test organization"
          capture:
            - json: "$.data.id"
              as: "orgId"
      - get:
          url: "/api/organizations/{{ orgId }}"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Permission checking"
    weight: 30
    flow:
      - post:
          url: "/api/organizations/{{ orgId }}/permissions/check"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            permissions:
              - "organization.read"
              - "organization.write"
              - "members.manage"
```

### Performance Test Scripts

```typescript
// __tests__/performance/permission-performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { rbacService } from '../../lib/services/rbac-service'

describe('Permission Performance Tests', () => {
  it('should check permissions within performance threshold', async () => {
    const userId = 'test-user'
    const organizationId = 'test-org'
    const iterations = 1000

    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      await rbacService.hasPermission(userId, organizationId, 'organization.read')
    }

    const endTime = performance.now()
    const averageTime = (endTime - startTime) / iterations

    console.log(`Average permission check time: ${averageTime.toFixed(2)}ms`)
    
    // Should be under 10ms per check
    expect(averageTime).toBeLessThan(10)
  })

  it('should handle concurrent permission checks efficiently', async () => {
    const userId = 'test-user'
    const organizationId = 'test-org'
    const concurrentChecks = 100

    const startTime = performance.now()

    const promises = Array.from({ length: concurrentChecks }, () =>
      rbacService.hasPermission(userId, organizationId, 'organization.read')
    )

    await Promise.all(promises)

    const endTime = performance.now()
    const totalTime = endTime - startTime

    console.log(`${concurrentChecks} concurrent checks completed in ${totalTime.toFixed(2)}ms`)
    
    // Should handle concurrent load efficiently
    expect(totalTime).toBeLessThan(1000) // Under 1 second for 100 concurrent checks
  })
})
```

### Memory Leak Testing

```typescript
// __tests__/performance/memory-leak.test.ts
import { describe, it, expect } from 'vitest'
import { organizationService } from '../../lib/services/organization-service'

describe('Memory Leak Tests', () => {
  it('should not leak memory during repeated operations', async () => {
    const initialMemory = process.memoryUsage()
    
    // Perform many operations
    for (let i = 0; i < 1000; i++) {
      await organizationService.getUserOrganizations('test-user')
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    const finalMemory = process.memoryUsage()
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
    const memoryIncreaseKB = memoryIncrease / 1024

    console.log(`Memory increase: ${memoryIncreaseKB.toFixed(2)} KB`)
    
    // Should not increase memory significantly
    expect(memoryIncreaseKB).toBeLessThan(1000) // Less than 1MB increase
  })
})
```

## Security Testing

### Authentication Security Tests

```typescript
// __tests__/security/auth-security.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app'

describe('Authentication Security', () => {
  it('prevents SQL injection in login', async () => {
    const maliciousPayload = {
      email: "admin@example.com'; DROP TABLE users; --",
      password: "password"
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send(maliciousPayload)
      .expect(401)

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('rate limits login attempts', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword'
    }

    // Make multiple failed attempts
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
    }

    // Next attempt should be rate limited
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(429)

    expect(response.body.error.code).toBe('RATE_LIMITED')
  })

  it('validates JWT tokens properly', async () => {
    const invalidToken = 'invalid.jwt.token'

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401)

    expect(response.body.error.code).toBe('INVALID_TOKEN')
  })
})
```

### Authorization Security Tests

```typescript
// __tests__/security/authz-security.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { createTestUser, getAuthToken } from '../helpers/test-helpers'

describe('Authorization Security', () => {
  it('prevents cross-tenant data access', async () => {
    const user1 = await createTestUser({ email: 'user1@example.com' })
    const user2 = await createTestUser({ email: 'user2@example.com' })
    
    const token1 = await getAuthToken(user1)
    const token2 = await getAuthToken(user2)

    // User1 creates organization
    const orgResponse = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'User1 Org' })
      .expect(201)

    const orgId = orgResponse.body.data.id

    // User2 tries to access User1's organization
    const accessResponse = await request(app)
      .get(`/api/organizations/${orgId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403)

    expect(accessResponse.body.error.code).toBe('FORBIDDEN')
  })

  it('enforces role-based permissions', async () => {
    const owner = await createTestUser({ email: 'owner@example.com' })
    const member = await createTestUser({ email: 'member@example.com' })
    
    const ownerToken = await getAuthToken(owner)
    const memberToken = await getAuthToken(member)

    // Owner creates organization
    const orgResponse = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Test Org' })

    const orgId = orgResponse.body.data.id

    // Owner invites member with limited role
    await request(app)
      .post(`/api/organizations/${orgId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: member.email,
        roleId: 'role-member'
      })

    // Member tries to perform admin action
    const adminResponse = await request(app)
      .delete(`/api/organizations/${orgId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403)

    expect(adminResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS')
  })
})
```

## Test Data Management

### Test Fixtures

```typescript
// __tests__/fixtures/user.ts
export const mockUser = {
  id: 'user-123',
  clerkUserId: 'clerk-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: 'https://example.com/avatar.jpg',
  preferences: {
    theme: 'light',
    notifications: true
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
}

export const mockOrganization = {
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-organization',
  description: 'A test organization',
  settings: {
    allowPublicSignup: false,
    requireApproval: true
  },
  metadata: {},
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
}
```

### Test Helpers

```typescript
// __tests__/helpers/test-helpers.ts
import { createTypedSupabaseClient } from '../../lib/models/database'

export async function createTestUser(overrides = {}) {
  const supabase = createTypedSupabaseClient()
  
  const userData = {
    clerk_user_id: `clerk-${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    first_name: 'Test',
    last_name: 'User',
    ...overrides
  }

  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createTestOrganization(overrides = {}) {
  const supabase = createTypedSupabaseClient()
  
  const orgData = {
    name: `Test Org ${Date.now()}`,
    slug: `test-org-${Date.now()}`,
    description: 'Test organization',
    ...overrides
  }

  const { data, error } = await supabase
    .from('organizations')
    .insert(orgData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cleanupTestData() {
  const supabase = createTypedSupabaseClient()
  
  // Clean up in reverse dependency order
  await supabase.from('memberships').delete().like('user_id', 'test-%')
  await supabase.from('organizations').delete().like('name', 'Test Org%')
  await supabase.from('users').delete().like('email', 'test-%@example.com')
}

export async function getAuthToken(user: any): Promise<string> {
  // Mock token generation for testing
  return `test-token-${user.id}`
}
```

### Database Seeding

```typescript
// scripts/seed-test-data.ts
import { createTypedSupabaseClient } from '../lib/models/database'

async function seedTestData() {
  const supabase = createTypedSupabaseClient()

  // Create test users
  const users = await Promise.all([
    supabase.from('users').insert({
      clerk_user_id: 'clerk-test-owner',
      email: 'owner@test.com',
      first_name: 'Test',
      last_name: 'Owner'
    }).select().single(),
    
    supabase.from('users').insert({
      clerk_user_id: 'clerk-test-admin',
      email: 'admin@test.com',
      first_name: 'Test',
      last_name: 'Admin'
    }).select().single(),
    
    supabase.from('users').insert({
      clerk_user_id: 'clerk-test-member',
      email: 'member@test.com',
      first_name: 'Test',
      last_name: 'Member'
    }).select().single()
  ])

  // Create test organizations
  const org = await supabase.from('organizations').insert({
    name: 'Test Organization',
    slug: 'test-organization',
    description: 'Organization for testing'
  }).select().single()

  // Create memberships
  await Promise.all([
    supabase.from('memberships').insert({
      user_id: users[0].data.id,
      organization_id: org.data.id,
      role_id: 'role-owner',
      status: 'active'
    }),
    
    supabase.from('memberships').insert({
      user_id: users[1].data.id,
      organization_id: org.data.id,
      role_id: 'role-admin',
      status: 'active'
    }),
    
    supabase.from('memberships').insert({
      user_id: users[2].data.id,
      organization_id: org.data.id,
      role_id: 'role-member',
      status: 'active'
    })
  ])

  console.log('Test data seeded successfully')
}

if (require.main === module) {
  seedTestData().catch(console.error)
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: npm run db:migrate:test
      
      - name: Seed test data
        run: npm run db:seed:test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: npm start &
        env:
          NODE_ENV: test
      
      - name: Wait for application
        run: npx wait-on http://localhost:3000
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: npm start &
        env:
          NODE_ENV: production
      
      - name: Wait for application
        run: npx wait-on http://localhost:3000
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance-report/
```

## Best Practices

### Test Organization

1. **File Structure**
   ```
   __tests__/
   ├── unit/
   │   ├── components/
   │   ├── services/
   │   └── utils/
   ├── integration/
   │   ├── api/
   │   └── services/
   ├── e2e/
   │   ├── user-flows/
   │   └── admin-flows/
   ├── performance/
   ├── security/
   ├── fixtures/
   └── helpers/
   ```

2. **Naming Conventions**
   - Test files: `*.test.ts` or `*.test.tsx`
   - E2E tests: `*.e2e.test.ts`
   - Performance tests: `*.performance.test.ts`
   - Security tests: `*.security.test.ts`

3. **Test Structure**
   ```typescript
   describe('Component/Service Name', () => {
     describe('method/feature name', () => {
       it('should do something specific', () => {
         // Arrange
         // Act
         // Assert
       })
     })
   })
   ```

### Writing Effective Tests

1. **Test Independence**
   - Each test should be independent
   - Use proper setup and teardown
   - Avoid shared state between tests

2. **Clear Test Names**
   ```typescript
   // Good
   it('should return user data when valid ID is provided')
   
   // Bad
   it('should work')
   ```

3. **Comprehensive Coverage**
   - Test happy paths
   - Test error conditions
   - Test edge cases
   - Test boundary conditions

4. **Mock Strategy**
   - Mock external dependencies
   - Keep mocks simple and focused
   - Verify mock interactions when relevant

### Performance Considerations

1. **Test Speed**
   - Keep unit tests fast (< 100ms each)
   - Use parallel execution where possible
   - Optimize database operations in integration tests

2. **Resource Management**
   - Clean up test data
   - Close database connections
   - Release file handles

3. **CI Optimization**
   - Cache dependencies
   - Run tests in parallel
   - Use appropriate test timeouts

### Debugging Tests

1. **Test Debugging**
   ```bash
   # Run specific test
   npm test -- --grep "specific test name"
   
   # Run tests in debug mode
   npm run test:debug
   
   # Run with verbose output
   npm test -- --verbose
   ```

2. **Common Issues**
   - Async/await problems
   - Mock configuration errors
   - Test data conflicts
   - Timing issues in E2E tests

3. **Debugging Tools**
   - VS Code debugger integration
   - Browser developer tools for E2E tests
   - Test coverage reports
   - Performance profiling

---

This comprehensive testing guide provides the foundation for maintaining high-quality, reliable software through thorough testing practices. Regular review and updates of testing strategies ensure continued effectiveness as the system evolves.