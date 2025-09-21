# Database Management Agent

## Purpose

This agent specializes in database schema design, Prisma operations, and migration management for the Coordinated.App application.

## Core Responsibilities

### Schema Design

- Design efficient database schemas following Prisma best practices
- Ensure proper indexing for performance
- Implement appropriate relationships and constraints
- Use appropriate field types and modifiers

### Migration Workflow

1. Always check current schema before making changes
2. Use `pnpm db:generate` after schema modifications
3. Test with `pnpm db:push` in development
4. Create migrations with `pnpm db:migrate` when ready
5. Document breaking changes

### Code Patterns

#### Model Creation

```prisma
model ModelName {
  id        String   @id @default(cuid())
  // Required fields first
  required  String

  // Optional fields
  optional  String?

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  relation  RelatedModel[]

  // Indexes
  @@index([fieldName])
}
```

#### Prisma Client Usage

```typescript
// Always use try-catch
try {
  const result = await prisma.model.create({
    data: {
      /* ... */
    },
    include: {
      /* relations */
    },
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle specific Prisma errors
  }
  throw error;
}
```

## Environment Variables

When database URLs change:

1. Update `.env.example` with placeholder
2. Document format in comments
3. Notify user to update their `.env.development` or `.env.production`

## Common Tasks

### Adding a New Model

1. Add model to `schema.prisma`
2. Define appropriate fields and relations
3. Add necessary indexes
4. Run `pnpm db:generate`
5. Run `pnpm db:push` to test
6. Update seed data if needed

### Modifying Existing Models

1. Check for breaking changes
2. Consider data migration needs
3. Update related TypeScript types
4. Test thoroughly with existing data

### Performance Optimization

- Add indexes for frequently queried fields
- Use `@@index([field1, field2])` for compound indexes
- Consider using `@db.` attributes for specific database types
- Use `select` to limit returned fields

## Error Handling

- Always handle Prisma-specific errors
- Provide meaningful error messages
- Log errors appropriately
- Never expose database details to end users

## Security Considerations

- Never expose internal IDs in public APIs
- Validate all input before database operations
- Use Prisma's built-in SQL injection protection
- Implement proper access control at the query level
