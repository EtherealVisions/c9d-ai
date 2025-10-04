# Cursor Agents for Coordinated.App

This directory contains specialized AI agents designed to help maintain consistency and quality across the Coordinated.App project. Each agent specializes in a specific domain and follows the project's established rules and conventions.

## Current Stack

- **Database ORM**: Drizzle ORM (PostgreSQL/Supabase)
- **Testing Philosophy**: Integration & E2E tests with real infrastructure (60% E2E, 35% Integration, 5% Unit)
- **Environment Management**: env-wrapper with Phase.dev
- **Authentication**: Clerk
- **Deployment**: Vercel
- **Framework**: Next.js 14+ with App Router

## Available Agents

### 1. [Database Agent](./database-agent.md)

**Specialization:** Drizzle ORM schema design, migrations, and database operations

**Key Responsibilities:**
- Design efficient database schemas with Drizzle ORM
- Manage migrations and schema changes
- Optimize database queries with proper indexes
- Handle PostgreSQL/Supabase-specific patterns
- Ensure idempotent test data patterns

**When to use:** Working with database schema, creating new models, optimizing queries, or handling migrations.

### 2. [Testing Agent](./testing-agent.md) ⭐ Updated

**Specialization:** Integration and E2E testing with real infrastructure

**Key Responsibilities:**
- Write E2E tests using Playwright with real databases
- Create integration tests that use actual PostgreSQL
- Ensure tests are idempotent and can run in parallel
- Minimal unit tests only for complex business logic
- Real authentication, real payments, real services

**When to use:** Writing any tests, setting up test infrastructure, or ensuring parallel test execution.

### 3. [API Agent](./api-agent.md)

**Specialization:** RESTful API development with Next.js App Router and Drizzle ORM

**Key Responsibilities:**
- Create consistent API endpoints with Drizzle
- Implement authentication with Clerk
- Handle validation with Zod and drizzle-zod
- Write integration tests for APIs
- Follow REST conventions

**When to use:** Creating new API routes, implementing CRUD operations, or designing API architecture.

### 4. [Validation Agent](./validation-agent.md)

**Specialization:** Code quality, TypeScript compliance with Drizzle types

**Key Responsibilities:**
- Ensure TypeScript best practices with Drizzle inferred types
- Maintain code formatting standards
- Catch common coding errors
- Validate database operations
- Type-safe query building

**When to use:** Reviewing code quality, fixing TypeScript errors, or establishing coding standards.

### 5. [Supabase Agent](./supabase-agent.md)

**Specialization:** Supabase/PostgreSQL database conventions with Drizzle ORM

**Key Responsibilities:**
- Enforce snake_case naming conventions in schemas
- Design efficient database indexes
- Implement Row Level Security patterns
- Optimize for Supabase features (realtime, RLS)
- PostgreSQL-specific optimizations

**When to use:** Designing database schemas, working with Supabase-specific features, or optimizing PostgreSQL queries.

### 6. [Vercel Agent](./vercel-agent.md)

**Specialization:** Vercel deployment optimization with Drizzle ORM

**Key Responsibilities:**
- Configure optimal build settings for Drizzle
- Handle database migrations in deployment
- Implement Edge Runtime patterns
- Set up monitoring and analytics
- Optimize for serverless with connection pooling

**When to use:** Preparing for deployment, optimizing performance, configuring Vercel features, or troubleshooting deployment issues.

### 7. [Next.js Agent](./nextjs-agent.md)

**Specialization:** Next.js 14+ App Router patterns and best practices

**Key Responsibilities:**
- Implement Server Component patterns
- Optimize data fetching strategies
- Configure SEO and metadata
- Ensure accessibility standards
- Performance optimization

**When to use:** Building new features, optimizing performance, implementing App Router patterns, or solving Next.js-specific challenges.

### 8. [Environment Agent](./environment-agent.md)

**Specialization:** Environment variable management with env-wrapper and Phase.dev

**Key Responsibilities:**
- Document new environment variables
- Ensure proper environment file handling
- Manage environment-specific configurations
- Integration with Phase.dev
- Security best practices for secrets

**When to use:** Adding new environment variables, configuring services, or setting up deployment environments.

### 9. [Parallel Testing Agent](./parallel-testing-agent.md) 🆕

**Specialization:** Ensuring tests run in parallel without conflicts

**Key Responsibilities:**
- Design idempotent test data patterns
- Implement database isolation strategies
- Configure parallel test execution
- Prevent test conflicts and race conditions
- Optimize CI/CD for parallel testing

**When to use:** Writing tests that must run in parallel, debugging test conflicts, or optimizing test execution speed.

## Testing Philosophy

Our testing approach prioritizes **real-world confidence** over mocking:

### Testing Pyramid (Inverted)
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

### Key Testing Principles

1. **Real Infrastructure Always**: Use real PostgreSQL, real Redis, real external services
2. **Idempotent Tests**: Every test creates unique data with timestamps/UUIDs
3. **Parallel Execution**: Tests must not interfere with each other
4. **No Infrastructure Mocks**: Test against actual services in test mode
5. **Fast Feedback**: Optimize for speed without sacrificing reliability

## How to Use These Agents

1. **Select the appropriate agent** based on your current task
2. **Reference the agent's guidelines** while working
3. **Follow the established patterns** documented in each agent
4. **Combine multiple agents** when working on complex features

## Agent Combinations for Common Tasks

### Creating a New Feature

1. Start with **Next.js Agent** for component structure
2. Use **Database Agent** for Drizzle schema design
3. Reference **API Agent** for endpoints with Drizzle queries
4. Write tests with **Testing Agent** using real infrastructure
5. Apply **Validation Agent** for TypeScript/Drizzle types

### Setting Up Deployment

1. Begin with **Environment Agent** for env-wrapper configuration
2. Use **Vercel Agent** for deployment settings with migrations
3. Apply **Supabase Agent** for database setup
4. Check with **Validation Agent** before deploying
5. Ensure **Testing Agent** patterns for CI/CD

### Database Schema Changes

1. Start with **Supabase Agent** for PostgreSQL conventions
2. Use **Database Agent** for Drizzle implementation
3. Write migration tests with **Testing Agent**
4. Reference **Environment Agent** if new configs needed
5. Update **API Agent** patterns for new queries

## Project Rules Summary

All agents follow these core project rules:

### Environment Management
- Always use `env-wrapper` for environment loading
- Never directly create or modify `.env` files
- Always update `.env.example` with documentation
- Use Phase.dev for secret management in production

### Database Operations
- Always use Drizzle ORM for database interactions
- Follow snake_case conventions for PostgreSQL
- Use proper error handling with typed errors
- Test with real PostgreSQL instances
- Ensure idempotent operations

### Testing Standards
- Integration and E2E tests use real infrastructure
- Create unique test data with timestamps
- Tests must run in parallel without conflicts
- Minimal mocking - only for complex unit tests
- Use Playwright for E2E, Vitest for integration

### Code Quality
- Use Drizzle's inferred types everywhere
- Run validation scripts before committing
- Fix TypeScript errors immediately
- Follow consistent formatting standards
- Leverage drizzle-zod for validation

### Deployment
- Use Vercel's environment variable system
- Run migrations as part of build process
- Optimize for Edge Runtime when possible
- Monitor performance metrics
- Implement proper connection pooling

### Next.js Patterns
- Use Server Components by default
- Implement proper loading states
- Optimize images and fonts
- Ensure accessibility
- Cache with unstable_cache

## Quick Reference

```bash
# Database commands
pnpm db:generate     # Generate Drizzle migrations
pnpm db:migrate      # Apply migrations
pnpm db:push         # Push schema to dev DB
pnpm db:studio       # Open Drizzle Studio

# Testing commands
pnpm test:e2e        # Run E2E tests with real infrastructure
pnpm test:integration # Run integration tests
pnpm test:unit       # Run minimal unit tests

# Validation commands
pnpm type-check      # Check TypeScript with Drizzle types
pnpm lint            # Run ESLint
pnpm format          # Format code
pnpm validate-all    # Run all validations

# Environment commands
pnpm validate-env    # Check environment variables
pnpm dev             # Start with env-wrapper
```

## Creating Idempotent Test Data

```typescript
// Always use timestamps and UUIDs for uniqueness
const testEmail = `user-${Date.now()}-${crypto.randomUUID()}@test.example.com`
const testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`

// Clean up with SQL patterns
await db.delete(users).where(sql`email LIKE '%@test.example.com'`)
```

## Parallel Testing Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Enable parallel execution
      }
    }
  }
})

// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
})
```

## Contributing New Agents

When creating a new agent:

1. Create a new markdown file in this directory
2. Follow the existing agent format
3. Include:
   - Clear purpose statement
   - Core responsibilities
   - Code examples with Drizzle ORM
   - Testing patterns with real infrastructure
   - Common tasks and workflows
   - Best practices and anti-patterns
4. Update this README with the new agent

## Support

For questions about these agents or the project conventions, refer to:

- [Project Cursor Rules](../../.cursorrules)
- [Drizzle Setup Guide](../../DRIZZLE_SETUP.md)
- [Repo-Specific Rules](../../.cursorrules) - See Drizzle ORM Development Guidelines
- Project documentation in the `/docs` directory