# Parallel Testing Agent

## Purpose

This agent specializes in ensuring tests can run in parallel without conflicts, maintaining idempotent test patterns, and optimizing test execution speed while using real infrastructure.

## Core Principles

### Idempotent Test Data

Every test must create unique, non-conflicting data:

```typescript
// ✅ Good - Unique identifiers prevent conflicts
export function generateTestEmail(prefix: string): string {
  const timestamp = Date.now()
  const random = crypto.randomUUID()
  return `${prefix}-${timestamp}-${random}@test.example.com`
}

export function generateTestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

// ❌ Bad - Static data causes conflicts
const testEmail = 'test@example.com' // Will conflict in parallel runs
```

### Database Isolation Strategies

#### Strategy 1: Unique Data Per Test

```typescript
import { db } from '@/lib/db/connection'
import { users, bookings } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

describe('Booking Service - Parallel Safe', () => {
  let testIdentifier: string
  
  beforeEach(() => {
    // Unique identifier for this test run
    testIdentifier = `test_${Date.now()}_${crypto.randomUUID()}`
  })
  
  afterEach(async () => {
    // Clean up only this test's data
    await db.delete(users).where(
      sql`email LIKE ${`%-${testIdentifier}@test.example.com`}`
    )
  })
  
  test('creates booking without conflicts', async () => {
    // Create test user with unique identifier
    const [user] = await db.insert(users).values({
      email: `user-${testIdentifier}@test.example.com`,
      clerkId: `clerk_${testIdentifier}`,
      firstName: 'Test',
      lastName: 'User',
    }).returning()
    
    // Test continues with guaranteed unique data...
  })
})
```

#### Strategy 2: Schema Isolation (PostgreSQL)

```typescript
// test-helpers/schema-isolation.ts
import { db } from '@/lib/db/connection'
import { sql } from 'drizzle-orm'

export class TestSchema {
  private schemaName: string
  
  constructor() {
    // Unique schema per test file
    this.schemaName = `test_${Date.now()}_${process.pid}_${Math.random().toString(36).substring(7)}`
  }
  
  async setup() {
    // Create isolated schema
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(this.schemaName)}`)
    await db.execute(sql`SET search_path TO ${sql.identifier(this.schemaName)}`)
    
    // Run migrations in test schema
    const { migrate } = await import('drizzle-orm/postgres-js/migrator')
    await migrate(db, { 
      migrationsFolder: './lib/db/migrations',
      migrationsSchema: this.schemaName 
    })
  }
  
  async teardown() {
    // Clean up entire schema
    await db.execute(sql`DROP SCHEMA IF EXISTS ${sql.identifier(this.schemaName)} CASCADE`)
    await db.execute(sql`SET search_path TO public`)
  }
}

// Usage in tests
describe('Complex Integration Test', () => {
  const testSchema = new TestSchema()
  
  beforeAll(() => testSchema.setup())
  afterAll(() => testSchema.teardown())
  
  // Tests run in complete isolation
})
```

### Playwright Parallel Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // Enable full parallelization
  fullyParallel: true,
  
  // Fail fast in CI to save resources
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  
  // Optimal worker configuration
  workers: process.env.CI ? 4 : undefined,
  
  // Shard tests across multiple machines in CI
  ...(process.env.CI && {
    shard: {
      total: parseInt(process.env.TOTAL_SHARDS || '1'),
      current: parseInt(process.env.CURRENT_SHARD || '1'),
    }
  }),
  
  use: {
    // Ensure each test gets fresh context
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    
    // Unique storage state per worker
    storageState: undefined,
    
    // Capture traces only on failure
    trace: 'retain-on-failure',
    
    // Video only on failure to save space
    video: 'retain-on-failure',
  },
  
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
})
```

### Vitest Parallel Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    
    // Use process isolation for true parallelism
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        // Isolate each test file
        isolate: true,
      }
    },
    
    // Optimal for CI environments
    maxConcurrency: process.env.CI ? 4 : undefined,
    
    // Timeout for database operations
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Reporter for parallel output
    reporters: process.env.CI 
      ? ['junit', 'json'] 
      : ['verbose'],
    
    // Output file for CI
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json',
    },
  },
})
```

## Test Data Patterns

### User Creation Helpers

```typescript
// test-helpers/user-factory.ts
import { db } from '@/lib/db/connection'
import { users, instructorProfiles } from '@/lib/db/schema'

export class TestUserFactory {
  private testRun: string
  
  constructor() {
    this.testRun = `${Date.now()}-${process.pid}`
  }
  
  async createParent(overrides?: Partial<NewUser>) {
    const uniqueId = crypto.randomUUID()
    const [user] = await db.insert(users).values({
      email: `parent-${uniqueId}-${this.testRun}@test.example.com`,
      clerkId: `clerk_parent_${uniqueId}`,
      firstName: 'Test',
      lastName: 'Parent',
      role: 'PARENT',
      ...overrides,
    }).returning()
    
    return user
  }
  
  async createInstructor(overrides?: Partial<NewUser>) {
    const uniqueId = crypto.randomUUID()
    const [user] = await db.insert(users).values({
      email: `instructor-${uniqueId}-${this.testRun}@test.example.com`,
      clerkId: `clerk_instructor_${uniqueId}`,
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'INSTRUCTOR',
      ...overrides,
    }).returning()
    
    // Also create instructor profile
    await db.insert(instructorProfiles).values({
      userId: user.id,
      bio: 'Test instructor',
      hourlyRate: '50.00',
    })
    
    return user
  }
  
  async cleanup() {
    // Clean all test data from this run
    await db.delete(users).where(
      sql`email LIKE ${'%' + this.testRun + '@test.example.com'}`
    )
  }
}
```

### Booking Test Patterns

```typescript
// test-helpers/booking-factory.ts
export class TestBookingFactory {
  constructor(private testRun: string) {}
  
  async createBookingScenario() {
    // Create complete test scenario
    const parent = await this.createParent()
    const instructor = await this.createInstructor()
    const child = await this.createChild(parent.id)
    
    // Use future dates to avoid conflicts
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(14, 0, 0, 0)
    
    const [booking] = await db.insert(bookings).values({
      parentId: parent.id,
      instructorId: instructor.id,
      childId: child.id,
      scheduledAt: tomorrow,
      status: 'CONFIRMED',
      amount: '50.00',
    }).returning()
    
    return { parent, instructor, child, booking }
  }
}
```

## Concurrent Test Patterns

### Testing Race Conditions

```typescript
describe('Concurrent Booking Creation', () => {
  test('prevents double booking of same timeslot', async () => {
    const factory = new TestUserFactory()
    const instructor = await factory.createInstructor()
    const parents = await Promise.all([
      factory.createParent(),
      factory.createParent(),
      factory.createParent(),
    ])
    
    const timeslot = new Date('2024-12-01T14:00:00Z')
    
    // Attempt concurrent bookings
    const bookingAttempts = parents.map(parent =>
      db.insert(bookings).values({
        parentId: parent.id,
        instructorId: instructor.id,
        childId: crypto.randomUUID(), // Simplified
        scheduledAt: timeslot,
        amount: '50.00',
      }).returning()
      .catch(err => err)
    )
    
    const results = await Promise.allSettled(bookingAttempts)
    
    // Only one should succeed
    const successes = results.filter(r => r.status === 'fulfilled').length
    const failures = results.filter(r => r.status === 'rejected').length
    
    expect(successes).toBe(1)
    expect(failures).toBe(2)
    
    await factory.cleanup()
  })
})
```

### Load Testing Pattern

```typescript
describe('Parallel Load Test', () => {
  test('handles 100 concurrent user registrations', async () => {
    const startTime = Date.now()
    
    // Create 100 users in parallel
    const userPromises = Array.from({ length: 100 }, (_, i) => 
      db.insert(users).values({
        email: `load-test-${i}-${startTime}@test.example.com`,
        clerkId: `clerk_load_${i}_${startTime}`,
        firstName: `User${i}`,
        lastName: 'LoadTest',
        role: 'PARENT',
      }).returning()
    )
    
    const results = await Promise.allSettled(userPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    
    expect(successful).toBe(100)
    
    // Cleanup
    await db.delete(users).where(
      sql`email LIKE ${`load-test-%-${startTime}@test.example.com`}`
    )
  })
})
```

## CI/CD Parallel Optimization

### GitHub Actions Matrix

```yaml
name: Parallel Tests
on: [push, pull_request]

jobs:
  test-matrix:
    strategy:
      matrix:
        # Run different test suites in parallel
        test-suite: [integration, e2e-chrome, e2e-firefox, e2e-mobile]
        # Shard each suite
        shard: [1, 2, 3, 4]
    
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_${{ matrix.test-suite }}_${{ matrix.shard }}
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: |
          if [ "${{ matrix.test-suite }}" = "integration" ]; then
            pnpm test:integration --shard=${{ matrix.shard }}/4
          else
            pnpm playwright test --project="${{ matrix.test-suite }}" --shard=${{ matrix.shard }}/4
          fi
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_${{ matrix.test-suite }}_${{ matrix.shard }}
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.test-suite }}-${{ matrix.shard }}
          path: test-results/
```

### Test Result Aggregation

```yaml
  aggregate-results:
    needs: test-matrix
    runs-on: ubuntu-latest
    if: always()
    
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v3
        with:
          path: all-results/
      
      - name: Merge test results
        run: |
          npx junit-report-merger all-results/**/junit.xml > merged-results.xml
      
      - name: Create summary
        run: |
          echo "## Test Results Summary" >> $GITHUB_STEP_SUMMARY
          echo "Total test suites: 16 (4 suites × 4 shards)" >> $GITHUB_STEP_SUMMARY
          # Parse and summarize results
```

## Best Practices

### DO's

1. **Always use unique identifiers** - Timestamps + UUIDs
2. **Clean up after each test** - Use afterEach hooks
3. **Test with realistic concurrency** - Use Promise.all()
4. **Isolate test data** - Use test-specific prefixes
5. **Monitor test duration** - Set appropriate timeouts
6. **Use transaction rollback** - When possible for speed

### DON'Ts

1. **Don't use fixed test data** - Causes conflicts
2. **Don't rely on test order** - Tests run randomly
3. **Don't share state between tests** - Each test is independent
4. **Don't use sleep/delays** - Use proper waiting
5. **Don't skip cleanup** - Causes data accumulation
6. **Don't mock infrastructure** - Use real services

## Debugging Parallel Test Issues

### Identifying Conflicts

```typescript
// Add logging to identify conflicts
beforeEach(() => {
  console.log(`Test ${expect.getState().currentTestName} starting with PID ${process.pid}`)
})

// Use descriptive test data
const testId = `${expect.getState().currentTestName}_${Date.now()}`
```

### Database Lock Monitoring

```sql
-- Check for blocking queries
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  query_start,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Check for locks
SELECT 
  l.relation::regclass,
  l.mode,
  l.granted,
  a.query
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;
```

### Test Isolation Verification

```typescript
// Verify no test data leakage
afterAll(async () => {
  const leftoverData = await db
    .select({ count: sql`count(*)` })
    .from(users)
    .where(sql`email LIKE '%@test.example.com'`)
  
  if (leftoverData[0].count > 0) {
    console.warn(`WARNING: ${leftoverData[0].count} test records not cleaned up`)
  }
})
```
