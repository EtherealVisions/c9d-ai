# Cursor Agents for Coordinated.App

This directory contains specialized AI agents designed to help maintain consistency and quality across the Coordinated.App project. Each agent specializes in a specific domain and follows the project's established rules and conventions.

## Available Agents

### 1. [Database Agent](./database-agent.md)

**Specialization:** Prisma schema design, migrations, and database operations

**Key Responsibilities:**

- Design efficient database schemas
- Manage migrations and schema changes
- Optimize database queries
- Handle Prisma-specific patterns

**When to use:** Working with database schema, creating new models, optimizing queries, or handling migrations.

### 2. [Environment Agent](./environment-agent.md)

**Specialization:** Environment variable management and configuration

**Key Responsibilities:**

- Document new environment variables
- Ensure proper environment file handling
- Manage environment-specific configurations
- Security best practices for secrets

**When to use:** Adding new environment variables, configuring services, or setting up deployment environments.

### 3. [API Agent](./api-agent.md)

**Specialization:** RESTful API development with Next.js App Router

**Key Responsibilities:**

- Create consistent API endpoints
- Implement authentication and authorization
- Handle validation and error responses
- Follow REST conventions

**When to use:** Creating new API routes, implementing CRUD operations, or designing API architecture.

### 4. [Validation Agent](./validation-agent.md)

**Specialization:** Code quality, TypeScript compliance, and formatting

**Key Responsibilities:**

- Ensure TypeScript best practices
- Maintain code formatting standards
- Catch common coding errors
- Optimize performance

**When to use:** Reviewing code quality, fixing TypeScript errors, or establishing coding standards.

### 5. [Supabase Agent](./supabase-agent.md)

**Specialization:** Supabase/PostgreSQL database conventions and patterns

**Key Responsibilities:**

- Enforce snake_case naming conventions
- Design efficient database indexes
- Implement Row Level Security patterns
- Optimize for Supabase features

**When to use:** Designing database schemas, working with Supabase-specific features, or optimizing PostgreSQL queries.

### 6. [Vercel Agent](./vercel-agent.md)

**Specialization:** Vercel deployment optimization and best practices

**Key Responsibilities:**

- Configure optimal build settings
- Implement Edge Runtime patterns
- Set up monitoring and analytics
- Optimize for serverless deployment

**When to use:** Preparing for deployment, optimizing performance, configuring Vercel features, or troubleshooting deployment issues.

### 7. [Next.js Agent](./nextjs-agent.md)

**Specialization:** Next.js 14+ App Router patterns and best practices

**Key Responsibilities:**

- Implement Server Component patterns
- Optimize data fetching strategies
- Configure SEO and metadata
- Ensure accessibility standards

**When to use:** Building new features, optimizing performance, implementing App Router patterns, or solving Next.js-specific challenges.

## How to Use These Agents

1. **Select the appropriate agent** based on your current task
2. **Reference the agent's guidelines** while working
3. **Follow the established patterns** documented in each agent
4. **Combine multiple agents** when working on complex features

## Agent Combinations for Common Tasks

### Creating a New Feature

1. Start with **Next.js Agent** for component structure
2. Use **Database Agent** for schema design
3. Reference **API Agent** for endpoints
4. Apply **Validation Agent** for code quality

### Setting Up Deployment

1. Begin with **Environment Agent** for configuration
2. Use **Vercel Agent** for deployment settings
3. Apply **Supabase Agent** for database setup
4. Check with **Validation Agent** before deploying

### Database Schema Changes

1. Start with **Supabase Agent** for naming conventions
2. Use **Database Agent** for Prisma implementation
3. Reference **Environment Agent** if new configs needed
4. Test with **API Agent** patterns

## Project Rules Summary

All agents follow these core project rules:

### Environment Management

- Never directly create or modify `.env` files
- Always update `.env.example` with documentation
- Use `dotenv-cli` for environment-specific scripts

### Database Operations

- Always use Prisma for database interactions
- Follow snake_case conventions for Supabase
- Use proper error handling with try-catch blocks

### Code Quality

- Run validation scripts before committing
- Fix TypeScript errors immediately
- Follow consistent formatting standards

### Deployment

- Use Vercel's environment variable system
- Optimize for Edge Runtime when possible
- Monitor performance metrics

### Next.js Patterns

- Use Server Components by default
- Implement proper loading states
- Optimize images and fonts
- Ensure accessibility

## Quick Reference

```bash
# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:push       # Push schema to dev DB
pnpm db:migrate    # Create migration
pnpm db:studio     # Open Prisma Studio

# Validation commands
pnpm type-check    # Check TypeScript
pnpm lint         # Run ESLint
pnpm format       # Format code
pnpm build        # Production build

# Environment-aware commands
pnpm dev          # Development server
pnpm build:prod   # Production build
```

## Contributing New Agents

When creating a new agent:

1. Create a new markdown file in this directory
2. Follow the existing agent format
3. Include:
   - Clear purpose statement
   - Core responsibilities
   - Code examples and patterns
   - Common tasks and workflows
   - Best practices and anti-patterns
4. Update this README with the new agent

## Support

For questions about these agents or the project conventions, refer to:

- [Project Cursor Rules](../../.cursorrules)
- [Database Setup Guide](../../apps/web/DATABASE_SETUP.md)
- Project documentation in the `/docs` directory
