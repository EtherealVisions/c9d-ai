# Drizzle Database Schema

This directory contains the complete Drizzle ORM schema definitions for the C9D AI platform database. The schemas are organized by domain and provide type-safe database operations with proper relationships and constraints.

## Schema Organization

### Core Entity Schemas

#### `users.ts`
- **Table**: `users`
- **Purpose**: Individual platform user information with Clerk integration
- **Key Fields**: `clerkUserId`, `email`, `firstName`, `lastName`, `preferences`
- **Indexes**: Clerk user ID, email, created date

#### `organizations.ts`
- **Tables**: `organizations`, `organization_memberships`
- **Purpose**: Tenant organizations and user memberships
- **Key Fields**: Organization metadata, settings, membership roles and status
- **Indexes**: Slug, name, user-organization relationships

#### `roles.ts`
- **Tables**: `roles`, `permissions`
- **Purpose**: Role-based access control (RBAC) system
- **Key Fields**: Role permissions (JSON array), system role flags
- **Features**: Hierarchical permissions, organization-scoped roles

### Content and Onboarding Schemas

#### `content.ts`
- **Tables**: `onboarding_paths`, `onboarding_steps`, `onboarding_sessions`, `user_progress`, `onboarding_content`, `organization_onboarding_configs`
- **Purpose**: Comprehensive onboarding system with customizable paths
- **Key Features**:
  - Multi-step onboarding journeys
  - Progress tracking and analytics
  - Organization-specific customization
  - Interactive content management

#### `invitations.ts`
- **Tables**: `invitations`, `team_invitations`, `onboarding_milestones`, `user_achievements`
- **Purpose**: User invitation system with achievement tracking
- **Key Features**:
  - Standard and team-specific invitations
  - Milestone-based achievements
  - Onboarding path overrides

#### `audit.ts`
- **Tables**: `audit_logs`, `onboarding_analytics`, `system_metrics`, `error_logs`
- **Purpose**: Comprehensive logging and analytics system
- **Key Features**:
  - Detailed audit trails
  - Performance metrics
  - Error tracking and resolution
  - User behavior analytics

## Schema Features

### Type Safety
- Full TypeScript integration with inferred types
- Compile-time validation of queries and operations
- Automatic type generation from schema definitions

### Relationships
- Proper foreign key constraints
- Drizzle relations for type-safe joins
- Cascade delete policies where appropriate

### Performance Optimization
- Strategic indexing for common query patterns
- Composite indexes for multi-column queries
- Optimized for read-heavy workloads

### Data Integrity
- NOT NULL constraints on required fields
- Unique constraints on business keys
- JSON validation for structured data

## Usage Examples

### Basic Table Import
```typescript
import { users, organizations } from '@/lib/db/schema'
```

### Complete Schema Import
```typescript
import * as schema from '@/lib/db/schema'
```

### Type Definitions
```typescript
import type { User, NewUser, Organization } from '@/lib/db/schema'
```

### Database Operations
```typescript
import { db } from '@/lib/db/connection'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Type-safe query
const user = await db.select().from(users).where(eq(users.id, userId))

// Type-safe insert
const newUser: NewUser = {
  clerkUserId: 'clerk_123',
  email: 'user@example.com',
  preferences: {}
}
await db.insert(users).values(newUser)
```

## Schema Validation

The schema includes validation utilities to ensure correctness:

```typescript
import { validateSchemaStructure } from '@/lib/db/schema/schema-validation'

const validation = validateSchemaStructure()
console.log(validation.isValid) // true if all tables are properly defined
```

## Migration Support

### Generate Migrations
```bash
pnpm db:generate
```

### Apply Migrations
```bash
pnpm db:migrate
```

### Database Studio
```bash
pnpm db:studio
```

## Schema Evolution

### Adding New Tables
1. Create new schema file in appropriate domain directory
2. Define table with proper types and constraints
3. Add relationships in `relations.ts`
4. Export from `index.ts`
5. Generate and apply migration

### Modifying Existing Tables
1. Update schema definition
2. Generate migration with `pnpm db:generate`
3. Review generated SQL
4. Apply migration with `pnpm db:migrate`

## Best Practices

### Naming Conventions
- **Tables**: snake_case (e.g., `organization_memberships`)
- **Columns**: snake_case (e.g., `created_at`)
- **Types**: PascalCase (e.g., `User`, `NewUser`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `SYSTEM_ROLES`)

### Index Strategy
- Primary keys are automatically indexed
- Add indexes for foreign keys
- Create composite indexes for common query patterns
- Monitor query performance and add indexes as needed

### JSON Fields
- Use for flexible, schema-less data
- Validate structure in application code
- Consider extracting to separate tables if queried frequently

### Relationships
- Define all relationships in `relations.ts` to avoid circular dependencies
- Use appropriate cascade policies (`cascade`, `set null`, `restrict`)
- Consider performance impact of deep joins

## Testing

Schema validation tests ensure correctness:

```bash
pnpm test lib/db/schema/__tests__/schema-validation.test.ts
```

## Troubleshooting

### Common Issues

1. **Circular Dependencies**: Define relations in separate file
2. **Type Errors**: Ensure proper imports and type definitions
3. **Migration Failures**: Check for breaking changes and data conflicts
4. **Performance Issues**: Review indexes and query patterns

### Debug Tools

- Use `pnpm db:studio` for visual database exploration
- Enable query logging in development
- Use `EXPLAIN ANALYZE` for query performance analysis

## Integration with Existing Code

This schema is designed to work alongside the existing Supabase client-based code during the migration period. The migration strategy allows for gradual adoption:

1. **Phase 1**: Schema definition and validation (current)
2. **Phase 2**: Repository layer implementation
3. **Phase 3**: Service layer migration
4. **Phase 4**: API route updates
5. **Phase 5**: Legacy code removal

## Documentation

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Design Patterns](../../../docs/database-design.md)