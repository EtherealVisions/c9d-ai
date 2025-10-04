# Cursor AI Agent Configuration

This file provides context and guidance for Cursor's AI system when assisting with development on the C9D AI platform.

## Project Overview

C9D AI is a modern web application built with a focus on real-world testing, type safety, and scalable architecture. The project uses real infrastructure for all testing (no mocks) and emphasizes idempotent, parallel test execution.

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Database**: PostgreSQL with Drizzle ORM (via Supabase)
- **Authentication**: Clerk
- **Environment Management**: env-wrapper with Phase.dev
- **Testing**: Playwright (E2E), Vitest (Integration), minimal unit tests
- **Deployment**: Vercel
- **Styling**: Tailwind CSS with shadcn/ui
- **Package Manager**: pnpm with Turborepo

## Critical Rules

### 1. Database Operations
- **ALWAYS** use Drizzle ORM - never write raw SQL queries directly
- Follow snake_case naming for database columns and tables
- Use proper TypeScript types with Drizzle's inferred types
- Migrations: `pnpm db:generate` → `pnpm db:migrate`

### 2. Testing Philosophy
- **60% E2E tests**: Real user flows with actual infrastructure
- **35% Integration tests**: API & service integration with real DB
- **5% Unit tests**: Only for complex algorithms/business logic
- **NEVER mock infrastructure** - use real PostgreSQL, Redis, services
- All tests must be idempotent (unique timestamps/UUIDs)
- All tests must run in parallel without conflicts

### 3. Environment Management
- **NEVER** create or modify `.env` files directly
- **ALWAYS** update `.env.example` with documentation
- Use `env-wrapper` for all database commands
- Phase.dev handles production secrets

### 4. Code Patterns
```typescript
// ✅ Good - Idempotent test data
const email = `test-${Date.now()}-${crypto.randomUUID()}@test.example.com`

// ❌ Bad - Will conflict in parallel tests
const email = 'test@example.com'

// ✅ Good - Real database in tests
const user = await db.insert(users).values(userData).returning()

// ❌ Bad - Mocking infrastructure
jest.mock('@/lib/db')
```

## Specialized Agents

The project includes specialized agents in `.cursor/agents/` for different domains:

- **Database Agent**: Drizzle ORM patterns and migrations
- **Testing Agent**: Integration/E2E testing with real infrastructure
- **API Agent**: Next.js App Router API development
- **Validation Agent**: TypeScript and code quality
- **Supabase Agent**: PostgreSQL conventions
- **Vercel Agent**: Deployment optimization
- **Environment Agent**: env-wrapper and Phase.dev
- **Parallel Testing Agent**: Idempotent test patterns

Refer to these agents for domain-specific guidance.

## Key Commands

```bash
# Database
pnpm db:generate    # Generate migrations from schema changes
pnpm db:migrate     # Apply migrations
pnpm db:push        # Push schema to dev database
pnpm db:studio      # Open Drizzle Studio UI

# Testing
pnpm test:e2e       # Run E2E tests with Playwright
pnpm test:integration # Run integration tests
pnpm test:unit      # Run minimal unit tests

# Development
pnpm dev            # Start dev server with env-wrapper
pnpm typecheck      # Check TypeScript types
pnpm lint           # Run ESLint
```

## File Structure Patterns

```
apps/web/
├── app/                    # Next.js App Router
├── lib/
│   ├── db/
│   │   ├── schema/        # Drizzle schemas (one file per table)
│   │   ├── migrations/    # Generated SQL migrations
│   │   └── connection.ts  # Database singleton
│   └── services/          # Business logic with real DB
├── __tests__/
│   ├── e2e/              # Playwright tests (60%)
│   ├── integration/      # API/service tests (35%)
│   └── unit/            # Algorithm tests only (5%)
```

## Common Mistakes to Avoid

1. **Creating `.env` files** - Update `.env.example` instead
2. **Mocking databases in tests** - Use real PostgreSQL
3. **Non-unique test data** - Always use timestamps/UUIDs
4. **Sequential test execution** - Design for parallel execution
5. **Raw SQL queries** - Use Drizzle ORM query builder
6. **Ignoring TypeScript errors** - Fix immediately
7. **Adding infrastructure mocks** - Use real services

## Project Context

This is a monorepo using Turborepo with the following packages:
- `apps/web`: Main Next.js application
- `packages/env-tools`: Environment management utilities
- `packages/config`: Shared configuration
- `packages/types`: Shared TypeScript types
- `packages/ui`: Shared UI components

## References

- **Developer Guide**: [AI_DEVELOPMENT_GUIDE.md](AI_DEVELOPMENT_GUIDE.md)
- **Database Setup**: [DRIZZLE_SETUP.md](DRIZZLE_SETUP.md)
- **Agent Directory**: [.cursor/agents/](.cursor/agents/)
- **Cursor Rules**: [.cursorrules](.cursorrules)

## When Assisting Developers

1. Always check for existing patterns in specialized agents
2. Enforce the testing philosophy (real infrastructure, idempotent)
3. Use Drizzle ORM for all database operations
4. Suggest parallel-safe implementations
5. Reference appropriate documentation
6. Follow TypeScript best practices with inferred types
7. Remind about env-wrapper for database commands

Remember: The goal is maintainable, type-safe code that can be tested with confidence using real infrastructure.