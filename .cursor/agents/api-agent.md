# API Development Agent

## Purpose

This agent specializes in creating consistent, secure, and well-documented API routes for the Coordinated.App application using Next.js App Router with Drizzle ORM.

## Core Principles

### API Route Structure

- Place all API routes in `app/api/` directory
- Use route groups for logical organization
- Follow RESTful conventions when appropriate
- Implement proper error handling
- Focus on integration testing over unit testing

### Standard Response Format

```typescript
// Success Response
{
  success: true,
  data: any,
  message?: string
}

// Error Response
{
  success: false,
  error: string,
  code?: string,
  details?: any
}
```

## Route Patterns

### Basic CRUD Template

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db/connection";
import { resources } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

// GET - List resources
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const resources = await db.query.resources.findMany({
      where: eq(resources.userId, user.id),
      orderBy: [desc(resources.createdAt)],
      with: {
        relatedData: true
      }
    });

    return NextResponse.json({
      success: true,
      data: resources,
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create resource
const createSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createSchema.parse(body);

    const [resource] = await db.insert(resources).values({
      ...validatedData,
      userId: user.id,
    }).returning();

    return NextResponse.json(
      {
        success: true,
        data: resource,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating resource:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
```

### Dynamic Route Template

```typescript
// app/api/[resource]/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db/connection";
import { resources, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET - Single resource
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, params.id),
        eq(resources.userId, user.id)
      ),
      with: {
        relatedData: true
      }
    });

    if (!resource) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    console.error("Error fetching resource:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update resource
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const [updated] = await db
      .update(resources)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(resources.id, params.id),
        eq(resources.userId, user.id)
      ))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating resource:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete resource
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId)
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const [deleted] = await db
      .delete(resources)
      .where(and(
        eq(resources.id, params.id),
        eq(resources.userId, user.id)
      ))
      .returning();

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
```

## Authentication & Authorization

### Clerk Integration with Database User

```typescript
import { auth, currentUser } from "@clerk/nextjs";
import { db } from "@/lib/db/connection";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Helper to get database user from Clerk auth
export async function getAuthenticatedUser() {
  const { userId: clerkId } = auth();
  
  if (!clerkId) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    with: {
      parentProfile: true,
      instructorProfile: true,
    }
  });

  return user;
}

// Use in API routes
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Check role-based access
  if (user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // Continue with authorized request...
}
```

## Validation

### Using Zod with Drizzle Types

```typescript
import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users, bookings } from "@/lib/db/schema";

// Generate Zod schemas from Drizzle tables
const insertUserSchema = createInsertSchema(users);
const selectUserSchema = createSelectSchema(users);

// Customize generated schemas
const createBookingSchema = createInsertSchema(bookings, {
  scheduledAt: z.string().datetime().transform(str => new Date(str)),
  notes: z.string().max(500).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Use in API routes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createBookingSchema.parse(body);
    
    const [booking] = await db.insert(bookings).values(data).returning();
    
    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

## Error Handling

### Database Error Handling

```typescript
import { DatabaseError } from "@/lib/errors/custom-errors";

export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>
): Promise<NextResponse> {
  try {
    const result = await operation();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // PostgreSQL error codes
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string; detail?: string };
      
      switch (pgError.code) {
        case '23505': // Unique violation
          return NextResponse.json(
            { success: false, error: "Resource already exists", code: "DUPLICATE" },
            { status: 409 }
          );
        case '23503': // Foreign key violation
          return NextResponse.json(
            { success: false, error: "Invalid reference", code: "INVALID_REFERENCE" },
            { status: 400 }
          );
        case '23502': // Not null violation
          return NextResponse.json(
            { success: false, error: "Required field missing", code: "MISSING_FIELD" },
            { status: 400 }
          );
      }
    }
    
    console.error("Database operation failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

## Integration Testing for API Routes

### Test Helpers

```typescript
// __tests__/helpers/api-test-helpers.ts
import { NextRequest } from "next/server";
import { headers } from "next/headers";

export function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function authenticatedRequest(
  url: string,
  clerkUserId: string,
  options: RequestInit = {}
): Promise<NextRequest> {
  // Mock Clerk auth for testing
  jest.mock('@clerk/nextjs', () => ({
    auth: () => ({ userId: clerkUserId }),
  }));
  
  return createMockRequest(url, options);
}
```

### Integration Test Example

```typescript
// __tests__/api/bookings.integration.test.ts
import { GET, POST } from '@/app/api/bookings/route';
import { db } from '@/lib/db/connection';
import { users, instructorProfiles, bookings } from '@/lib/db/schema';
import { createMockRequest } from '../helpers/api-test-helpers';
import { sql } from 'drizzle-orm';

describe('Bookings API Integration Tests', () => {
  let testUser: any;
  let testInstructor: any;

  beforeEach(async () => {
    // Clean test data
    await db.delete(bookings).where(sql`true`);
    await db.delete(users).where(sql`email LIKE '%@api-test.example.com'`);

    // Create test users
    [testUser] = await db.insert(users).values({
      email: `parent-${Date.now()}@api-test.example.com`,
      clerkId: `clerk_test_${Date.now()}`,
      role: 'PARENT',
    }).returning();

    [testInstructor] = await db.insert(users).values({
      email: `instructor-${Date.now()}@api-test.example.com`,
      clerkId: `clerk_instructor_${Date.now()}`,
      role: 'INSTRUCTOR',
    }).returning();
  });

  afterEach(async () => {
    // Cleanup
    await db.delete(bookings).where(sql`true`);
    await db.delete(users).where(sql`email LIKE '%@api-test.example.com'`);
  });

  describe('GET /api/bookings', () => {
    test('returns user bookings from real database', async () => {
      // Create test booking
      const [booking] = await db.insert(bookings).values({
        parentId: testUser.id,
        instructorId: testInstructor.id,
        scheduledAt: new Date('2024-12-01T10:00:00Z'),
        status: 'CONFIRMED',
      }).returning();

      // Mock auth
      jest.mock('@clerk/nextjs', () => ({
        auth: () => ({ userId: testUser.clerkId }),
      }));

      // Make request
      const request = createMockRequest('/api/bookings');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe(booking.id);
    });

    test('handles concurrent requests properly', async () => {
      jest.mock('@clerk/nextjs', () => ({
        auth: () => ({ userId: testUser.clerkId }),
      }));

      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() => 
        GET(createMockRequest('/api/bookings'))
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);

      // All should succeed
      expect(statuses).toEqual([200, 200, 200, 200, 200]);
    });
  });

  describe('POST /api/bookings', () => {
    test('creates booking in database with validation', async () => {
      const bookingData = {
        instructorId: testInstructor.id,
        scheduledAt: '2024-12-01T10:00:00Z',
        duration: 60,
        notes: 'First lesson',
      };

      jest.mock('@clerk/nextjs', () => ({
        auth: () => ({ userId: testUser.clerkId }),
      }));

      const request = createMockRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.instructorId).toBe(testInstructor.id);

      // Verify in database
      const dbBooking = await db.query.bookings.findFirst({
        where: eq(bookings.id, data.data.id)
      });
      
      expect(dbBooking).toBeTruthy();
      expect(dbBooking?.notes).toBe('First lesson');
    });

    test('handles validation errors', async () => {
      const invalidData = {
        // Missing required fields
        notes: 'Invalid booking',
      };

      jest.mock('@clerk/nextjs', () => ({
        auth: () => ({ userId: testUser.clerkId }),
      }));

      const request = createMockRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });
  });
});
```

## Best Practices

### Security

- Always validate input data with Zod
- Use parameterized queries (Drizzle handles this)
- Implement rate limiting for public endpoints
- Sanitize error messages (don't expose internals)
- Check ownership before allowing operations
- Use database transactions for multi-step operations

### Performance

- Use database indexes for frequently queried fields
- Implement pagination for list endpoints
- Use `select` to limit returned fields
- Cache responses when appropriate
- Use connection pooling (handled by Drizzle)

### Testing

- Focus on integration tests with real database
- Test concurrent operations for race conditions
- Verify database state after operations
- Test error scenarios and edge cases
- Use idempotent test data (timestamped emails, etc.)

### Documentation

- Add JSDoc comments to all endpoints
- Document expected request/response formats
- Include example requests in comments
- Note any rate limits or restrictions
- Keep OpenAPI spec updated