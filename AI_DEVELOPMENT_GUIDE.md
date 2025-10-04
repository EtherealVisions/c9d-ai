# AI Agent Development Guide

This guide explains how to effectively use AI agents for development on the Coordinated.App project.

## 🤖 What Are Agents?

Agents are specialized AI assistants configured with specific domain knowledge and best practices. Each agent in `.cursor/agents/` is an expert in a particular aspect of our technology stack.

## 🚀 Quick Start

### 1. Choose the Right Agent

```bash
# Working with database schemas?
→ Use Database Agent

# Writing tests?
→ Use Testing Agent + Parallel Testing Agent

# Building API endpoints?
→ Use API Agent

# Deploying to production?
→ Use Vercel Agent + Environment Agent
```

### 2. Reference Agent Guidelines

When starting a task, tell your AI assistant which agent to follow:

```
"I need to create a new API endpoint for booking management. 
Please follow the API Agent guidelines with Drizzle ORM patterns."
```

### 3. Combine Agents for Complex Tasks

Most features require multiple agents:

```
"I'm building a payment feature. Please use:
- Database Agent for the schema
- API Agent for the endpoints  
- Testing Agent for integration tests
- Validation Agent for TypeScript types"
```

## 📋 Common Workflows

### Creating a New Feature

1. **Start with Database Schema** (Database Agent + Supabase Agent)
   ```typescript
   // Define schema with proper conventions
   export const payments = pgTable('payments', {
     id: uuid('id').defaultRandom().primaryKey(),
     bookingId: uuid('booking_id').notNull(),
     amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
     status: text('status').notNull(),
     createdAt: timestamp('created_at').defaultNow(),
   })
   ```

2. **Build API Endpoints** (API Agent)
   ```typescript
   // Create type-safe endpoints with Drizzle
   export async function POST(request: NextRequest) {
     const user = await getAuthenticatedUser()
     const data = paymentSchema.parse(await request.json())
     // ... implementation
   }
   ```

3. **Write Tests** (Testing Agent + Parallel Testing Agent)
   ```typescript
   // Integration test with real database
   test('processes payment successfully', async () => {
     const testId = `${Date.now()}_${crypto.randomUUID()}`
     // ... test with real infrastructure
   })
   ```

### Database Changes

1. **Update Schema** (Database Agent)
2. **Generate Migration**: `pnpm db:generate`
3. **Test Locally**: `pnpm db:push`
4. **Write Tests** (Testing Agent)
5. **Deploy** (Vercel Agent)

### Writing Tests

Our testing philosophy emphasizes **real infrastructure**:

```typescript
// ✅ Good - Real database, idempotent data
test('creates user in database', async () => {
  const email = `test-${Date.now()}-${crypto.randomUUID()}@test.example.com`
  const user = await createUser({ email })
  
  // Verify in real database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, email)
  })
  expect(dbUser).toBeTruthy()
})

// ❌ Bad - Mocking infrastructure
jest.mock('@/lib/db') // Don't do this!
```

## 🎯 Best Practices

### 1. Always Use Real Infrastructure

- Real PostgreSQL for all tests
- Real Redis for caching tests
- Real authentication providers in test mode
- Real payment providers in test mode

### 2. Idempotent Operations

```typescript
// Every operation should be repeatable
const uniqueId = `${Date.now()}_${crypto.randomUUID()}`
const testEmail = `user-${uniqueId}@test.example.com`
```

### 3. Parallel-Safe Tests

```typescript
// Tests must not interfere with each other
beforeEach(() => {
  testNamespace = `test_${Date.now()}_${process.pid}`
})

afterEach(async () => {
  await cleanupTestData(testNamespace)
})
```

### 4. Type Safety with Drizzle

```typescript
// Use inferred types everywhere
import type { User, NewUser } from '@/lib/db/schema'

// Let Drizzle handle the types
const users = await db.query.users.findMany({
  with: { bookings: true }
}) // TypeScript knows the exact shape
```

### 5. Environment Management

```bash
# Always use env-wrapper for database commands
pnpm db:migrate  # ✅ Loads environment automatically

# Not this
DATABASE_URL=... drizzle-kit migrate  # ❌ Manual env management
```

## 🔧 Creating Custom Agents

If you need a specialized agent:

1. **Create Agent File**
   ```bash
   touch .cursor/agents/my-feature-agent.md
   ```

2. **Define Agent Structure**
   ```markdown
   # My Feature Agent
   
   ## Purpose
   [Specific domain expertise]
   
   ## Core Principles
   [Key guidelines]
   
   ## Code Patterns
   [Examples and templates]
   
   ## Best Practices
   [Do's and don'ts]
   ```

3. **Update Agent Index**
   Add your agent to `.cursor/agents/README.md`

4. **Test Your Agent**
   Use it in practice and refine based on results

## 🚨 Common Pitfalls

### 1. Mocking Infrastructure
```typescript
// ❌ Never mock database or external services
jest.mock('@/lib/db')

// ✅ Use real services
const db = realDatabaseConnection
```

### 2. Non-Idempotent Tests
```typescript
// ❌ Will fail when run multiple times
const user = { email: 'test@example.com' }

// ✅ Always unique
const user = { email: `test-${Date.now()}@example.com` }
```

### 3. Sequential Test Execution
```typescript
// ❌ Slow sequential tests
for (const item of items) {
  await processItem(item)
}

// ✅ Fast parallel execution
await Promise.all(items.map(processItem))
```

### 4. Ignoring Type Safety
```typescript
// ❌ Using 'any' or manual types
const result: any = await db.query(...)

// ✅ Use Drizzle's inferred types
const result = await db.query.users.findFirst()
```

## 📊 Testing Philosophy

Our inverted testing pyramid prioritizes **real-world confidence**:

```
         ╱╲
        ╱E2E╲       ← 60% - Real user flows
       ╱Tests╲
      ╱────────╲
     ╱Integration╲   ← 35% - Service integration
    ╱    Tests    ╲
   ╱────────────────╲
  ╱   Unit Tests     ╲ ← 5% - Complex logic only
 ╱────────────────────╲
```

## 🔗 Quick Links

- **Agent Directory**: [.cursor/agents/](.cursor/agents/)
- **Database Setup**: [DRIZZLE_SETUP.md](DRIZZLE_SETUP.md)
- **Testing Guide**: [.cursor/agents/testing-agent.md](.cursor/agents/testing-agent.md)
- **Environment Setup**: [docs/environment-setup.md](docs/environment-setup.md)

## 💡 Tips for AI-Assisted Development

1. **Be Specific**: "Create a Drizzle schema for user profiles" > "Create a database table"

2. **Reference Agents**: "Following the Testing Agent, write an integration test"

3. **Provide Context**: Share relevant code snippets and file paths

4. **Iterate**: AI assistants work best with feedback loops

5. **Verify Output**: Always test generated code with real infrastructure

## 🤝 Contributing

When adding new patterns or updating agents:

1. Test thoroughly with real infrastructure
2. Document with clear examples
3. Update relevant agents
4. Share learnings with the team

---

Remember: Our agents are living documents. As we discover better patterns, we update them. The goal is to maintain high-quality, consistent code across the entire project while leveraging AI to accelerate development.
