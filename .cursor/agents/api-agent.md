# API Development Agent

## Purpose

This agent specializes in creating consistent, secure, and well-documented API routes for the Coordinated.App application using Next.js App Router.

## Core Principles

### API Route Structure

- Place all API routes in `app/api/` directory
- Use route groups for logical organization
- Follow RESTful conventions when appropriate
- Implement proper error handling

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
import { prisma } from "@/lib/db";
import { z } from "zod";

// GET - List resources
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resources = await prisma.resource.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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

    const body = await request.json();
    const validatedData = createSchema.parse(body);

    const resource = await prisma.resource.create({
      data: {
        ...validatedData,
        userId,
      },
    });

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
import { prisma } from "@/lib/db";

// GET - Single resource
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resource = await prisma.resource.findFirst({
      where: {
        id: params.id,
        userId,
      },
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
```

## Authentication & Authorization

### Clerk Integration

```typescript
import { auth, currentUser } from "@clerk/nextjs";

// Basic auth check
const { userId } = auth();
if (!userId) {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

// Get full user details
const user = await currentUser();
if (!user) {
  return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
}
```

### Role-Based Access

```typescript
// Check user role from database
const dbUser = await prisma.user.findUnique({
  where: { clerkId: userId },
});

if (dbUser?.role !== "ADMIN") {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}
```

## Validation

### Using Zod

```typescript
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(120),
  role: z.enum(["PARENT", "INSTRUCTOR", "ADMIN"]),
});

try {
  const data = schema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { success: false, error: "Validation error", details: error.errors },
      { status: 400 }
    );
  }
}
```

## Error Handling

### Standard Error Responses

```typescript
// 400 - Bad Request
return NextResponse.json({ success: false, error: "Invalid input data" }, { status: 400 });

// 401 - Unauthorized
return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

// 403 - Forbidden
return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });

// 404 - Not Found
return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });

// 500 - Internal Server Error
return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
```

## Best Practices

### Security

- Always validate input data
- Use parameterized queries (Prisma handles this)
- Implement rate limiting for public endpoints
- Sanitize error messages (don't expose internals)
- Check ownership before allowing operations

### Performance

- Use database indexes for frequently queried fields
- Implement pagination for list endpoints
- Use `select` to limit returned fields
- Cache responses when appropriate

### Documentation

- Add JSDoc comments to all endpoints
- Document expected request/response formats
- Include example requests in comments
- Note any rate limits or restrictions

## Testing Template

```typescript
// __tests__/api/resource.test.ts
import { GET, POST } from "@/app/api/resource/route";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/db";

jest.mock("@clerk/nextjs");
jest.mock("@/lib/db");

describe("/api/resource", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 when not authenticated", async () => {
      (auth as jest.Mock).mockReturnValue({ userId: null });

      const request = new Request("http://localhost/api/resource");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });
});
```
