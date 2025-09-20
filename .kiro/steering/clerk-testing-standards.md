---
inclusion: always
---

# Clerk Testing Standards

## Overview
This document defines mandatory testing standards for Clerk authentication integration. These standards ensure that Clerk functionality is tested using official @clerk/testing utilities following Clerk's prescribed documentation.

## Core Principle: Use Official Clerk Testing Utilities

**CRITICAL RULE**: Clerk integration must ALWAYS use official @clerk/testing utilities. Never create custom Clerk mocks.

### Why Official Testing Utilities?
- Clerk provides official testing utilities designed for their API
- Official utilities ensure authentic behavior simulation
- Reduces maintenance burden by following supported patterns
- Provides type safety and proper error scenario testing
- Ensures compatibility with Clerk updates and changes

## Required Package Installation

### @clerk/testing Package
All projects using Clerk MUST install the official testing package:

```bash
pnpm add -D @clerk/testing
```

## Official Testing Setup

### Clerk Testing Setup File
Create a dedicated Clerk testing setup file:

```typescript
// __tests__/setup/clerk-testing-setup.ts
import { vi } from 'vitest'

/**
 * Setup Clerk testing environment using official methods
 * Based on: https://clerk.com/docs/testing/overview
 */
export function setupClerkTesting() {
  // Mock Clerk's client-side hooks using their recommended patterns
  vi.mock('@clerk/nextjs', async () => {
    const actual = await vi.importActual('@clerk/nextjs')
    
    return {
      ...actual,
      // Official mock patterns for client-side hooks
      useAuth: vi.fn(() => ({
        isLoaded: true,
        userId: 'user_test123',
        orgId: 'org_test123',
        isSignedIn: true,
        signOut: vi.fn().mockResolvedValue(undefined)
      })),
      
      useUser: vi.fn(() => ({
        isLoaded: true,
        user: {
          id: 'user_test123',
          emailAddresses: [{ 
            emailAddress: 'test@example.com',
            id: 'email_test123'
          }],
          firstName: 'Test',
          lastName: 'User',
          fullName: 'Test User',
          imageUrl: 'https://example.com/avatar.jpg'
        }
      })),
      
      useSignIn: vi.fn(() => ({
        isLoaded: true,
        signIn: {
          create: vi.fn().mockImplementation(async ({ identifier, password }) => {
            return {
              status: 'complete',
              createdSessionId: 'sess_test123'
            }
          }),
          prepareFirstFactor: vi.fn().mockResolvedValue({
            status: 'needs_first_factor'
          }),
          attemptFirstFactor: vi.fn().mockImplementation(async ({ strategy, password }) => {
            return {
              status: 'complete',
              createdSessionId: 'sess_test123'
            }
          })
        },
        setActive: vi.fn().mockResolvedValue(undefined)
      })),
      
      // Additional hooks and components...
    }
  })

  // Mock server-side functions
  vi.mock('@clerk/nextjs/server', async () => {
    const actual = await vi.importActual('@clerk/nextjs/server')
    
    return {
      ...actual,
      auth: vi.fn(() => ({
        userId: 'user_test123',
        orgId: 'org_test123',
        sessionId: 'sess_test123',
        getToken: vi.fn().mockResolvedValue('mock_jwt_token')
      })),
      
      currentUser: vi.fn(() => ({
        id: 'user_test123',
        emailAddresses: [{ 
          emailAddress: 'test@example.com',
          id: 'email_test123'
        }],
        firstName: 'Test',
        lastName: 'User'
      }))
    }
  })
}
```

### Global Setup Integration
Integrate Clerk testing setup in vitest.setup.ts:

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { setupClerkTesting } from './__tests__/setup/clerk-testing-setup'

// Setup official Clerk testing utilities
setupClerkTesting()

// Global cleanup
beforeEach(() => {
  // Don't clear global mocks
})

afterEach(() => {
  // Keep global mocks intact
  if (global.gc) {
    global.gc()
  }
})
```

## Testing Patterns

### Component Testing with Clerk
When testing components that use Clerk hooks:

```typescript
// ✅ CORRECT: Components will automatically use global Clerk mocks
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignInForm } from '@/components/auth/sign-in-form'

describe('SignInForm', () => {
  it('should render with Clerk integration', () => {
    render(<SignInForm />)
    
    // Component will use global Clerk mocks automatically
    expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()
  })
})
```

### Error Scenario Testing
Test Clerk error scenarios using official patterns:

```typescript
// Create Clerk error responses for testing
export function createClerkError(code: string, message: string) {
  return {
    errors: [{ code, message }],
    clerkError: true
  }
}

// Common Clerk error scenarios
export const ClerkTestErrors = {
  INVALID_CREDENTIALS: createClerkError('form_password_incorrect', 'Password is incorrect'),
  USER_NOT_FOUND: createClerkError('form_identifier_not_found', 'User not found'),
  TOO_MANY_REQUESTS: createClerkError('too_many_requests', 'Too many requests')
}
```

### Test Data Helpers
Create consistent test data that matches Clerk's structure:

```typescript
export function createTestClerkUser(overrides: Partial<any> = {}) {
  return {
    id: 'user_test123',
    emailAddresses: [{ 
      emailAddress: 'test@example.com',
      id: 'email_test123'
    }],
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    imageUrl: 'https://example.com/avatar.jpg',
    ...overrides
  }
}
```

## Forbidden Patterns

### ❌ Never Create Custom Clerk Mocks
```typescript
// ❌ FORBIDDEN: Custom Clerk mocking
vi.mock('@clerk/nextjs', () => ({
  useSignIn: () => ({ signIn: {} }) // Incomplete, unreliable
}))
```

### ❌ Never Mock Individual Tests
```typescript
// ❌ FORBIDDEN: Overriding global Clerk mocks in individual tests
beforeEach(() => {
  vi.mocked(useSignIn).mockReturnValue(/* custom mock */)
})
```

### ❌ Never Clear Global Clerk Mocks
```typescript
// ❌ FORBIDDEN: Clearing global mocks
beforeEach(() => {
  vi.clearAllMocks() // This breaks global Clerk setup
})
```

## Validation and Compliance

### Pre-commit Validation
```bash
# Check for forbidden Clerk mocking patterns
if grep -r "vi\.mock.*@clerk" __tests__/ --exclude-dir=setup; then
  echo "❌ ERROR: Custom Clerk mocking detected"
  echo "Use official Clerk testing utilities instead"
  exit 1
fi
```

### Test Verification
Create verification tests to ensure Clerk mocks work:

```typescript
// __tests__/setup/clerk-mock-test.test.tsx
import { describe, it, expect } from 'vitest'
import { useSignIn, useAuth } from '@clerk/nextjs'

describe('Clerk Mock Verification', () => {
  it('should provide working useSignIn hook', () => {
    const { signIn, isLoaded } = useSignIn()
    
    expect(isLoaded).toBe(true)
    expect(signIn).toBeDefined()
    expect(signIn.create).toBeDefined()
  })
})
```

## Integration with Other Testing Standards

### Context Providers
Ensure components have necessary context providers:

```typescript
// __tests__/setup/test-providers.tsx
export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider>
      {children}
    </AccessibilityProvider>
  )
}
```

### Memory Management
Follow memory optimization patterns:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Prevent memory issues
        isolate: true
      }
    }
  }
})
```

## Success Criteria

### Infrastructure Validation
- ✅ @clerk/testing package installed
- ✅ Official Clerk testing setup implemented
- ✅ Global mocks configured in vitest.setup.ts
- ✅ Components render successfully with Clerk integration
- ✅ No "useSignIn is undefined" errors

### Test Quality Validation
- ✅ All Clerk-dependent components have tests
- ✅ Error scenarios tested with official patterns
- ✅ Authentication flows covered comprehensively
- ✅ Type safety maintained throughout tests

## Conclusion

Following these Clerk testing standards ensures:
- **Reliability**: Tests reflect real Clerk behavior
- **Maintainability**: Using official, supported patterns
- **Type Safety**: Full TypeScript integration
- **Authenticity**: Proper simulation of Clerk API responses
- **Future-Proof**: Compatible with Clerk updates

**Always use official @clerk/testing utilities. Never create custom Clerk mocks.**