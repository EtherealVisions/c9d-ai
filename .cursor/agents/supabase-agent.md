# Supabase Database Conventions Agent

## Purpose

This agent specializes in maintaining consistent database naming conventions and best practices for Supabase/PostgreSQL databases in the Coordinated.App application using Drizzle ORM.

## Core Conventions

### Table Naming with Drizzle

```typescript
// apps/web/lib/db/schema/users.ts
import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'

// ✅ Good - Table name is automatically snake_case
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  isActive: boolean('is_active').default(true),
  hasVerifiedEmail: boolean('has_verified_email').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ✅ Good - Composite table names
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
})

// ❌ Bad - Using camelCase in table name
export const userProfiles = pgTable('userProfiles', { // Should be 'user_profiles'
  // ...
})
```

### Column Naming Conventions

```typescript
import { pgTable, text, boolean, timestamp, decimal, uuid, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  // Primary keys
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Regular columns - TypeScript camelCase, database snake_case
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  
  // Boolean columns - use is_, has_, or can_ prefix
  isActive: boolean('is_active').notNull().default(true),
  hasVerifiedEmail: boolean('has_verified_email').notNull().default(false),
  canTeach: boolean('can_teach').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  
  // Foreign keys - use tableName_id pattern
  organizationId: uuid('organization_id').references(() => organizations.id),
  createdById: uuid('created_by_id').references(() => users.id),
}, (table) => {
  return {
    // Indexes follow idx_tablename_columns pattern
    emailIdx: index('idx_users_email').on(table.email),
    organizationIdx: index('idx_users_organization_id').on(table.organizationId),
    createdAtIdx: index('idx_users_created_at').on(table.createdAt),
  }
})
```

### Complex Schema Example

```typescript
// apps/web/lib/db/schema/bookings.ts
import { pgTable, text, timestamp, decimal, uuid, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const bookingStatusEnum = pgEnum('booking_status', [
  'PENDING',
  'CONFIRMED', 
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW'
])

// Main table with all conventions
export const bookings = pgTable('bookings', {
  // IDs
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull(),
  parentId: uuid('parent_id').notNull(),
  childId: uuid('child_id').notNull(),
  instructorId: uuid('instructor_id').notNull(),
  
  // Enum usage
  status: bookingStatusEnum('status').notNull().default('PENDING'),
  
  // Timestamps with timezone
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  
  // Money fields - use decimal for currency
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean('is_paid').notNull().default(false),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  
  // Text fields
  notes: text('notes'),
  cancellationReason: text('cancellation_reason'),
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Single column indexes
    sessionIdx: index('idx_bookings_session_id').on(table.sessionId),
    parentIdx: index('idx_bookings_parent_id').on(table.parentId),
    instructorIdx: index('idx_bookings_instructor_id').on(table.instructorId),
    statusIdx: index('idx_bookings_status').on(table.status),
    scheduledAtIdx: index('idx_bookings_scheduled_at').on(table.scheduledAt),
    
    // Composite indexes for common queries
    sessionStatusIdx: index('idx_bookings_session_status').on(table.sessionId, table.status),
    parentScheduledIdx: index('idx_bookings_parent_scheduled').on(table.parentId, table.scheduledAt),
    instructorScheduledIdx: index('idx_bookings_instructor_scheduled').on(table.instructorId, table.scheduledAt),
    
    // Unique constraints
    sessionChildScheduledUniq: uniqueIndex('uniq_bookings_session_child_scheduled')
      .on(table.sessionId, table.childId, table.scheduledAt),
  }
})

// Relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
  session: one(swimSessions, {
    fields: [bookings.sessionId],
    references: [swimSessions.id],
  }),
  parent: one(users, {
    fields: [bookings.parentId],
    references: [users.id],
  }),
  child: one(children, {
    fields: [bookings.childId],
    references: [children.id],
  }),
  instructor: one(users, {
    fields: [bookings.instructorId],
    references: [users.id],
  }),
}))
```

## PostgreSQL Data Types in Drizzle

### Common Type Mappings

```typescript
import { 
  pgTable, 
  text, 
  varchar, 
  char,
  integer, 
  bigint, 
  smallint, 
  decimal, 
  real, 
  doublePrecision,
  boolean,
  timestamp, 
  date, 
  time,
  json, 
  jsonb,
  uuid,
  serial,
  bigserial
} from 'drizzle-orm/pg-core'

export const examples = pgTable('examples', {
  // Text types
  shortText: varchar('short_text', { length: 255 }),
  longText: text('long_text'),
  fixedText: char('fixed_text', { length: 10 }),
  
  // Numeric types
  count: integer('count').notNull().default(0),
  bigCount: bigint('big_count', { mode: 'number' }),
  smallCount: smallint('small_count'),
  price: decimal('price', { precision: 10, scale: 2 }),
  score: real('score'),
  preciseScore: doublePrecision('precise_score'),
  
  // Boolean
  isActive: boolean('is_active').notNull().default(true),
  
  // Date/Time types (always use timezone)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  birthDate: date('birth_date'),
  appointmentTime: time('appointment_time', { withTimezone: true }),
  
  // JSON types (prefer jsonb for performance)
  metadata: jsonb('metadata').default({}),
  settings: json('settings'),
  
  // UUIDs
  id: uuid('id').defaultRandom().primaryKey(),
  externalId: uuid('external_id'),
  
  // Serial types (auto-incrementing)
  sequenceNumber: serial('sequence_number'),
  bigSequenceNumber: bigserial('big_sequence_number'),
})
```

### Array Types

```typescript
import { pgTable, text, integer, uuid } from 'drizzle-orm/pg-core'

export const instructorProfiles = pgTable('instructor_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique(),
  
  // Array columns
  specialties: text('specialties').array().notNull().default([]),
  certifications: text('certifications').array().notNull().default([]),
  availableDays: integer('available_days').array().default([]), // 0-6 for days
  spokenLanguages: text('spoken_languages').array().default(['English']),
})
```

## Supabase-Specific Patterns

### Row Level Security (RLS) with Drizzle

```sql
-- After running Drizzle migrations, add RLS policies

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid()::text = clerk_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid()::text = clerk_id);

-- Policy: Parents can see their own bookings
CREATE POLICY "Parents can view own bookings" ON bookings
  FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );

-- Policy: Instructors can see bookings they're teaching
CREATE POLICY "Instructors can view their bookings" ON bookings
  FOR SELECT
  USING (
    instructor_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );
```

### Realtime Subscriptions

```typescript
// Design tables with realtime in mind
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Indexes for realtime queries
    userUnreadIdx: index('idx_notifications_user_unread')
      .on(table.userId, table.isRead, table.createdAt),
    createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  }
})

// Enable realtime
-- SQL: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Supabase Functions Integration

```typescript
// Call Supabase Edge Functions from Drizzle queries
import { sql } from 'drizzle-orm'

// Call a Supabase function
const nearbyInstructors = await db.execute(sql`
  SELECT * FROM find_nearby_instructors(
    ${userLat}::float,
    ${userLng}::float,
    ${radiusKm}::int
  )
`)

// Create database function for complex queries
export async function createDistanceFunction() {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION calculate_distance(
      lat1 float, lng1 float,
      lat2 float, lng2 float
    ) RETURNS float AS $$
    BEGIN
      RETURN ST_DistanceSphere(
        ST_MakePoint(lng1, lat1)::geography,
        ST_MakePoint(lng2, lat2)::geography
      ) / 1000; -- Return km
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `)
}
```

### Audit Trail Pattern

```typescript
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),
  action: text('action').notNull(), // CREATE, UPDATE, DELETE
  userId: uuid('user_id').notNull(),
  changes: jsonb('changes').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    tableRecordIdx: index('idx_audit_logs_table_record').on(table.tableName, table.recordId),
    userIdx: index('idx_audit_logs_user_id').on(table.userId),
    createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
  }
})

// Trigger for automatic audit logging
export async function createAuditTrigger(tableName: string) {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION audit_trigger_function()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO audit_logs (table_name, record_id, action, user_id, changes)
      VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        current_setting('app.current_user_id')::uuid,
        jsonb_build_object(
          'old', row_to_json(OLD),
          'new', row_to_json(NEW)
        )
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER audit_${tableName}
    AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
  `)
}
```

## Migration Best Practices

### Safe Migration Pattern

```typescript
// migrations/0001_add_phone_to_users.sql
-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN phone_number text;

-- Step 2: Add check constraint for format
ALTER TABLE users ADD CONSTRAINT check_phone_format 
  CHECK (phone_number ~ '^\\+?[1-9]\\d{1,14}$' OR phone_number IS NULL);

-- Step 3: Create index
CREATE INDEX idx_users_phone_number ON users(phone_number);

-- Step 4: After backfilling, make required if needed
-- ALTER TABLE users ALTER COLUMN phone_number SET NOT NULL;
```

### Index Creation

```typescript
// Always create indexes concurrently in production
await db.execute(sql`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_scheduled_at 
  ON bookings(scheduled_at)
`)
```

## Performance Patterns

### Efficient Queries with Drizzle

```typescript
import { eq, and, gte, sql, desc } from 'drizzle-orm'

// ✅ Good - Use indexes effectively
const upcomingBookings = await db
  .select({
    id: bookings.id,
    scheduledAt: bookings.scheduledAt,
    instructorName: sql`${users.firstName} || ' ' || ${users.lastName}`,
  })
  .from(bookings)
  .innerJoin(users, eq(bookings.instructorId, users.id))
  .where(and(
    eq(bookings.parentId, parentId),
    eq(bookings.status, 'CONFIRMED'),
    gte(bookings.scheduledAt, new Date())
  ))
  .orderBy(desc(bookings.scheduledAt))
  .limit(10)

// ✅ Good - Use partial indexes for specific queries
export const activeBookingsIdx = index('idx_bookings_active')
  .on(bookings.scheduledAt)
  .where(sql`status = 'CONFIRMED' AND scheduled_at >= NOW()`)

// ❌ Bad - Full text search without proper index
const results = await db
  .select()
  .from(bookings)
  .where(sql`notes ILIKE ${`%${searchTerm}%`}`)
```

### Connection Pooling with Supabase

```typescript
// lib/db/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Use connection string with pooling
const connectionString = process.env.DATABASE_URL!

// For Supabase, use connection pooling
const queryClient = postgres(connectionString, {
  max: 10, // Maximum connections
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(queryClient, { schema })
```

## Common Mistakes to Avoid

1. **Wrong table names** - Always use plural, snake_case
2. **Missing timezone** - Always use `withTimezone: true` for timestamps
3. **Wrong boolean prefixes** - Use is_, has_, or can_
4. **Missing indexes** - Add indexes for all foreign keys and query fields
5. **Using SERIAL with UUID** - Pick one ID strategy
6. **Not using JSONB** - Prefer jsonb over json for performance
7. **Missing RLS policies** - Always add RLS for user-facing tables
8. **Incorrect money type** - Use decimal for currency, not float
9. **No audit trail** - Add created_at, updated_at to all tables
10. **Bad index names** - Follow idx_tablename_columns pattern