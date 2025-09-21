# Supabase Database Conventions Agent

## Purpose

This agent specializes in maintaining consistent database naming conventions and best practices for Supabase/PostgreSQL databases in the Coordinated.App application.

## Core Conventions

### Table Naming

```prisma
// ✅ Good - Plural, snake_case
model User {
  // ...
  @@map("users")
}

model SwimSession {
  // ...
  @@map("swim_sessions")
}

// ✅ Good - Singular for join tables
model BookingParticipant {
  // ...
  @@map("booking_participant")
}

// ❌ Bad - PascalCase, no mapping
model UserProfile {
  // No @@map directive
}
```

### Column Naming

```prisma
model User {
  // ✅ Good - Consistent mapping
  id              String   @id @default(cuid())
  firstName       String   @map("first_name")
  lastName        String   @map("last_name")
  isActive        Boolean  @default(true) @map("is_active")
  hasVerifiedEmail Boolean @default(false) @map("has_verified_email")
  canTeach        Boolean  @default(false) @map("can_teach")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  // Foreign keys
  organizationId  String   @map("organization_id")

  @@map("users")
}
```

### Complex Schema Example

```prisma
// Enum with proper mapping
enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW

  @@map("booking_status")
}

// Main table with all conventions
model Booking {
  id              String        @id @default(cuid())
  sessionId       String        @map("session_id")
  parentId        String        @map("parent_id")
  childId         String        @map("child_id")
  instructorId    String        @map("instructor_id")

  status          BookingStatus @default(PENDING)
  scheduledAt     DateTime      @map("scheduled_at")
  completedAt     DateTime?     @map("completed_at")
  cancelledAt     DateTime?     @map("cancelled_at")

  // Money fields
  amount          Decimal       @db.Decimal(10, 2)
  isPaid          Boolean       @default(false) @map("is_paid")
  paidAt          DateTime?     @map("paid_at")

  // Metadata
  notes           String?       @db.Text
  cancellationReason String?    @map("cancellation_reason") @db.Text

  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  // Relations
  session         SwimSession   @relation(fields: [sessionId], references: [id])
  parent          ParentProfile @relation(fields: [parentId], references: [id])
  child           Child         @relation(fields: [childId], references: [id])
  instructor      InstructorProfile @relation(fields: [instructorId], references: [id])

  // Indexes
  @@index([sessionId], name: "idx_bookings_session_id")
  @@index([parentId], name: "idx_bookings_parent_id")
  @@index([instructorId], name: "idx_bookings_instructor_id")
  @@index([status], name: "idx_bookings_status")
  @@index([scheduledAt], name: "idx_bookings_scheduled_at")
  @@index([createdAt], name: "idx_bookings_created_at")

  // Composite indexes
  @@index([sessionId, status], name: "idx_bookings_session_status")
  @@index([parentId, status, scheduledAt], name: "idx_bookings_parent_status_scheduled")

  // Constraints
  @@unique([sessionId, childId, scheduledAt], name: "uniq_bookings_session_child_scheduled")

  @@map("bookings")
}
```

## PostgreSQL Data Types

### Common Mappings

```prisma
model Example {
  // Text types
  shortText       String        @db.VarChar(255)
  longText        String        @db.Text
  fixedText       String        @db.Char(10)

  // Numeric types
  integer         Int           @db.Integer
  bigInteger      BigInt        @db.BigInt
  smallInteger    Int           @db.SmallInt
  decimal         Decimal       @db.Decimal(10, 2)
  money           Decimal       @db.Money

  // Date/Time types
  date            DateTime      @db.Date
  time            DateTime      @db.Time
  timestamp       DateTime      @db.Timestamp(3)
  timestampTz     DateTime      @db.Timestamptz(3)

  // JSON types
  metadata        Json          @db.JsonB
  settings        Json          @db.Json

  // Array types
  tags            String[]      @db.Text
  numbers         Int[]         @db.Integer

  // UUID
  uuid            String        @db.Uuid @default(dbgenerated("gen_random_uuid()"))

  @@map("examples")
}
```

## Supabase-Specific Patterns

### Row Level Security (RLS)

```sql
-- Create policy for users to see their own data
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = clerk_id);

-- Create policy for instructors to see their bookings
CREATE POLICY "Instructors can view their bookings"
ON public.bookings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.instructor_profiles
    WHERE instructor_profiles.id = bookings.instructor_id
    AND instructor_profiles.user_id = auth.uid()
  )
);
```

### Realtime Subscriptions

```prisma
// Design tables with realtime in mind
model Notification {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  type        String
  title       String
  message     String   @db.Text
  isRead      Boolean  @default(false) @map("is_read")
  readAt      DateTime? @map("read_at")
  createdAt   DateTime @default(now()) @map("created_at")

  // Index for realtime queries
  @@index([userId, isRead, createdAt], name: "idx_notifications_user_unread")

  @@map("notifications")
}
```

### Audit Trail Pattern

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  tableName   String   @map("table_name")
  recordId    String   @map("record_id")
  action      String   // CREATE, UPDATE, DELETE
  userId      String   @map("user_id")
  changes     Json     @db.JsonB
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent") @db.Text
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([tableName, recordId], name: "idx_audit_logs_table_record")
  @@index([userId], name: "idx_audit_logs_user")
  @@index([createdAt], name: "idx_audit_logs_created")

  @@map("audit_logs")
}
```

## Migration Best Practices

### Safe Column Addition

```prisma
// Step 1: Add nullable column
model User {
  // ... existing fields
  phoneNumber String? @map("phone_number")
}

// Step 2: Backfill data via script

// Step 3: Make required if needed
model User {
  // ... existing fields
  phoneNumber String @map("phone_number")
}
```

### Index Creation

```sql
-- Create index concurrently to avoid locking
CREATE INDEX CONCURRENTLY idx_bookings_scheduled_at
ON public.bookings(scheduled_at);
```

## Performance Considerations

### Efficient Queries

```typescript
// ✅ Good - Use indexes
const upcomingBookings = await prisma.booking.findMany({
  where: {
    instructorId: instructorId,
    status: "CONFIRMED",
    scheduledAt: {
      gte: new Date(),
    },
  },
  orderBy: {
    scheduledAt: "asc",
  },
  include: {
    child: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  },
});

// ❌ Bad - No index usage
const bookings = await prisma.booking.findMany({
  where: {
    notes: {
      contains: "swimming",
    },
  },
});
```

### Pagination Pattern

```typescript
const PAGE_SIZE = 20;

const getBookings = async (page: number) => {
  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count(),
  ]);

  return {
    data: bookings,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
};
```

## Common Mistakes to Avoid

1. **Missing @map() directives** - Always map camelCase to snake_case
2. **Incorrect foreign key names** - Use `{table_singular}_id` pattern
3. **Missing indexes** - Add indexes for all foreign keys and query fields
4. **Wrong boolean prefixes** - Use is*, has*, or can\_
5. **Inconsistent timestamps** - Always include created_at, updated_at
6. **No soft deletes** - Consider deleted_at for important data
7. **Missing constraints** - Add unique constraints where needed
