# Testing Agent

## Purpose

This agent specializes in creating and maintaining comprehensive test suites for the Coordinated.App application, with a focus on integration and E2E tests using real infrastructure, ensuring idempotent and parallel test execution.

## Testing Philosophy

### Testing Pyramid (Inverted for Real-World Confidence)

```
         ╱╲
        ╱E2E╲       ← 60% - Real user flows with actual infrastructure
       ╱Tests╲
      ╱────────╲
     ╱Integration╲   ← 35% - API & service integration with real DB
    ╱    Tests    ╲
   ╱────────────────╲
  ╱   Unit Tests     ╲ ← 5% - Only for complex algorithms/logic
 ╱────────────────────╲
```

### Core Principles

- **Real Infrastructure**: Always test against real databases, real APIs, real services
- **Idempotent Tests**: Every test can run multiple times with same result
- **Parallel Execution**: Tests must not interfere with each other
- **No Mocks for Infrastructure**: Use real PostgreSQL, real Redis, real services
- **Fast Feedback**: Optimize for speed without sacrificing reliability

## Test Structure

### Directory Layout

```
apps/web/
├── __tests__/
│   ├── e2e/                      # Playwright E2E tests
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── signup.spec.ts
│   │   │   └── password-reset.spec.ts
│   │   ├── booking/
│   │   │   ├── search-instructor.spec.ts
│   │   │   ├── create-booking.spec.ts
│   │   │   └── manage-booking.spec.ts
│   │   ├── fixtures/
│   │   │   └── test-data.ts
│   │   └── helpers/
│   │       ├── db-helpers.ts
│   │       └── auth-helpers.ts
│   ├── integration/              # Integration tests
│   │   ├── api/
│   │   │   ├── bookings.test.ts
│   │   │   └── users.test.ts
│   │   ├── services/
│   │   │   ├── booking-service.test.ts
│   │   │   └── notification-service.test.ts
│   │   └── db/
│   │       └── schema-validation.test.ts
│   └── unit/                     # Minimal unit tests
│       └── utils/
│           ├── date-helpers.test.ts
│           └── price-calculator.test.ts
├── playwright.config.ts
└── vitest.config.ts
```

## Database Testing Strategy

### Test Database Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    pool: 'forks', // Each test file gets own process
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution
      }
    },
    testTimeout: 30000, // Real DB operations need more time
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

### Test Setup with Real Database

```typescript
// test-setup.ts
import { db } from '@/lib/db/connection'
import { sql } from 'drizzle-orm'

// Each test gets a unique schema for isolation
export function getTestSchema() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `test_${timestamp}_${random}`
}

// Before all tests in a file
export async function setupTestDatabase(schema: string) {
  // Create isolated schema
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(schema)}`)
  await db.execute(sql`SET search_path TO ${sql.identifier(schema)}`)
  
  // Run migrations in test schema
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  await migrate(db, { 
    migrationsFolder: './lib/db/migrations',
    migrationsSchema: schema 
  })
}

// After all tests in a file
export async function teardownTestDatabase(schema: string) {
  await db.execute(sql`DROP SCHEMA IF EXISTS ${sql.identifier(schema)} CASCADE`)
}
```

## E2E Test Patterns

### Real Infrastructure E2E Tests

```typescript
// __tests__/e2e/booking/create-booking.spec.ts
import { test, expect } from '@playwright/test'
import { db } from '@/lib/db/connection'
import { users, instructorProfiles, bookings } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

test.describe('Booking Creation Flow', () => {
  let testUserEmail: string
  let testInstructorEmail: string
  
  test.beforeEach(async ({ page }) => {
    // Create unique test data
    const timestamp = Date.now()
    testUserEmail = `parent-${timestamp}@e2e-test.example.com`
    testInstructorEmail = `instructor-${timestamp}@e2e-test.example.com`
    
    // Insert test data directly into real database
    const [parent] = await db.insert(users).values({
      email: testUserEmail,
      clerkId: `clerk_parent_${timestamp}`,
      firstName: 'Test',
      lastName: 'Parent',
      role: 'PARENT',
    }).returning()
    
    const [instructor] = await db.insert(users).values({
      email: testInstructorEmail,
      clerkId: `clerk_instructor_${timestamp}`,
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'INSTRUCTOR',
    }).returning()
    
    await db.insert(instructorProfiles).values({
      userId: instructor.id,
      bio: 'Experienced instructor',
      hourlyRate: '75.00',
      specialties: ['beginner', 'advanced'],
    })
    
    // Set up authentication (real Clerk test tokens)
    await page.context().addCookies([{
      name: '__session',
      value: process.env.TEST_PARENT_SESSION_TOKEN!,
      domain: 'localhost',
      path: '/',
    }])
  })
  
  test.afterEach(async () => {
    // Clean up test data
    await db.delete(bookings).where(
      sql`parent_id IN (SELECT id FROM ${users} WHERE email = ${testUserEmail})`
    )
    await db.delete(users).where(
      sql`email IN (${testUserEmail}, ${testInstructorEmail})`
    )
  })
  
  test('complete booking flow with real payment', async ({ page }) => {
    // Navigate to instructor search
    await page.goto('/find-instructor')
    
    // Search for instructor
    await page.fill('[data-testid="location-input"]', 'Test City')
    await page.click('[data-testid="search-button"]')
    
    // Wait for real database query
    await page.waitForSelector('[data-testid="instructor-card"]')
    
    // Select instructor
    const instructorCard = page.locator('[data-testid="instructor-card"]').first()
    await expect(instructorCard).toContainText('Test Instructor')
    await instructorCard.click()
    
    // Select time slot
    await page.waitForSelector('[data-testid="calendar"]')
    await page.click('[data-testid="timeslot-tomorrow-2pm"]')
    
    // Fill booking details
    await page.fill('[data-testid="child-name"]', 'Test Child')
    await page.fill('[data-testid="child-age"]', '8')
    await page.selectOption('[data-testid="skill-level"]', 'beginner')
    
    // Proceed to payment (real Stripe test mode)
    await page.click('[data-testid="continue-to-payment"]')
    
    // Fill Stripe test card
    const stripeFrame = page.frameLocator('iframe[name="stripe-card-element"]')
    await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242')
    await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/25')
    await stripeFrame.locator('[placeholder="CVC"]').fill('123')
    await stripeFrame.locator('[placeholder="ZIP"]').fill('10001')
    
    // Submit payment
    await page.click('[data-testid="pay-button"]')
    
    // Wait for real payment processing
    await page.waitForURL('/booking/confirmation', { timeout: 15000 })
    
    // Verify booking in database
    const booking = await db.query.bookings.findFirst({
      where: sql`
        parent_id = (SELECT id FROM ${users} WHERE email = ${testUserEmail})
      `,
      with: {
        instructor: true,
        payment: true,
      }
    })
    
    expect(booking).toBeTruthy()
    expect(booking?.status).toBe('CONFIRMED')
    expect(booking?.payment?.status).toBe('PAID')
    
    // Verify confirmation page
    await expect(page.locator('[data-testid="confirmation-message"]'))
      .toContainText('Booking Confirmed')
    await expect(page.locator('[data-testid="booking-id"]'))
      .toContainText(booking!.id)
  })
  
  test('handles concurrent bookings for same timeslot', async ({ browser }) => {
    // Create multiple browser contexts for parallel booking attempts
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ])
    
    const pages = await Promise.all(
      contexts.map(ctx => ctx.newPage())
    )
    
    // Set up auth for all pages
    await Promise.all(pages.map((page, i) => 
      page.context().addCookies([{
        name: '__session',
        value: process.env[`TEST_PARENT_${i + 1}_SESSION_TOKEN`]!,
        domain: 'localhost',
        path: '/',
      }])
    ))
    
    // Navigate all to same instructor
    await Promise.all(pages.map(page => 
      page.goto(`/instructor/${testInstructorEmail.split('@')[0]}`)
    ))
    
    // All select same timeslot simultaneously
    await Promise.all(pages.map(page =>
      page.click('[data-testid="timeslot-tomorrow-2pm"]')
    ))
    
    // All try to book
    const bookingPromises = pages.map(async (page) => {
      try {
        await page.fill('[data-testid="child-name"]', 'Test Child')
        await page.click('[data-testid="continue-to-payment"]')
        await page.waitForURL('/booking/confirmation', { timeout: 15000 })
        return 'success'
      } catch {
        return 'failed'
      }
    })
    
    const results = await Promise.all(bookingPromises)
    
    // Only one should succeed
    expect(results.filter(r => r === 'success')).toHaveLength(1)
    expect(results.filter(r => r === 'failed')).toHaveLength(2)
    
    // Verify database has only one booking
    const bookingCount = await db
      .select({ count: sql`count(*)` })
      .from(bookings)
      .where(sql`
        instructor_id = (SELECT id FROM ${users} WHERE email = ${testInstructorEmail})
        AND scheduled_at = DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '14 hours'
      `)
    
    expect(bookingCount[0].count).toBe('1')
  })
})
```

### Mobile E2E Tests

```typescript
// __tests__/e2e/mobile/mobile-booking.spec.ts
import { test, expect, devices } from '@playwright/test'

// Test on real mobile viewports
['iPhone 13', 'Pixel 5', 'iPad Mini'].forEach(deviceName => {
  test.describe(`Mobile Booking - ${deviceName}`, () => {
    test.use({ ...devices[deviceName] })
    
    test('mobile-optimized booking flow', async ({ page }) => {
      await page.goto('/find-instructor')
      
      // Mobile-specific interactions
      await page.tap('[data-testid="location-input"]')
      await page.fill('[data-testid="location-input"]', 'Test City')
      
      // Test mobile keyboard dismiss
      await page.tap('[data-testid="search-button"]')
      await expect(page.locator('[data-testid="location-input"]'))
        .not.toBeFocused()
      
      // Swipe to see more results
      const resultsList = page.locator('[data-testid="results-list"]')
      await resultsList.swipe({ direction: 'up', distance: 200 })
      
      // Continue with mobile-optimized flow...
    })
  })
})
```

## Integration Test Patterns

### Service Integration Tests

```typescript
// __tests__/integration/services/booking-service.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { BookingService } from '@/lib/services/booking-service'
import { NotificationService } from '@/lib/services/notification-service'
import { db } from '@/lib/db/connection'
import { users, bookings } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

describe('BookingService Integration', () => {
  let bookingService: BookingService
  let testSchema: string
  
  beforeEach(async () => {
    // Set up isolated test schema
    testSchema = getTestSchema()
    await setupTestDatabase(testSchema)
    
    // Use real services with real database
    bookingService = new BookingService(db, new NotificationService())
  })
  
  afterEach(async () => {
    await teardownTestDatabase(testSchema)
  })
  
  test('creates booking with notifications', async () => {
    // Create test users in real database
    const [parent] = await db.insert(users).values({
      email: `parent-${Date.now()}@test.com`,
      clerkId: `clerk_${Date.now()}`,
      role: 'PARENT',
    }).returning()
    
    const [instructor] = await db.insert(users).values({
      email: `instructor-${Date.now()}@test.com`,
      clerkId: `clerk_${Date.now()}`,
      role: 'INSTRUCTOR',
    }).returning()
    
    // Execute real service method
    const booking = await bookingService.createBooking({
      parentId: parent.id,
      instructorId: instructor.id,
      scheduledAt: new Date('2024-12-01T14:00:00Z'),
      duration: 60,
    })
    
    // Verify in database
    const dbBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, booking.id),
      with: {
        notifications: true,
      }
    })
    
    expect(dbBooking).toBeTruthy()
    expect(dbBooking?.status).toBe('PENDING')
    expect(dbBooking?.notifications).toHaveLength(2) // Parent & instructor
  })
  
  test('handles concurrent booking creation', async () => {
    // Create shared test data
    const [parent] = await db.insert(users).values({
      email: `parent-${Date.now()}@test.com`,
      clerkId: `clerk_${Date.now()}`,
      role: 'PARENT',
    }).returning()
    
    const [instructor] = await db.insert(users).values({
      email: `instructor-${Date.now()}@test.com`,
      clerkId: `clerk_${Date.now()}`,
      role: 'INSTRUCTOR',
    }).returning()
    
    const scheduledAt = new Date('2024-12-01T14:00:00Z')
    
    // Attempt concurrent bookings for same slot
    const bookingPromises = Array(5).fill(null).map(() =>
      bookingService.createBooking({
        parentId: parent.id,
        instructorId: instructor.id,
        scheduledAt,
        duration: 60,
      }).catch(err => err)
    )
    
    const results = await Promise.all(bookingPromises)
    
    // Only one should succeed
    const successes = results.filter(r => !(r instanceof Error))
    const failures = results.filter(r => r instanceof Error)
    
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(4)
    expect(failures[0].message).toContain('already booked')
  })
})
```

### API Integration Tests

```typescript
// __tests__/integration/api/bookings.test.ts
import { describe, test, expect } from 'vitest'
import { createMockRequest } from '../helpers/request-helpers'
import { GET, POST } from '@/app/api/bookings/route'
import { db } from '@/lib/db/connection'

describe('Bookings API Integration', () => {
  test('GET /api/bookings returns real data', async () => {
    // Create test booking in real database
    const timestamp = Date.now()
    const [user] = await db.insert(users).values({
      email: `test-${timestamp}@test.com`,
      clerkId: `clerk_${timestamp}`,
      role: 'PARENT',
    }).returning()
    
    const [booking] = await db.insert(bookings).values({
      parentId: user.id,
      instructorId: user.id, // Simplified for test
      scheduledAt: new Date(),
      status: 'CONFIRMED',
    }).returning()
    
    // Mock authentication
    jest.mock('@clerk/nextjs', () => ({
      auth: () => ({ userId: user.clerkId }),
    }))
    
    // Make real request
    const request = createMockRequest('/api/bookings')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.data).toContainEqual(
      expect.objectContaining({ id: booking.id })
    )
  })
})
```

## Unit Tests (Complex Logic Only)

### When to Write Unit Tests

Only write unit tests for:
- Complex algorithms (pricing calculations, availability matching)
- Date/time manipulation logic
- Business rule validation
- Data transformation functions

### Unit Test Example

```typescript
// __tests__/unit/utils/pricing-calculator.test.ts
import { describe, test, expect } from 'vitest'
import { calculateBookingPrice } from '@/lib/utils/pricing-calculator'

describe('Pricing Calculator', () => {
  test('calculates base price correctly', () => {
    const price = calculateBookingPrice({
      hourlyRate: 75,
      duration: 60,
      participantCount: 1,
    })
    
    expect(price.basePrice).toBe(75)
    expect(price.total).toBe(75)
  })
  
  test('applies group discount', () => {
    const price = calculateBookingPrice({
      hourlyRate: 75,
      duration: 60,
      participantCount: 3,
    })
    
    expect(price.basePrice).toBe(225) // 75 * 3
    expect(price.discount).toBe(22.5) // 10% group discount
    expect(price.total).toBe(202.5)
  })
  
  test('handles edge cases', () => {
    expect(() => calculateBookingPrice({
      hourlyRate: -10,
      duration: 60,
      participantCount: 1,
    })).toThrow('Invalid hourly rate')
    
    expect(() => calculateBookingPrice({
      hourlyRate: 75,
      duration: 0,
      participantCount: 1,
    })).toThrow('Invalid duration')
  })
})
```

## Test Infrastructure

### Parallel Test Execution

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
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

### Idempotent Test Helpers

```typescript
// __tests__/helpers/test-data.ts
export function generateTestEmail(prefix: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${prefix}-${timestamp}-${random}@test.example.com`
}

export function generateTestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomUUID()}`
}

export async function createTestUser(role: 'PARENT' | 'INSTRUCTOR') {
  const email = generateTestEmail(role.toLowerCase())
  const clerkId = generateTestId('clerk')
  
  const [user] = await db.insert(users).values({
    email,
    clerkId,
    role,
    firstName: 'Test',
    lastName: role,
  }).returning()
  
  return user
}
```

## CI/CD Test Pipeline

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run integration tests (parallel)
        run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          NODE_OPTIONS: --max-old-space-size=4096
  
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4] # Run tests in 4 parallel shards
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm playwright install --with-deps
      
      - name: Run E2E tests (shard ${{ matrix.shard }}/4)
        run: pnpm playwright test --shard=${{ matrix.shard }}/4
        env:
          TEST_URL: ${{ secrets.STAGING_URL }}
          TEST_PARENT_SESSION_TOKEN: ${{ secrets.TEST_PARENT_TOKEN }}
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-shard-${{ matrix.shard }}
          path: playwright-report/
```

## Performance Testing

### Load Testing with k6

```javascript
// load-tests/booking-flow.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.01'],            // Error rate under 1%
  },
}

export default function () {
  // Search for instructors
  const searchRes = http.get(`${__ENV.BASE_URL}/api/instructors/search?location=NYC`)
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => JSON.parse(r.body).data.length > 0,
  })
  errorRate.add(searchRes.status !== 200)
  
  sleep(1)
  
  // Get instructor availability
  const instructorId = JSON.parse(searchRes.body).data[0].id
  const availabilityRes = http.get(`${__ENV.BASE_URL}/api/instructors/${instructorId}/availability`)
  check(availabilityRes, {
    'availability status is 200': (r) => r.status === 200,
  })
  errorRate.add(availabilityRes.status !== 200)
  
  sleep(1)
}
```

## Best Practices

### Test Organization

1. **File Naming**: Use `.test.ts` for integration, `.spec.ts` for E2E
2. **Test Isolation**: Each test creates its own data with unique identifiers
3. **Cleanup**: Always clean up test data in afterEach hooks
4. **Parallel Safety**: Never share data between tests

### Real Infrastructure Guidelines

1. **Database**: Use real PostgreSQL, create schemas for isolation
2. **Authentication**: Use real auth providers in test mode
3. **Payments**: Use real payment providers in test mode
4. **External APIs**: Use real APIs with test credentials
5. **File Storage**: Use real storage with test buckets

### Performance Optimization

1. **Connection Pooling**: Reuse database connections
2. **Parallel Execution**: Run tests in parallel by default
3. **Smart Retries**: Retry only flaky operations, not entire tests
4. **Selective Testing**: Run only affected tests in CI

### Debugging

1. **Trace on Failure**: Automatically capture traces for failed tests
2. **Real-time Logs**: Stream logs during test execution
3. **Database Inspection**: Keep test data on failure for debugging
4. **Video Recording**: Record E2E test failures