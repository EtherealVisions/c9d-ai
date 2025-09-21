# Code Validation Agent

## Purpose

This agent specializes in maintaining code quality, TypeScript compliance, and consistent formatting across the Coordinated.App application.

## Validation Workflow

### Pre-Commit Checklist

1. `pnpm type-check` - Ensure no TypeScript errors
2. `pnpm lint` - Check for linting issues
3. `pnpm format` - Apply consistent formatting
4. `pnpm build` - Verify production build works

### Continuous Validation

- Keep dev server running to catch errors early
- Fix issues immediately, don't accumulate technical debt
- Never use `@ts-ignore` without justification

## TypeScript Best Practices

### Type Definitions

```typescript
// ✅ Good - Explicit types
interface UserProfile {
  id: string;
  email: string;
  role: "PARENT" | "INSTRUCTOR" | "ADMIN";
  metadata?: Record<string, unknown>;
}

// ❌ Bad - Using any
const processData = (data: any) => {
  /* ... */
};

// ✅ Good - Use unknown for truly unknown types
const processData = (data: unknown) => {
  // Validate/narrow the type
  if (isValidData(data)) {
    // Now data is properly typed
  }
};
```

### Prisma Type Usage

```typescript
// Import generated types
import { User, Prisma } from "@/lib/generated/prisma";

// Use Prisma types for database operations
const createUser = async (data: Prisma.UserCreateInput): Promise<User> => {
  return await prisma.user.create({ data });
};

// Use utility types
type UserWithProfile = Prisma.UserGetPayload<{
  include: { parentProfile: true };
}>;
```

### Component Props

```typescript
// Define props interface
interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

// Use in component
export function Button({ variant = "primary", size = "md", children, ...props }: ButtonProps) {
  // Implementation
}
```

## Linting Rules

### ESLint Configuration

- Extends Next.js recommended rules
- Enforces consistent code style
- Catches common React mistakes

### Common Issues to Fix

```typescript
// ❌ Missing dependencies in useEffect
useEffect(() => {
  fetchData(userId)
}, []) // Missing userId

// ✅ Include all dependencies
useEffect(() => {
  fetchData(userId)
}, [userId])

// ❌ Using array index as key
items.map((item, index) => <Item key={index} />)

// ✅ Use stable, unique keys
items.map((item) => <Item key={item.id} />)
```

## Code Formatting

### Prettier Configuration

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### Import Organization

```typescript
// 1. React imports
import React, { useState, useEffect } from "react";

// 2. Third-party imports
import { useRouter } from "next/navigation";
import { format } from "date-fns";

// 3. Local imports
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// 4. Type imports
import type { User } from "@/types";
```

## Error Handling Patterns

### Try-Catch Blocks

```typescript
// ✅ Good - Specific error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  if (error instanceof ValidationError) {
    return { success: false, error: error.message };
  }

  console.error("Unexpected error:", error);
  return { success: false, error: "An unexpected error occurred" };
}

// ❌ Bad - Swallowing errors
try {
  return await riskyOperation();
} catch (error) {
  // Don't ignore errors
}
```

### Async/Await Best Practices

```typescript
// ✅ Good - Proper error handling
const fetchUserData = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    logger.error("Failed to fetch user:", error);
    throw error;
  }
};

// ❌ Bad - No error handling
const fetchUserData = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
};
```

## Performance Checks

### Bundle Size

- Monitor bundle size with `pnpm build`
- Use dynamic imports for large components
- Tree-shake unused code

### React Performance

```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // Component logic
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

## Testing Validation

### Type Safety in Tests

```typescript
// Use proper types in mocks
const mockUser: User = {
  id: "123",
  clerkId: "clerk_123",
  email: "test@example.com",
  role: "PARENT",
  // ... all required fields
};

// Type-safe mocking
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
    },
  },
}));
```

## Common Validation Commands

```bash
# TypeScript validation
pnpm type-check

# Linting
pnpm lint
pnpm lint --fix  # Auto-fix issues

# Formatting
pnpm format

# Full validation
pnpm type-check && pnpm lint && pnpm build

# Watch mode for development
pnpm dev  # Catches errors as you code
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: pnpm install

- name: Type check
  run: pnpm type-check

- name: Lint
  run: pnpm lint

- name: Build
  run: pnpm build
```
