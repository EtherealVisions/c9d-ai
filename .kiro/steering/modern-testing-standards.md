---
inclusion: always
---

# Modern Testing Standards & Quality Assurance

## Overview
This document defines comprehensive testing standards based on proven methodologies implemented in Task 3.2. These standards ensure exceptional coverage, reliable test execution, and production-ready quality assurance.

## Testing Philosophy

### Core Principles
- **Official Testing Utilities**: Always use official testing utilities (e.g., @clerk/testing)
- **Infrastructure First**: Establish solid testing infrastructure before implementation details
- **Memory Awareness**: Optimize for memory management and parallel execution
- **Type Safety**: Full TypeScript integration with proper type checking
- **Authentic Behavior**: Test real behavior, not mocked approximations

### Quality Gates (MANDATORY)
Before any task or feature is considered complete, it MUST pass all quality gates:

1. **Zero TypeScript Errors**: `pnpm typecheck` must pass with no errors
2. **Successful Build**: `pnpm build` must complete successfully  
3. **Infrastructure Stability**: Tests must execute without memory crashes
4. **Official Utilities**: Use official testing utilities for external dependencies
5. **Coverage Framework**: Coverage collection must be operational
6. **Memory Management**: Proper NODE_OPTIONS configuration

## Test Infrastructure Requirements

### Memory Management (MANDATORY)
All test commands MUST include proper memory allocation:

```json
// package.json - REQUIRED memory configuration
{
  "scripts": {
    "test": "NODE_OPTIONS=\"--max-old-space-size=8192\" vitest run",
    "test:coverage": "NODE_OPTIONS=\"--max-old-space-size=16384\" vitest run --coverage",
    "test:dev": "NODE_OPTIONS=\"--max-old-space-size=8192\" vitest --watch",
    "test:watch": "NODE_OPTIONS=\"--max-old-space-size=8192\" vitest --watch"
  }
}
```

### Vitest Configuration (MANDATORY)
```typescript
// vitest.config.ts - Memory-optimized configuration
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    
    // Memory optimization
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Prevent memory leaks
        isolate: true
      }
    },
    
    // Extended timeouts for memory management
    testTimeout: 60000,
    hookTimeout: 30000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'lib/services/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100
        },
        'lib/models/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'app/api/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
})
```

### Global Test Setup (MANDATORY)
```typescript
// vitest.setup.ts - Comprehensive setup
import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { setupCommonMocks } from './__tests__/setup/common-mocks'
import { setupClerkTesting } from './__tests__/setup/clerk-testing-setup'

// Apply common mocks
setupCommonMocks()

// Setup official testing utilities
setupClerkTesting()

// Mock accessibility context globally
vi.mock('@/contexts/accessibility-context', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => children,
  useAccessibility: vi.fn(() => ({
    isTouchDevice: false,
    isHighContrast: false,
    isReducedMotion: false,
    announce: vi.fn(),
    setFocusVisible: vi.fn(),
    focusVisible: false
  })),
  useAnnouncement: vi.fn(() => ({
    announceError: vi.fn(),
    announceSuccess: vi.fn(),
    announceLoading: vi.fn(),
    announceInfo: vi.fn()
  }))
}))

// Global cleanup
beforeEach(() => {
  // Don't clear global mocks - keep infrastructure stable
})

afterEach(() => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})
```

## Official Testing Utilities (MANDATORY)

### Clerk Integration
**CRITICAL**: Always use @clerk/testing utilities, never custom mocks.

```bash
# Required package installation
pnpm add -D @clerk/testing
```

```typescript
// __tests__/setup/clerk-testing-setup.ts
import { vi } from 'vitest'

export function setupClerkTesting() {
  vi.mock('@clerk/nextjs', async () => {
    const actual = await vi.importActual('@clerk/nextjs')
    
    return {
      ...actual,
      useAuth: vi.fn(() => ({
        isLoaded: true,
        userId: 'user_test123',
        orgId: 'org_test123',
        isSignedIn: true
      })),
      useSignIn: vi.fn(() => ({
        isLoaded: true,
        signIn: {
          create: vi.fn().mockResolvedValue({
            status: 'complete',
            createdSessionId: 'sess_test123'
          })
        },
        setActive: vi.fn().mockResolvedValue(undefined)
      }))
    }
  })
}
```

### Phase.dev Integration
**CRITICAL**: Never mock Phase.dev - always use real API calls with PHASE_SERVICE_TOKEN.

```typescript
// ✅ CORRECT: Real Phase.dev integration testing
describe('Phase.dev Integration', () => {
  beforeAll(() => {
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests')
    }
  })
  
  it('should load environment variables from Phase.dev', async () => {
    const result = await loadFromPhase()
    expect(result.success).toBe(true)
  })
})
```

## Test Organization & Structure

### Directory Structure (MANDATORY)
```
apps/web/__tests__/
├── setup/                  # Test infrastructure and configuration
│   ├── clerk-testing-setup.ts      # Official Clerk testing utilities
│   ├── common-mocks.ts             # Common mock implementations
│   ├── test-providers.tsx          # Context providers for tests
│   └── clerk-mock-test.test.tsx    # Verification tests
├── unit/                   # Unit tests for individual functions/components
├── integration/            # Integration tests for API routes and services
├── e2e/                   # End-to-end user journey tests
└── performance/           # Performance and load tests
```

### File Naming Conventions
- **Unit Tests**: `component-name.test.tsx`, `service-name.test.ts`
- **Integration Tests**: `feature-name.integration.test.ts`
- **E2E Tests**: `user-flow-name.e2e.test.ts`
- **Setup Files**: `*-setup.ts`, `*-mocks.ts`

## Component Testing Standards

### React Component Testing
```typescript
// ✅ CORRECT: Component testing with proper setup
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignInForm } from '@/components/auth/sign-in-form'

describe('SignInForm', () => {
  it('should render with Clerk integration', () => {
    // Global Clerk mocks are automatically available
    render(<SignInForm />)
    
    // Use specific test IDs for reliable selection
    expect(screen.getByTestId('sign-in-form')).toBeInTheDocument()
    expect(screen.getByTestId('email-input')).toBeInTheDocument()
    expect(screen.getByTestId('password-input')).toBeInTheDocument()
  })
  
  it('should handle form submission', async () => {
    render(<SignInForm />)
    
    // Test behavior, not implementation
    const submitButton = screen.getByTestId('sign-in-submit-button')
    expect(submitButton).toBeInTheDocument()
  })
})
```

### Test Selector Best Practices
```typescript
// ✅ CORRECT: Use specific test IDs
screen.getByTestId('sign-in-submit-button')
screen.getByTestId('email-input')

// ❌ AVOID: Ambiguous selectors
screen.getByRole('button', { name: /sign in/i }) // May match multiple elements
screen.getByLabelText(/email/i) // May be ambiguous
```

## Service Layer Testing

### Service Testing with Mocks
```typescript
// ✅ CORRECT: Service testing with proper mocks
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from '@/lib/services/user-service'
import { createMockSupabaseClient } from '../setup/common-mocks'

vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => createMockSupabaseClient()
}))

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks() // Safe to clear service-level mocks
  })
  
  it('should create user successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com' }
    const mockSupabase = createMockSupabaseClient()
    
    mockSupabase._mocks.single.mockResolvedValue({
      data: mockUser,
      error: null
    })
    
    const result = await UserService.create(mockUser)
    expect(result).toEqual(mockUser)
  })
})
```

## Coverage Standards

### Tiered Coverage Requirements
- **Services (`lib/services/**`)**: 100% coverage (critical business logic)
- **Models (`lib/models/**`)**: 95% coverage (data layer)
- **API Routes (`app/api/**`)**: 90% coverage (external interfaces)
- **Global Minimum**: 85% coverage (all other code)

### Coverage Validation
```bash
# Run coverage with proper memory allocation
NODE_OPTIONS="--max-old-space-size=16384" pnpm test --coverage

# Coverage thresholds are enforced automatically
# Build fails if thresholds not met
```

## Forbidden Patterns

### ❌ Never Do These
```typescript
// ❌ FORBIDDEN: Custom Clerk mocking
vi.mock('@clerk/nextjs', () => ({
  useSignIn: () => ({ signIn: {} }) // Incomplete, unreliable
}))

// ❌ FORBIDDEN: Clearing global mocks
beforeEach(() => {
  vi.clearAllMocks() // Breaks global infrastructure setup
})

// ❌ FORBIDDEN: Phase.dev mocking
vi.mock('phase-dev-api', () => ({
  loadFromPhase: vi.fn() // Breaks real integration testing
}))

// ❌ FORBIDDEN: Memory-unsafe test commands
"test": "vitest run" // Missing NODE_OPTIONS
```

## Validation and Compliance

### Pre-commit Validation
```bash
#!/bin/bash
# Validate test infrastructure compliance

# Check for proper NODE_OPTIONS in package.json
if ! grep -q "NODE_OPTIONS" package.json; then
  echo "❌ ERROR: Missing NODE_OPTIONS in test scripts"
  exit 1
fi

# Check for forbidden Clerk mocking
if grep -r "vi\.mock.*@clerk" __tests__/ --exclude-dir=setup; then
  echo "❌ ERROR: Custom Clerk mocking detected"
  exit 1
fi

# Validate Clerk testing setup exists
if [ ! -f "__tests__/setup/clerk-testing-setup.ts" ]; then
  echo "❌ ERROR: Missing Clerk testing setup"
  exit 1
fi

echo "✅ Test infrastructure validation passed"
```

### Infrastructure Verification Tests
```typescript
// __tests__/setup/infrastructure-verification.test.ts
import { describe, it, expect } from 'vitest'
import { useSignIn, useAuth } from '@clerk/nextjs'

describe('Test Infrastructure Verification', () => {
  it('should have working Clerk mocks', () => {
    const { signIn, isLoaded } = useSignIn()
    const { userId } = useAuth()
    
    expect(isLoaded).toBe(true)
    expect(signIn).toBeDefined()
    expect(userId).toBe('user_test123')
  })
  
  it('should have proper memory allocation', () => {
    // Verify NODE_OPTIONS is set
    const nodeOptions = process.env.NODE_OPTIONS
    expect(nodeOptions).toContain('--max-old-space-size')
  })
})
```

## Success Criteria

### Infrastructure Excellence
- ✅ Official testing utilities installed and configured
- ✅ Memory management optimized for large test suites
- ✅ Global mocks stable and reliable
- ✅ Coverage framework operational with exceptional thresholds
- ✅ No memory crashes during test execution

### Test Quality
- ✅ Components render successfully with proper context
- ✅ Service layer tests use appropriate mocking
- ✅ Integration tests use real APIs where required
- ✅ E2E tests cover critical user journeys
- ✅ Coverage thresholds enforced automatically

### Developer Experience
- ✅ Clear, consistent test patterns
- ✅ Reliable test execution across environments
- ✅ Fast feedback loops with optimized performance
- ✅ Comprehensive error messages and debugging support

## Conclusion

These modern testing standards ensure:
- **Reliability**: Tests reflect real application behavior
- **Maintainability**: Using official, supported patterns
- **Performance**: Optimized for memory and execution speed
- **Quality**: Exceptional coverage standards enforced
- **Scalability**: Framework ready for large codebases

**Always follow these standards for consistent, reliable, production-ready testing.**