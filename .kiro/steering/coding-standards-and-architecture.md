# Coding Standards & Architectural Guidelines

## Overview
This document defines coding standards, architectural patterns, and best practices for the C9D AI platform built with Next.js, React, TypeScript, Supabase, Clerk, Redis, and Vercel.

## Tech Stack Architecture

### Core Technologies
- **Frontend**: Next.js 15+ with React 19+, TypeScript 5+
- **Authentication**: Clerk for user management and auth
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Caching**: Redis for session and application caching
- **Deployment**: Vercel with edge functions
- **Styling**: Tailwind CSS with shadcn/ui components
- **Testing**: Vitest for unit/integration, Playwright for E2E
- **Monorepo**: Turborepo with pnpm workspaces

### Project Structure
```
apps/web/                 # Main Next.js application
├── app/                  # App Router pages and API routes
├── components/           # React components
├── lib/                  # Core business logic
│   ├── models/          # Database models and types
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   └── validation/      # Zod schemas
├── hooks/               # Custom React hooks
└── __tests__/           # Test files
packages/                # Shared packages
├── ui/                  # Shared UI components
├── types/               # Shared TypeScript types
└── config/              # Configuration utilities
```

## TypeScript Standards

### Type Definitions
- Use strict TypeScript configuration with `strict: true`
- Prefer `interface` over `type` for object shapes
- Use `type` for unions, primitives, and computed types
- Always define return types for functions
- Use generic constraints with `extends` keyword
- Avoid `any` - use `unknown` or proper typing instead

### Naming Conventions
- **Files**: kebab-case (`user-service.ts`)
- **Components**: PascalCase (`UserProfile.tsx`)
- **Functions/Variables**: camelCase (`getUserData`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`UserData`, `ApiResponse<T>`)
- **Enums**: PascalCase with descriptive prefix (`UserStatus`, `OrganizationRole`)

### Import Organization
```typescript
// 1. Node modules
import React from 'react'
import { NextRequest } from 'next/server'

// 2. Internal packages
import { ApiResponse } from '@c9d/types'
import { Button } from '@c9d/ui'

// 3. Relative imports (grouped by distance)
import { UserService } from '@/lib/services'
import { validateUser } from '../utils'
import './styles.css'
```#
# React Component Standards

### Component Architecture
- Use functional components with hooks exclusively
- Implement proper component composition over inheritance
- Keep components focused on single responsibility
- Extract custom hooks for complex state logic
- Use React.memo() for performance optimization when needed

### Component Structure
```typescript
interface ComponentProps {
  // Props interface always defined first
  userId: string
  onUpdate?: (user: User) => void
  className?: string
}

export function UserProfile({ userId, onUpdate, className }: ComponentProps) {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [user, setUser] = useState<User | null>(null)
  const { isLoading, error } = useUserData(userId)
  
  // 2. Event handlers
  const handleUpdate = useCallback((updatedUser: User) => {
    setUser(updatedUser)
    onUpdate?.(updatedUser)
  }, [onUpdate])
  
  // 3. Effects
  useEffect(() => {
    // Effect logic
  }, [userId])
  
  // 4. Early returns
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!user) return null
  
  // 5. Render
  return (
    <div className={cn("user-profile", className)}>
      {/* Component JSX */}
    </div>
  )
}
```

### Props and State Management
- Always define explicit prop interfaces
- Use optional props with `?` and provide defaults
- Prefer controlled components over uncontrolled
- Use `useCallback` for event handlers passed as props
- Implement proper prop drilling alternatives (Context, Zustand)

## Next.js App Router Patterns

### Route Organization
- Use App Router exclusively (no Pages Router)
- Implement proper route groups with `(group)` syntax
- Use parallel routes `@slot` for complex layouts
- Implement intercepting routes `(.)` for modals
- Follow RESTful API route conventions

### API Route Standards
```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { UserService } from '@/lib/services'
import { ApiError, handleApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await UserService.getById(params.id)
    return NextResponse.json({ data: user })
    
  } catch (error) {
    return handleApiError(error)
  }
}
```

### Server Components vs Client Components
- Default to Server Components for data fetching
- Use Client Components only when needed (interactivity, hooks, browser APIs)
- Mark Client Components with `'use client'` directive
- Implement proper data fetching patterns with async/await
- Use Suspense boundaries for loading states

## Database & Supabase Patterns

### Model Definitions
```typescript
// lib/models/user.ts
export interface UserRow {
  id: string
  clerk_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserInsert extends Omit<UserRow, 'id' | 'created_at' | 'updated_at'> {}
export interface UserUpdate extends Partial<UserInsert> {}
```

### Service Layer Pattern
```typescript
// lib/services/user-service.ts
export class UserService {
  private static supabase = createSupabaseClient()
  
  static async getById(id: string): Promise<UserRow | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new DatabaseError('Failed to fetch user', error)
    return data
  }
  
  static async create(user: UserInsert): Promise<UserRow> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    
    if (error) throw new DatabaseError('Failed to create user', error)
    return data
  }
}
```

### Row Level Security (RLS)
- Always enable RLS on all tables
- Implement proper policies for each user role
- Use Clerk user ID for user identification in policies
- Test RLS policies thoroughly in development
- Document policy logic and access patterns#
# Authentication & Authorization (Clerk)

### Clerk Integration Patterns
```typescript
// Server-side auth check
import { auth } from '@clerk/nextjs/server'

export async function getServerSideProps() {
  const { userId, orgId } = auth()
  if (!userId) redirect('/sign-in')
  
  // Fetch user-specific data
  return { props: { userId, orgId } }
}

// Client-side auth hook
import { useAuth, useUser } from '@clerk/nextjs'

export function useAuthenticatedUser() {
  const { isLoaded, userId } = useAuth()
  const { user } = useUser()
  
  if (!isLoaded) return { isLoading: true }
  if (!userId) return { isAuthenticated: false }
  
  return { isAuthenticated: true, user, userId }
}
```

### Permission-Based Access Control
```typescript
// lib/services/rbac-service.ts
export class RBACService {
  static async hasPermission(
    userId: string,
    organizationId: string,
    permission: string
  ): Promise<boolean> {
    // Check user's role permissions in organization
    const membership = await this.getUserMembership(userId, organizationId)
    if (!membership) return false
    
    const role = await this.getRole(membership.role_id)
    return role?.permissions.includes(permission) ?? false
  }
  
  static requirePermission(permission: string) {
    return async (userId: string, orgId: string) => {
      const hasAccess = await this.hasPermission(userId, orgId, permission)
      if (!hasAccess) {
        throw new ForbiddenError(`Missing permission: ${permission}`)
      }
    }
  }
}
```

## Error Handling Standards

### Error Types and Hierarchy
```typescript
// lib/errors/base.ts
export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly isOperational: boolean
  
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true
}

export class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly isOperational = true
}

export class DatabaseError extends AppError {
  readonly statusCode = 500
  readonly isOperational = true
}
```

### API Error Handling
```typescript
// lib/errors/api-handler.ts
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.name },
      { status: error.statusCode }
    )
  }
  
  // Log unexpected errors
  console.error('Unexpected API error:', error)
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### Client-Side Error Boundaries
```typescript
// components/error-boundary.tsx
export class ErrorBoundary extends Component<PropsWithChildren, ErrorState> {
  constructor(props: PropsWithChildren) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error: Error): ErrorState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    console.error('Error boundary caught error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    
    return this.props.children
  }
}
```

## Testing Standards

### Test Organization
```
__tests__/
├── unit/                 # Unit tests for individual functions/components
├── integration/          # Integration tests for API routes and services
├── e2e/                 # End-to-end tests with real user flows
├── performance/         # Performance and load tests
└── setup/               # Test configuration and mocks
```

### Unit Testing with Vitest
```typescript
// __tests__/unit/user-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService } from '@/lib/services'
import { createMockSupabaseClient } from '../setup/mocks'

vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => createMockSupabaseClient()
}))

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('getById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
          })
        })
      })
      
      const result = await UserService.getById('1')
      expect(result).toEqual(mockUser)
    })
    
    it('should throw error when user not found', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: null, 
              error: { message: 'Not found' } 
            })
          })
        })
      })
      
      await expect(UserService.getById('1')).rejects.toThrow('Failed to fetch user')
    })
  })
})
```#
## Integration Testing
```typescript
// __tests__/integration/auth-flow.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '../setup/test-client'
import { seedTestData, cleanupTestData } from '../setup/test-data'

describe('Authentication Flow Integration', () => {
  beforeAll(async () => {
    await seedTestData()
  })
  
  afterAll(async () => {
    await cleanupTestData()
  })
  
  it('should complete full user registration flow', async () => {
    const client = createTestClient()
    
    // Test user registration
    const registerResponse = await client.post('/api/auth/register', {
      email: 'test@example.com',
      password: 'securePassword123'
    })
    expect(registerResponse.status).toBe(201)
    
    // Test user login
    const loginResponse = await client.post('/api/auth/login', {
      email: 'test@example.com',
      password: 'securePassword123'
    })
    expect(loginResponse.status).toBe(200)
    expect(loginResponse.data).toHaveProperty('token')
    
    // Test protected route access
    const profileResponse = await client.get('/api/user/profile', {
      headers: { Authorization: `Bearer ${loginResponse.data.token}` }
    })
    expect(profileResponse.status).toBe(200)
    expect(profileResponse.data.email).toBe('test@example.com')
  })
})
```

### E2E Testing with Playwright
```typescript
// __tests__/e2e/user-organization-flow.e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('User Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test user and login
    await page.goto('/sign-in')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="sign-in-button"]')
    await expect(page).toHaveURL('/dashboard')
  })
  
  test('should create and manage organization', async ({ page }) => {
    // Navigate to organization creation
    await page.click('[data-testid="create-organization"]')
    await expect(page).toHaveURL('/organizations/new')
    
    // Fill organization form
    await page.fill('[data-testid="org-name"]', 'Test Organization')
    await page.fill('[data-testid="org-description"]', 'Test description')
    await page.click('[data-testid="create-org-button"]')
    
    // Verify organization created
    await expect(page).toHaveURL(/\/organizations\/[a-z0-9-]+/)
    await expect(page.locator('[data-testid="org-name"]')).toContainText('Test Organization')
    
    // Test member invitation
    await page.click('[data-testid="invite-member"]')
    await page.fill('[data-testid="invite-email"]', 'member@example.com')
    await page.selectOption('[data-testid="member-role"]', 'Member')
    await page.click('[data-testid="send-invitation"]')
    
    // Verify invitation sent
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Invitation sent successfully')
  })
})
```

### Performance Testing
```typescript
// __tests__/performance/permission-performance.test.ts
import { describe, it, expect } from 'vitest'
import { performance } from 'perf_hooks'
import { RBACService } from '@/lib/services'

describe('Permission Check Performance', () => {
  it('should check permissions within acceptable time limits', async () => {
    const userId = 'test-user-id'
    const orgId = 'test-org-id'
    const permission = 'user.read'
    
    const startTime = performance.now()
    
    // Run permission check multiple times
    const promises = Array.from({ length: 100 }, () =>
      RBACService.hasPermission(userId, orgId, permission)
    )
    
    await Promise.all(promises)
    
    const endTime = performance.now()
    const averageTime = (endTime - startTime) / 100
    
    // Should complete within 10ms on average
    expect(averageTime).toBeLessThan(10)
  })
  
  it('should handle concurrent permission checks efficiently', async () => {
    const startTime = performance.now()
    
    // Simulate concurrent users checking permissions
    const concurrentChecks = Array.from({ length: 50 }, (_, i) =>
      RBACService.hasPermission(`user-${i}`, 'org-1', 'user.read')
    )
    
    await Promise.all(concurrentChecks)
    
    const endTime = performance.now()
    const totalTime = endTime - startTime
    
    // Should handle 50 concurrent checks within 500ms
    expect(totalTime).toBeLessThan(500)
  })
})
```

## Performance & Optimization

### React Performance
- Use React.memo() for expensive components
- Implement proper dependency arrays in useEffect and useCallback
- Use useMemo() for expensive calculations
- Avoid creating objects/functions in render
- Implement proper key props for lists
- Use Suspense for code splitting and lazy loading

### Next.js Optimization
- Implement proper image optimization with next/image
- Use dynamic imports for code splitting
- Implement proper caching strategies (ISR, SSG, SSR)
- Optimize bundle size with proper tree shaking
- Use edge functions for geographically distributed logic

### Database Performance
- Implement proper indexing strategies
- Use connection pooling
- Implement query optimization and explain plans
- Use read replicas for read-heavy operations
- Implement proper caching layers (Redis)

### Caching Strategies
```typescript
// lib/cache/redis-client.ts
export class CacheService {
  private static redis = createRedisClient()
  
  static async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }
  
  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }
  
  static async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
}
```## Securi
ty Best Practices

### Input Validation
```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name required').max(50),
  lastName: z.string().min(1, 'Last name required').max(50),
  organizationId: z.string().uuid('Invalid organization ID')
})

export const UpdateUserSchema = CreateUserSchema.partial()

// Usage in API routes
export async function POST(request: NextRequest) {
  const body = await request.json()
  const validatedData = CreateUserSchema.parse(body) // Throws if invalid
  
  // Process validated data
  const user = await UserService.create(validatedData)
  return NextResponse.json({ data: user })
}
```

### SQL Injection Prevention
- Always use parameterized queries through Supabase client
- Never concatenate user input directly into SQL strings
- Use Supabase's built-in query builder for type safety
- Validate and sanitize all user inputs

### XSS Prevention
- Use React's built-in XSS protection (JSX escaping)
- Sanitize HTML content with libraries like DOMPurify
- Implement proper Content Security Policy (CSP)
- Validate and escape user-generated content

### CSRF Protection
- Use Clerk's built-in CSRF protection
- Implement proper SameSite cookie settings
- Use HTTPS in production environments
- Validate origin headers for sensitive operations

## Deployment & DevOps

### Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/health",
      "destination": "/api/health"
    }
  ]
}
```

### Environment Management
```typescript
// lib/config/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  REDIS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url()
})

export const env = EnvSchema.parse(process.env)
```

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:run
      - run: pnpm build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Code Quality & Linting

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "error",
    "no-var": "error",
    "react-hooks/exhaustive-deps": "error",
    "react/prop-types": "off"
  }
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

## Documentation Standards

### Code Documentation
- Use JSDoc comments for all public functions and classes
- Document complex business logic with inline comments
- Maintain README files for each package/module
- Document API endpoints with OpenAPI/Swagger
- Keep documentation up-to-date with code changes

### API Documentation
```typescript
/**
 * Creates a new user in the system
 * @param userData - The user data to create
 * @returns Promise resolving to the created user
 * @throws {ValidationError} When user data is invalid
 * @throws {DatabaseError} When database operation fails
 * @example
 * ```typescript
 * const user = await UserService.create({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe'
 * })
 * ```
 */
export async function createUser(userData: UserInsert): Promise<UserRow> {
  // Implementation
}
```

## Monitoring & Observability

### Error Tracking
- Implement proper error logging with structured data
- Use error tracking services (Sentry, LogRocket)
- Monitor API response times and error rates
- Set up alerts for critical errors and performance issues

### Performance Monitoring
- Track Core Web Vitals (LCP, FID, CLS)
- Monitor database query performance
- Track API endpoint response times
- Implement proper logging for debugging

This comprehensive guide should be followed for all development work on the C9D AI platform. Regular reviews and updates to these standards ensure code quality, maintainability, and team productivity.