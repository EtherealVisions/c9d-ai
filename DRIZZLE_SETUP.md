# Drizzle ORM Setup and Configuration

This document outlines the complete Drizzle ORM setup for the c9d-ai project, including migration generation, database management, and integration with our development tools.

## Overview

We use Drizzle ORM as our type-safe database toolkit with PostgreSQL. The setup includes:
- Schema definition in TypeScript
- Automatic migration generation
- Type-safe query building
- Integration with env-wrapper for environment management
- Development tools like Drizzle Studio

## Project Structure

```
apps/web/
├── lib/
│   └── db/
│       ├── connection.ts       # Database connection setup
│       ├── schema/            # Schema definitions
│       │   ├── index.ts       # Schema exports
│       │   ├── users.ts       # User-related tables
│       │   ├── bookings.ts    # Booking-related tables
│       │   └── README.md      # Schema documentation
│       └── migrations/        # Generated SQL migrations
│           ├── 0000_*.sql
│           └── meta/          # Migration metadata
├── drizzle.config.ts         # Drizzle configuration
└── package.json              # Scripts for database operations
```

## Available Commands

### From Project Root
```bash
# Generate migrations from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Push schema directly (development)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio

# Introspect existing database
pnpm db:introspect

# Drop all tables (careful!)
pnpm db:drop
```

### With Arguments
```bash
# Generate named migration
pnpm db:generate -- --name add_user_role

# Run specific migration
pnpm db:migrate -- --up-to 0001

# View help for any command
pnpm db:generate -- --help
```

## Environment Configuration

### Required Environment Variables
```bash
# .env.development
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DIRECT_URL=postgresql://user:password@localhost:5432/dbname  # For migrations
```

### How env-wrapper Works
Our database commands use `env-wrapper` to automatically load environment variables:

```json
{
  "scripts": {
    "db:generate": "env-wrapper -- drizzle-kit generate",
    "db:migrate": "env-wrapper -- drizzle-kit migrate",
    "db:push": "env-wrapper -- drizzle-kit push",
    "db:studio": "env-wrapper -- drizzle-kit studio"
  }
}
```

The `env-wrapper` command:
1. Loads environment variables from `.env.development` or `.env.production`
2. Executes the specified command with those variables
3. Passes any additional arguments to the command

## Development Workflow

### 1. Define/Update Schema
```typescript
// apps/web/lib/db/schema/users.ts
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Export types
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
```

### 2. Generate Migration
```bash
# Generate migration from schema changes
pnpm db:generate

# Or with a descriptive name
pnpm db:generate -- --name add_user_profile
```

### 3. Apply Migration
```bash
# Apply all pending migrations
pnpm db:migrate

# In development, you can also use push
pnpm db:push
```

### 4. Use in Application
```typescript
import { db } from '@/lib/db/connection'
import { users, NewUser } from '@/lib/db/schema'

// Create user
const newUser: NewUser = {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
}

const [user] = await db.insert(users).values(newUser).returning()

// Query users
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true))
```

## VS Code Tips

### Quick Actions
- **Ctrl/Cmd + Shift + P** → "Tasks: Run Task" → Select database task
- **Terminal** → Run Task → Select from dropdown

### SQL Syntax Highlighting
VS Code automatically highlights `.sql` files in the migrations folder.

### TypeScript IntelliSense
Types are automatically generated and available throughout your application.

## Deployment Considerations

### 1. Production Migrations
```bash
# Set production environment
NODE_ENV=production pnpm db:migrate

# Or use direct command with production URL
DATABASE_URL="production-url" pnpm db:migrate:raw
```

### 2. Migration Strategy
- **Development**: Use `db:push` for rapid iteration
- **Staging/Production**: Always use `db:migrate` for version control
- **CI/CD**: Run migrations as part of deployment pipeline

### 3. Rollback Plan
```bash
# Generate down migration
pnpm db:generate -- --down

# Apply specific migration
pnpm db:migrate -- --up-to <migration-number>
```

### 4. Best Practices
1. **Review generated SQL** before applying to production
2. **Backup database** before major migrations
3. **Test migrations** in staging environment
4. **Test migrations locally first** - Before deploying to production
5. **Version control migrations** - Commit generated SQL files

## Troubleshooting

### Command Not Found
```bash
# Ensure you're in the project root
pwd  # Should show /path/to/c9d-ai

# Or run from web app directory
cd apps/web && pnpm db:generate
```

### Environment Variables Not Loading
```bash
# Check env-wrapper is built
pnpm --filter @c9d/env-tools build

# Verify environment file exists
ls -la apps/web/.env.development

# Test env-wrapper directly
pnpm exec env-wrapper -- env | grep DATABASE_URL
```

### Type Generation Issues
```bash
# Clean and regenerate
rm -rf node_modules/.cache

# Regenerate types
pnpm db:generate

# Ensure build is fresh
pnpm --filter @c9d/web build
```

### Connection Issues
```bash
# Verify environment variables
pnpm validate-env

# Test with raw command to isolate issues
cd apps/web && DATABASE_URL="your-url" pnpm db:studio:raw

# Test connection
pnpm --filter @c9d/web db:health
```

### Passing Arguments
```bash
# Arguments are passed directly to drizzle-kit
pnpm db:generate --help     # Shows drizzle-kit help
pnpm db:generate --name migration_name  # Creates named migration

# Note: env-wrapper uses -- internally to separate its args from the command
# This is handled automatically in the npm scripts
```

## Testing with Drizzle

### Parallel Test Execution

Our testing philosophy emphasizes real infrastructure with parallel execution:

```typescript
// test-helpers/unique-data.ts
export function generateTestEmail(prefix: string): string {
  const timestamp = Date.now()
  const random = crypto.randomUUID()
  return `${prefix}-${timestamp}-${random}@test.example.com`
}

// Always clean up test data
afterEach(async () => {
  await db.delete(users).where(sql`email LIKE '%@test.example.com'`)
})
```

### Integration Test Example

```typescript
// __tests__/integration/user-service.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db/connection'
import { users } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

describe('User Service Integration', () => {
  let testId: string
  
  beforeEach(() => {
    testId = `${Date.now()}_${crypto.randomUUID()}`
  })
  
  afterEach(async () => {
    // Clean up only this test's data
    await db.delete(users).where(sql`email LIKE ${'%' + testId + '%'}`)
  })
  
  test('creates user in real database', async () => {
    const [user] = await db.insert(users).values({
      email: `test-${testId}@example.com`,
      clerkId: `clerk_${testId}`,
      role: 'PARENT',
    }).returning()
    
    expect(user.id).toBeDefined()
    expect(user.email).toContain(testId)
  })
})
```

### Vitest Configuration for Parallel Tests

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Enable parallel execution
      }
    },
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
  },
})
```

### E2E Test Example

```typescript
// __tests__/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test'
import { db } from '@/lib/db/connection'
import { users, bookings } from '@/lib/db/schema'

test.describe('Booking Flow', () => {
  test('creates booking with real database', async ({ page }) => {
    // Create unique test user
    const testId = `${Date.now()}_${crypto.randomUUID()}`
    const [user] = await db.insert(users).values({
      email: `parent-${testId}@test.example.com`,
      clerkId: `clerk_${testId}`,
      role: 'PARENT',
    }).returning()
    
    // Test with real authentication
    await page.goto('/login')
    // ... rest of test
    
    // Cleanup
    await db.delete(bookings).where(eq(bookings.parentId, user.id))
    await db.delete(users).where(eq(users.id, user.id))
  })
})
```

## Summary

The Drizzle ORM setup is configured and working correctly with:
- ✅ Environment variable loading via env-wrapper
- ✅ PostgreSQL connection with proper pooling
- ✅ Schema definitions in `apps/web/lib/db/schema/`
- ✅ Migration generation and application
- ✅ TypeScript type safety with inferred types
- ✅ Development tools (Drizzle Studio)
- ✅ Integration with pnpm monorepo
- ✅ VS Code integration with tasks
- ✅ Deployment considerations
- ✅ Parallel test execution with real infrastructure
- ✅ Idempotent test patterns

## Additional Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Project Schema Documentation](apps/web/lib/db/schema/README.md)
- [Database Design Patterns](docs/database-design.md)
- [Parallel Testing Guide](.cursor/agents/parallel-testing-agent.md)