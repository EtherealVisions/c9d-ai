# Data Layer Architecture

This document describes the data layer architecture of the C9D AI platform, including models, transformers, and database interaction patterns.

## Overview

The data layer follows a structured approach with clear separation between database representations and application models:

- **Database Rows**: Snake_case PostgreSQL table structures
- **Application Models**: CamelCase TypeScript interfaces
- **Transformers**: Bidirectional conversion utilities
- **Services**: Business logic and data access layer

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │    │   Transformers   │    │  Application    │
│   (snake_case)  │◄──►│   (Conversion)   │◄──►│  (camelCase)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐            ┌──────────┐           ┌──────────┐
    │ UserRow │            │transform │           │   User   │
    │ OrgRow  │            │functions │           │   Org    │
    │ etc.    │            │          │           │   etc.   │
    └─────────┘            └──────────┘           └──────────┘
```

## Models and Types

### Location
- **Types**: `apps/web/lib/models/types.ts`
- **Transformers**: `apps/web/lib/models/transformers.ts`

### Core Models

#### User Model
```typescript
// Database representation (snake_case)
interface UserRow {
  id: string
  clerk_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Application model (camelCase)
interface User {
  id: string
  clerkUserId: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  preferences: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
```

#### Organization Model
```typescript
// Database representation
interface OrganizationRow {
  id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  metadata: Record<string, unknown>
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

// Application model
interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  avatarUrl?: string
  metadata: Record<string, unknown>
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
```

## Transformers

### Purpose
Transformers handle the conversion between database rows and application models, ensuring:
- **Type Safety**: Proper TypeScript type conversion
- **Data Integrity**: Consistent null/undefined handling
- **Performance**: Efficient conversion without data loss

### Key Functions

#### User Transformers
```typescript
// Database row → Application model
export function transformUserRow(row: UserRow): User {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    email: row.email,
    firstName: row.first_name || undefined,
    lastName: row.last_name || undefined,
    avatarUrl: row.avatar_url || undefined,
    preferences: row.preferences,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// Application model → Database row
export function transformUserToRow(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Omit<UserRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    clerk_user_id: user.clerkUserId,
    email: user.email,
    first_name: user.firstName ?? null,
    last_name: user.lastName ?? null,
    avatar_url: user.avatarUrl ?? null,
    preferences: user.preferences
  }
}
```

#### Organization Transformers
```typescript
// Database row → Application model
export function transformOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    avatarUrl: row.avatar_url || undefined,
    metadata: row.metadata,
    settings: row.settings,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// Application model → Database row
export function transformOrganizationToRow(org: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: org.name,
    slug: org.slug,
    description: org.description ?? null,  // ✅ Uses nullish coalescing
    avatar_url: org.avatarUrl ?? null,     // ✅ Uses nullish coalescing
    metadata: org.metadata,
    settings: org.settings
  }
}
```

### Nullish Coalescing Operator (`??`)

The transformers use the nullish coalescing operator (`??`) instead of logical OR (`||`) for better null/undefined handling:

```typescript
// ❌ Problematic with logical OR
description: org.description || null  // Converts empty string "" to null

// ✅ Correct with nullish coalescing
description: org.description ?? null  // Only converts null/undefined to null
```

**Benefits**:
- **Preserves falsy values**: Empty strings, `0`, `false` are preserved
- **Type safety**: Better TypeScript inference
- **Data integrity**: Maintains original data intent
- **Consistency**: Uniform handling across all transformers

### Utility Functions

#### Array Transformations
```typescript
// Transform arrays of database rows
export function transformRows<TRow, TModel>(
  rows: TRow[],
  transformer: (row: TRow) => TModel
): TModel[] {
  return rows.map(transformer)
}

// Usage
const users = transformRows(userRows, transformUserRow)
```

#### Safe Transformations
```typescript
// Handle potentially null rows
export function transformRowSafe<TRow, TModel>(
  row: TRow | null,
  transformer: (row: TRow) => TModel
): TModel | null {
  return row ? transformer(row) : null
}

// Usage
const user = transformRowSafe(userRow, transformUserRow)
```

## Service Layer Integration

### Usage in Services
```typescript
// apps/web/lib/services/user-service.ts
import { transformUserRow, transformUserToRow } from '@/lib/models/transformers'

export class UserService {
  static async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new DatabaseError('Failed to fetch user', error)
    return data ? transformUserRow(data) : null
  }
  
  static async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const row = transformUserToRow(userData)
    
    const { data, error } = await supabase
      .from('users')
      .insert(row)
      .select()
      .single()
    
    if (error) throw new DatabaseError('Failed to create user', error)
    return transformUserRow(data)
  }
}
```

## Best Practices

### 1. Consistent Null Handling
```typescript
// ✅ Use nullish coalescing for optional fields
avatar_url: user.avatarUrl ?? null

// ❌ Avoid logical OR for optional fields
avatar_url: user.avatarUrl || null
```

### 2. Type Safety
```typescript
// ✅ Use proper TypeScript types
export function transformUserRow(row: UserRow): User

// ❌ Avoid any types
export function transformUserRow(row: any): any
```

### 3. Date Handling
```typescript
// ✅ Convert string dates to Date objects
createdAt: new Date(row.created_at)

// ✅ Convert Date objects to ISO strings
created_at: user.createdAt.toISOString()
```

### 4. Error Handling
```typescript
// ✅ Handle transformation errors gracefully
export function transformRowSafe<TRow, TModel>(
  row: TRow | null,
  transformer: (row: TRow) => TModel
): TModel | null {
  try {
    return row ? transformer(row) : null
  } catch (error) {
    console.error('Transformation error:', error)
    return null
  }
}
```

## Testing

The data layer includes comprehensive tests to ensure data integrity and transformation accuracy. All tests are located in `apps/web/__tests__/unit/models/transformers.test.ts`.

### Running Tests

```bash
# Run all transformer tests
pnpm test:run --filter=@c9d/web -- transformers

# Run in watch mode during development
pnpm test --filter=@c9d/web -- transformers

# Run with coverage
pnpm test:coverage --filter=@c9d/web -- transformers
```

### Unit Tests
```typescript
// __tests__/unit/models/transformers.test.ts
import { transformUserRow, transformUserToRow } from '@/lib/models/transformers'

describe('User Transformers', () => {
  it('should transform user row to model', () => {
    const row: UserRow = {
      id: '1',
      clerk_user_id: 'clerk_123',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      avatar_url: 'https://example.com/avatar.jpg',
      preferences: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
    
    const user = transformUserRow(row)
    
    expect(user.id).toBe('1')
    expect(user.clerkUserId).toBe('clerk_123')
    expect(user.firstName).toBe('John')
    expect(user.createdAt).toBeInstanceOf(Date)
  })
  
  it('should handle null values correctly', () => {
    const row: UserRow = {
      id: '1',
      clerk_user_id: 'clerk_123',
      email: 'test@example.com',
      first_name: null,
      last_name: null,
      avatar_url: null,
      preferences: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
    
    const user = transformUserRow(row)
    
    expect(user.firstName).toBeUndefined()
    expect(user.lastName).toBeUndefined()
    expect(user.avatarUrl).toBeUndefined()
  })
})
```

### Integration Tests
```typescript
// __tests__/integration/models/transformers.integration.test.ts
describe('Transformer Integration', () => {
  it('should maintain data integrity through round-trip conversion', async () => {
    const originalUser = {
      clerkUserId: 'clerk_123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      preferences: { theme: 'dark' }
    }
    
    // Convert to row format
    const row = transformUserToRow(originalUser)
    
    // Simulate database storage and retrieval
    const retrievedRow = { ...row, id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    
    // Convert back to model
    const convertedUser = transformUserRow(retrievedRow)
    
    expect(convertedUser.clerkUserId).toBe(originalUser.clerkUserId)
    expect(convertedUser.email).toBe(originalUser.email)
    expect(convertedUser.firstName).toBe(originalUser.firstName)
  })
})
```

## Migration Guide

### Updating Existing Code

When updating transformers or models:

1. **Update the transformer functions** first
2. **Run tests** to ensure compatibility
3. **Update service layer** if needed
4. **Update API routes** that use the models
5. **Update frontend components** if model structure changes

### Adding New Models

1. **Define database row interface** in `types.ts`
2. **Define application model interface** in `types.ts`
3. **Create transformer functions** in `transformers.ts`
4. **Add unit tests** for the transformers
5. **Create service class** if needed
6. **Document the new model** in this guide

## Performance Considerations

### Efficient Transformations
- **Batch transformations**: Use `transformRows` for arrays
- **Lazy evaluation**: Only transform when needed
- **Memoization**: Cache transformed results when appropriate
- **Type guards**: Use TypeScript for compile-time optimization

### Memory Management
- **Avoid deep cloning**: Transform in-place when safe
- **Garbage collection**: Don't hold references to large objects
- **Streaming**: Use streaming for large datasets

## Security Considerations

### Data Sanitization
- **Input validation**: Validate data before transformation
- **Output filtering**: Remove sensitive fields in transformers
- **Type safety**: Use TypeScript to prevent injection attacks

### Access Control
- **Field filtering**: Remove unauthorized fields during transformation
- **Role-based access**: Apply different transformations based on user roles
- **Audit logging**: Log data access and transformations

## Troubleshooting

### Common Issues

1. **Type errors**: Ensure transformer signatures match model interfaces
2. **Null handling**: Use nullish coalescing (`??`) instead of logical OR (`||`)
3. **Date conversion**: Always convert string dates to Date objects
4. **Missing fields**: Ensure all required fields are included in transformations

### Debugging

```typescript
// Add logging to transformers for debugging
export function transformUserRow(row: UserRow): User {
  console.log('Transforming user row:', row)
  
  const user = {
    // ... transformation logic
  }
  
  console.log('Transformed user:', user)
  return user
}
```

## Future Improvements

### Planned Enhancements
- **Validation**: Add runtime validation using Zod schemas
- **Serialization**: Optimize JSON serialization/deserialization
- **Caching**: Add transformation result caching
- **Streaming**: Support streaming transformations for large datasets
- **Type generation**: Auto-generate transformers from database schema

### Contributing

When contributing to the data layer:
1. Follow the established patterns and conventions
2. Add comprehensive tests for new transformers
3. Update documentation for new models or changes
4. Ensure type safety and null handling consistency
5. Consider performance implications of changes

This data layer architecture provides a robust foundation for type-safe, efficient data handling throughout the C9D AI platform.