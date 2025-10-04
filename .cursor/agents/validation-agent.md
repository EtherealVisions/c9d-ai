# Code Validation Agent

## Purpose

This agent specializes in maintaining code quality, TypeScript compliance, and consistent formatting across the Coordinated.App application using Drizzle ORM.

## Validation Workflow

### Pre-Commit Checklist

1. `pnpm type-check` - Ensure no TypeScript errors
2. `pnpm lint` - Check for linting issues
3. `pnpm format` - Apply consistent formatting
4. `pnpm build` - Verify production build works
5. `pnpm test:integration` - Run integration tests with real database

### Continuous Validation

- Keep dev server running to catch errors early
- Fix issues immediately, don't accumulate technical debt
- Never use `@ts-ignore` without justification
- Test database operations with real infrastructure

## TypeScript Best Practices

### Type Definitions with Drizzle

```typescript
// ✅ Good - Use Drizzle's inferred types
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { users, bookings } from '@/lib/db/schema'

// Automatically get types from schema
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Booking = InferSelectModel<typeof bookings>
export type NewBooking = InferInsertModel<typeof bookings>

// ❌ Bad - Manually defining types that can be inferred
interface UserType {
  id: string
  email: string
  // ... duplicating schema
}

// ✅ Good - Extend inferred types when needed
export type UserWithProfile = User & {
  profile?: InferSelectModel<typeof userProfiles>
}
```

### Drizzle Query Types

```typescript
import { db } from '@/lib/db/connection'
import { users, bookings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ✅ Good - Type-safe queries with proper return types
export async function getUserWithBookings(userId: string) {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      bookings: {
        with: {
          instructor: true,
        },
      },
    },
  })
  
  // TypeScript knows the exact shape
  return result // Type is inferred correctly
}

// ✅ Good - Using select for specific fields
export async function getUserEmail(userId: string) {
  const result = await db
    .select({
      email: users.email,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
  
  return result[0] // Type: { email: string; isActive: boolean } | undefined
}
```

### Component Props with Database Types

```typescript
import type { User, Booking } from '@/lib/db/schema'

// ✅ Good - Use database types in components
interface UserProfileProps {
  user: User
  bookings: Booking[]
  onUpdate: (data: Partial<User>) => Promise<void>
}

export function UserProfile({ user, bookings, onUpdate }: UserProfileProps) {
  // Component implementation
}

// ✅ Good - Partial types for forms
interface UserFormProps {
  initialData?: Partial<User>
  onSubmit: (data: NewUser) => Promise<void>
}
```

## Validation with Drizzle-Zod

### Schema Validation

```typescript
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { users, bookings } from '@/lib/db/schema'

// Generate Zod schemas from Drizzle tables
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})

export const selectUserSchema = createSelectSchema(users)

// Customize for specific use cases
export const updateUserSchema = insertUserSchema
  .partial()
  .omit({ id: true, createdAt: true })

// Form validation
export const bookingFormSchema = createInsertSchema(bookings, {
  scheduledAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
})
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true,
    status: true, // Set server-side
  })
  .extend({
    childId: z.string().uuid('Invalid child selection'),
  })
```

## Linting Rules

### ESLint Configuration for Drizzle

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    // Ensure proper imports
    "@typescript-eslint/consistent-type-imports": ["error", {
      "prefer": "type-imports"
    }],
    
    // Prevent any types
    "@typescript-eslint/no-explicit-any": "error",
    
    // Ensure proper async/await
    "@typescript-eslint/no-floating-promises": "error",
    
    // Require return types on functions
    "@typescript-eslint/explicit-function-return-type": ["warn", {
      "allowExpressions": true,
      "allowTypedFunctionExpressions": true
    }]
  }
}
```

### Common Issues to Fix

```typescript
// ❌ Missing type imports
import { users } from '@/lib/db/schema' // Also imports value

// ✅ Separate type imports
import type { User } from '@/lib/db/schema'
import { users } from '@/lib/db/schema'

// ❌ Floating promises
db.insert(users).values(userData) // No await

// ✅ Properly await database operations
await db.insert(users).values(userData)

// ❌ Using any
const processData = (data: any) => { /* ... */ }

// ✅ Use proper types or unknown
const processData = (data: unknown) => {
  const validated = insertUserSchema.parse(data)
  // Now data is properly typed
}
```

## Error Handling Patterns

### Database Operation Validation

```typescript
import { DatabaseError } from '@/lib/errors/custom-errors'
import { z } from 'zod'

// ✅ Good - Comprehensive error handling
export async function createUser(data: unknown) {
  try {
    // Validate input
    const validatedData = insertUserSchema.parse(data)
    
    // Perform database operation
    const [user] = await db
      .insert(users)
      .values(validatedData)
      .returning()
    
    return { success: true, data: user }
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Validation failed',
        issues: error.issues 
      }
    }
    
    // Handle database errors
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string; detail?: string }
      
      if (dbError.code === '23505') { // Unique violation
        return { 
          success: false, 
          error: 'User already exists',
          field: dbError.detail?.match(/\(([^)]+)\)/)?.[1]
        }
      }
    }
    
    // Log unexpected errors
    console.error('Unexpected error creating user:', error)
    return { success: false, error: 'Internal server error' }
  }
}
```

### Type Guards

```typescript
import type { User, InstructorProfile } from '@/lib/db/schema'

// Type guard for user roles
export function isInstructor(user: User): user is User & { role: 'INSTRUCTOR' } {
  return user.role === 'INSTRUCTOR'
}

// Type guard for optional relations
export function hasInstructorProfile(
  user: User & { instructorProfile?: InstructorProfile }
): user is User & { instructorProfile: InstructorProfile } {
  return user.instructorProfile !== undefined
}

// Usage
const user = await getUserWithProfile(userId)
if (hasInstructorProfile(user)) {
  // TypeScript knows instructorProfile exists
  console.log(user.instructorProfile.hourlyRate)
}
```

## Performance Validation

### Query Optimization Checks

```typescript
// ✅ Good - Select only needed fields
const userEmails = await db
  .select({ 
    id: users.id, 
    email: users.email 
  })
  .from(users)
  .where(eq(users.isActive, true))

// ❌ Bad - Selecting entire rows when not needed
const userEmails = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true))

// ✅ Good - Use proper joins
const bookingsWithUsers = await db
  .select()
  .from(bookings)
  .innerJoin(users, eq(bookings.instructorId, users.id))
  .where(eq(bookings.status, 'CONFIRMED'))

// ❌ Bad - N+1 queries
const bookings = await db.select().from(bookings)
for (const booking of bookings) {
  const instructor = await db.select().from(users).where(eq(users.id, booking.instructorId))
}
```

### Type-Safe Transactions

```typescript
import { db } from '@/lib/db/connection'

// ✅ Good - Type-safe transaction
export async function transferBooking(
  bookingId: string, 
  newInstructorId: string
): Promise<Booking> {
  return await db.transaction(async (tx) => {
    // All operations in transaction are type-safe
    const [booking] = await tx
      .update(bookings)
      .set({ 
        instructorId: newInstructorId,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, bookingId))
      .returning()
    
    if (!booking) {
      throw new Error('Booking not found')
    }
    
    await tx.insert(auditLogs).values({
      action: 'BOOKING_TRANSFERRED',
      entityId: bookingId,
      entityType: 'booking',
      changes: { newInstructorId },
    })
    
    return booking
  })
}
```

## Testing Type Safety

### Integration Test Types

```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db/connection'
import type { User, Booking } from '@/lib/db/schema'

describe('Booking Service', () => {
  let testUser: User
  let testBooking: Booking
  
  beforeEach(async () => {
    // Type-safe test data creation
    const [user] = await db.insert(users).values({
      email: `test-${Date.now()}@example.com`,
      clerkId: `clerk_${Date.now()}`,
      firstName: 'Test',
      lastName: 'User',
      role: 'PARENT',
    }).returning()
    
    testUser = user // Type is inferred correctly
  })
  
  test('creates booking with correct types', async () => {
    const bookingData: NewBooking = {
      parentId: testUser.id,
      instructorId: testUser.id,
      childId: 'some-child-id',
      scheduledAt: new Date(),
      amount: '50.00',
      status: 'PENDING',
    }
    
    const [booking] = await db.insert(bookings).values(bookingData).returning()
    
    // TypeScript ensures all assertions are valid
    expect(booking.parentId).toBe(testUser.id)
    expect(booking.status).toBe('PENDING')
  })
})
```

## Build-Time Validation

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Pre-Push Validation

```bash
#!/bin/bash
# .husky/pre-push

echo "Running pre-push validation..."

# Type checking
pnpm type-check || {
  echo "❌ TypeScript errors found"
  exit 1
}

# Linting
pnpm lint || {
  echo "❌ Linting errors found"
  exit 1
}

# Run integration tests
pnpm test:integration || {
  echo "❌ Integration tests failed"
  exit 1
}

# Build check
pnpm build || {
  echo "❌ Build failed"
  exit 1
}

echo "✅ All validations passed"
```

## Common Validation Commands

```bash
# TypeScript validation
pnpm type-check

# Linting with auto-fix
pnpm lint --fix

# Format code
pnpm format

# Run all validations
pnpm validate-all

# Database type generation
pnpm db:generate

# Full validation with tests
pnpm type-check && pnpm lint && pnpm test:integration && pnpm build
```

## CI/CD Validation Pipeline

### GitHub Actions

```yaml
name: Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Generate Drizzle types
        run: pnpm db:generate
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Run migrations on test DB
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Integration tests
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Build
        run: pnpm build
```