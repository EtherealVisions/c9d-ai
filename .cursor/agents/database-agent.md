# Database Management Agent

## Purpose

This agent specializes in database schema design, Drizzle ORM operations, and migration management for the Coordinated.App application.

## Core Responsibilities

### Schema Design

- Design efficient database schemas following Drizzle and PostgreSQL best practices
- Ensure proper indexing for performance
- Implement appropriate relationships and constraints
- Use appropriate field types and modifiers
- Follow snake_case naming conventions for database compatibility

### Migration Workflow

1. Always check current schema before making changes
2. Modify schema files in `apps/web/lib/db/schema/`
3. Use `pnpm db:generate` to create migration SQL
4. Review generated migrations in `apps/web/lib/db/migrations/`
5. Test with `pnpm db:push` in development
6. Apply with `pnpm db:migrate` when ready
7. Document breaking changes

### Code Patterns

#### Schema Definition

```typescript
// apps/web/lib/db/schema/users.ts
import { pgTable, text, timestamp, boolean, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role', { enum: ['PARENT', 'INSTRUCTOR', 'ADMIN'] }).notNull().default('PARENT'),
  isActive: boolean('is_active').notNull().default(true),
  hasVerifiedEmail: boolean('has_verified_email').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => {
  return {
    clerkIdIdx: index('idx_users_clerk_id').on(table.clerkId),
    emailIdx: index('idx_users_email').on(table.email),
    roleIdx: index('idx_users_role').on(table.role),
    createdAtIdx: index('idx_users_created_at').on(table.createdAt),
  }
})

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  parentProfile: one(parentProfiles, {
    fields: [users.id],
    references: [parentProfiles.userId],
  }),
  instructorProfile: one(instructorProfiles, {
    fields: [users.id],
    references: [instructorProfiles.userId],
  }),
  bookings: many(bookings),
}))

// Type exports
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
```

#### Database Connection

```typescript
// apps/web/lib/db/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// For query purposes
const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema })

// For migrations (requires different options)
export const migrationClient = postgres(connectionString, { max: 1 })
```

#### Query Patterns

```typescript
// Use the db instance with proper error handling
import { db } from '@/lib/db/connection'
import { users, bookings } from '@/lib/db/schema'
import { eq, and, gte, desc } from 'drizzle-orm'

// Simple query with error handling
export async function getUserById(id: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        parentProfile: true,
        instructorProfile: true,
      },
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return user
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw error
  }
}

// Complex query with joins
export async function getUpcomingBookings(instructorId: string) {
  try {
    const results = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.instructorId, instructorId),
          eq(bookings.status, 'CONFIRMED'),
          gte(bookings.scheduledAt, new Date())
        )
      )
      .orderBy(desc(bookings.scheduledAt))
      .limit(10)
    
    return results
  } catch (error) {
    console.error('Failed to fetch bookings:', error)
    throw error
  }
}

// Transaction example
export async function transferBooking(bookingId: string, newInstructorId: string) {
  return await db.transaction(async (tx) => {
    // Update booking
    const [booking] = await tx
      .update(bookings)
      .set({ 
        instructorId: newInstructorId,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, bookingId))
      .returning()
    
    // Create audit log
    await tx.insert(auditLogs).values({
      action: 'BOOKING_TRANSFERRED',
      entityId: bookingId,
      entityType: 'booking',
      metadata: { newInstructorId },
    })
    
    return booking
  })
}
```

## Testing with Real Infrastructure

### Integration Test Patterns

```typescript
// __tests__/integration/user-service.test.ts
import { db } from '@/lib/db/connection'
import { users } from '@/lib/db/schema'
import { createUser, updateUser } from '@/lib/services/user-service'
import { sql } from 'drizzle-orm'

describe('UserService Integration Tests', () => {
  // Use real database connection
  beforeEach(async () => {
    // Clean specific test data (idempotent)
    await db.delete(users).where(sql`email LIKE '%@test.example.com'`)
  })

  afterEach(async () => {
    // Clean up after each test
    await db.delete(users).where(sql`email LIKE '%@test.example.com'`)
  })

  test('createUser creates user in database', async () => {
    // Arrange
    const userData = {
      email: 'test-' + Date.now() + '@test.example.com',
      clerkId: 'clerk_test_' + Date.now(),
      firstName: 'Test',
      lastName: 'User',
    }

    // Act
    const user = await createUser(userData)

    // Assert - verify in real database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    })
    
    expect(dbUser).toBeTruthy()
    expect(dbUser?.email).toBe(userData.email)
    expect(dbUser?.clerkId).toBe(userData.clerkId)
  })

  test('concurrent user creation handles unique constraints', async () => {
    const email = 'concurrent-' + Date.now() + '@test.example.com'
    const clerkId = 'clerk_concurrent_' + Date.now()
    
    // Run in parallel
    const results = await Promise.allSettled([
      createUser({ email, clerkId, firstName: 'Test1' }),
      createUser({ email, clerkId, firstName: 'Test2' }),
      createUser({ email, clerkId, firstName: 'Test3' }),
    ])
    
    // Only one should succeed
    const successes = results.filter(r => r.status === 'fulfilled')
    const failures = results.filter(r => r.status === 'rejected')
    
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(2)
  })
})
```

### Migration Testing

```typescript
// scripts/test-migrations.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

export async function testMigrations() {
  const testDbUrl = process.env.TEST_DATABASE_URL!
  const sql = postgres(testDbUrl, { max: 1 })
  const db = drizzle(sql)
  
  try {
    // Run migrations on test database
    await migrate(db, { migrationsFolder: './apps/web/lib/db/migrations' })
    
    // Verify schema
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    console.log('Migration successful. Tables:', tables)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await sql.end()
  }
}
```

## Environment Variables

Always use environment variables for database connections:

```bash
# .env.example
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/coordinated_dev

# Direct connection for migrations (no pooling)
DIRECT_URL=postgresql://user:password@localhost:5432/coordinated_dev

# Test database for parallel testing
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/coordinated_test
```

## Common Tasks

### Adding a New Table

1. Create schema file in `apps/web/lib/db/schema/`
2. Define table with proper types and constraints
3. Add relations if needed
4. Export types
5. Run `pnpm db:generate` to create migration
6. Review generated SQL
7. Run `pnpm db:push` to test
8. Update seed data if needed

### Modifying Existing Tables

1. Check for breaking changes
2. Consider data migration needs
3. Update schema file
4. Generate and review migration
5. Test with existing data
6. Plan deployment strategy

### Performance Optimization

```typescript
// Add indexes for frequently queried fields
export const bookings = pgTable('bookings', {
  // ... columns
}, (table) => {
  return {
    // Single column indexes
    instructorIdx: index('idx_bookings_instructor_id').on(table.instructorId),
    statusIdx: index('idx_bookings_status').on(table.status),
    scheduledAtIdx: index('idx_bookings_scheduled_at').on(table.scheduledAt),
    
    // Composite indexes for common queries
    instructorStatusIdx: index('idx_bookings_instructor_status')
      .on(table.instructorId, table.status),
    parentScheduledIdx: index('idx_bookings_parent_scheduled')
      .on(table.parentId, table.scheduledAt),
  }
})
```

## Error Handling

```typescript
import { DatabaseError } from '@/lib/errors/custom-errors'

export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Check for specific Postgres error codes
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string; detail?: string }
      
      switch (pgError.code) {
        case '23505': // Unique violation
          throw new DatabaseError('Duplicate entry', 'UNIQUE_VIOLATION', pgError.detail)
        case '23503': // Foreign key violation
          throw new DatabaseError('Invalid reference', 'FOREIGN_KEY_VIOLATION', pgError.detail)
        case '23502': // Not null violation
          throw new DatabaseError('Required field missing', 'NOT_NULL_VIOLATION', pgError.detail)
        default:
          throw new DatabaseError(errorMessage, pgError.code)
      }
    }
    
    throw new DatabaseError(errorMessage, 'UNKNOWN_ERROR')
  }
}
```

## Security Considerations

- Never expose database connection strings
- Use parameterized queries (Drizzle handles this)
- Implement Row Level Security (RLS) at database level
- Validate all input before database operations
- Use transactions for data consistency
- Implement proper access control at query level
- Sanitize error messages for production