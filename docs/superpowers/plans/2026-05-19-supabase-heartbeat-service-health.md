# Supabase Heartbeat & Service Health System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-only Vercel Cron heartbeat that writes to Supabase Postgres (via Drizzle), prevents Supabase inactivity pausing, and exposes `/api/status` for computed platform health.

**Architecture:** Add `service_heartbeats` (canonical upsert per service) and `service_heartbeat_events` (append-only audit trail). A secured internal route (`GET /api/internal/heartbeat`) runs daily in production only, measures DB round-trip latency, and persists results. A public status route (`GET /api/status`) reads the canonical row and maps `last_seen_at` age to `pass` / `warn` / `fail`. Database access uses the existing Drizzle `db` singleton (service-role `DATABASE_URL`), not the browser Supabase client.

**Tech Stack:** Next.js App Router, Drizzle ORM, PostgreSQL (Supabase), Vercel Cron, Vitest integration tests with real Postgres.

---

## Context & Codebase Fit

| Area | Current state | Plan action |
|------|---------------|-------------|
| DB access | `apps/web/lib/db/connection.ts` → Drizzle on Supabase Postgres | Reuse `db` for writes/reads |
| Migrations | Drizzle (`apps/web/lib/db/migrations/`) + Supabase SQL (`supabase/migrations/`) | Both must be updated |
| Health today | `/api/health` = config manager liveness | Keep separate; add `/api/status` |
| Cron | `apps/web/vercel.json` has `"crons": []` | Add daily heartbeat cron |
| Auth middleware | Clerk protects most `/api/*` | Mark heartbeat + status routes public; cron uses `CRON_SECRET` |
| Env config | `apps/web/env.config.json` | Add `CRON_SECRET` |

**Canonical service name:** `supabase` (constant `HEARTBEAT_SERVICE_NAME`).

**Health thresholds (hours since `last_seen_at`):**

| Status | Condition |
|--------|-----------|
| `pass` | `< 26` |
| `warn` | `>= 26` and `< 48` |
| `fail` | `>= 48` |

Cron schedule `0 5 * * *` ⇒ max gap ~24h in normal operation; thresholds give buffer before `fail`.

---

## File Map

| File | Responsibility |
|------|----------------|
| `apps/web/lib/db/schema/service-heartbeats.ts` | Drizzle table definitions + types |
| `apps/web/lib/db/schema/index.ts` | Export new schema |
| `apps/web/lib/db/schema/relations.ts` | Optional relations (events → none FK required) |
| `supabase/migrations/20260519000000_service_heartbeats.sql` | SQL tables + RLS |
| `apps/web/lib/heartbeat/constants.ts` | Service name, source, thresholds |
| `apps/web/lib/heartbeat/evaluate-health.ts` | `pass` / `warn` / `fail` from timestamp |
| `apps/web/lib/heartbeat/verify-cron-auth.ts` | Bearer `CRON_SECRET` validation |
| `apps/web/lib/heartbeat/repository.ts` | Upsert + event insert + read latest |
| `apps/web/lib/heartbeat/types.ts` | Shared TS types for API responses |
| `apps/web/app/api/internal/heartbeat/route.ts` | Cron target (GET) |
| `apps/web/app/api/status/route.ts` | Public health read (GET) |
| `apps/web/vercel.json` | Cron entry |
| `apps/web/middleware.ts` | Public route matchers |
| `apps/web/env.config.json` | `CRON_SECRET` definition |
| `apps/web/__tests__/integration/heartbeat-service-health.integration.test.ts` | Real DB integration tests |
| `apps/web/__tests__/api/heartbeat-status.api.test.ts` | Route auth + response shape (mock repo where needed) |
| `docs/vercel-deployment.md` | Post-verify: document env + cron (after implementation proven) |

---

## API Contracts

### `GET /api/internal/heartbeat`

**Auth:** `Authorization: Bearer <CRON_SECRET>` → else `401`.

**Production guard:** If `process.env.VERCEL_ENV !== 'production'`, return `200` with `{ skipped: true, reason: 'non-production' }` and **no DB writes**.

**Success `200`:**

```json
{
  "service": "supabase",
  "status": "pass",
  "lastSeenAt": "2026-05-19T05:00:01.123Z",
  "latencyMs": 42,
  "environment": "production",
  "deploymentId": "dpl_xxx",
  "source": "vercel-cron"
}
```

**Failure `503`:** DB error with safe message (no secrets).

### `GET /api/status`

**Auth:** Public (no Clerk).

**Success `200`:**

```json
{
  "overall": "pass",
  "checkedAt": "2026-05-19T12:00:00.000Z",
  "services": [
    {
      "serviceName": "supabase",
      "status": "pass",
      "lastSeenAt": "2026-05-19T05:00:01.123Z",
      "ageHours": 7.0,
      "latencyMs": 42,
      "environment": "production",
      "source": "vercel-cron"
    }
  ]
}
```

**No heartbeat row yet:** `overall: "fail"`, `services: []` or explicit `unknown` entry.

---

## Security & RLS

- Enable RLS on both tables in Supabase migration.
- **No** `SELECT`/`INSERT` policies for `anon` or `authenticated` roles (server uses `DATABASE_URL` / service role, bypasses RLS).
- Do not expose these tables via PostgREST to the anon key.
- `CRON_SECRET`: min 32 chars, stored only in Vercel Production env (and Phase production app).

---

## Task 1: Drizzle Schema

**Files:**
- Create: `apps/web/lib/db/schema/service-heartbeats.ts`
- Modify: `apps/web/lib/db/schema/index.ts`
- Modify: `apps/web/lib/db/schema/relations.ts` (if exporting schema object)

- [ ] **Step 1: Add Drizzle schema**

```typescript
// apps/web/lib/db/schema/service-heartbeats.ts
import { pgTable, text, timestamp, integer, jsonb, uuid, index } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const serviceHeartbeats = pgTable('service_heartbeats', {
  serviceName: text('service_name').primaryKey(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
  source: text('source').notNull(),
  environment: text('environment').notNull(),
  status: text('status').notNull(),
  latencyMs: integer('latency_ms'),
  deploymentId: text('deployment_id'),
  metadata: jsonb('metadata').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const serviceHeartbeatEvents = pgTable('service_heartbeat_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceName: text('service_name').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  status: text('status').notNull(),
  latencyMs: integer('latency_ms'),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  serviceOccurredIdx: index('service_heartbeat_events_service_occurred_idx').on(
    table.serviceName,
    table.occurredAt,
  ),
}))

export type ServiceHeartbeat = InferSelectModel<typeof serviceHeartbeats>
export type NewServiceHeartbeat = InferInsertModel<typeof serviceHeartbeats>
export type ServiceHeartbeatEvent = InferSelectModel<typeof serviceHeartbeatEvents>
export type NewServiceHeartbeatEvent = InferInsertModel<typeof serviceHeartbeatEvents>
```

- [ ] **Step 2: Export from `index.ts`**

Add:

```typescript
export * from './service-heartbeats'
```

And register tables in the `schema` const + `TABLE_NAMES`.

- [ ] **Step 3: Generate Drizzle migration**

Run:

```bash
cd /workspace && pnpm db:generate
```

Expected: new SQL file under `apps/web/lib/db/migrations/` creating both tables.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/db/schema/service-heartbeats.ts apps/web/lib/db/schema/index.ts apps/web/lib/db/migrations/
git commit -m "feat(db): add service heartbeat schema"
```

---

## Task 2: Supabase SQL Migration (RLS)

**Files:**
- Create: `supabase/migrations/20260519000000_service_heartbeats.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Service heartbeat tables for platform liveness (server-side writes only)
CREATE TABLE IF NOT EXISTS service_heartbeats (
  service_name text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL,
  source text NOT NULL,
  environment text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  deployment_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_heartbeat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  occurred_at timestamptz NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS service_heartbeat_events_service_occurred_idx
  ON service_heartbeat_events (service_name, occurred_at DESC);

ALTER TABLE service_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_heartbeat_events ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only service_role / direct Postgres (Drizzle) may access.
```

- [ ] **Step 2: Apply locally (if Supabase CLI available)**

```bash
supabase db push
# or: pnpm db:migrate (Drizzle path for local dev DB)
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260519000000_service_heartbeats.sql
git commit -m "feat(supabase): service heartbeat tables with RLS enabled"
```

---

## Task 3: Heartbeat Library

**Files:**
- Create: `apps/web/lib/heartbeat/constants.ts`
- Create: `apps/web/lib/heartbeat/evaluate-health.ts`
- Create: `apps/web/lib/heartbeat/verify-cron-auth.ts`
- Create: `apps/web/lib/heartbeat/types.ts`
- Create: `apps/web/lib/heartbeat/repository.ts`

- [ ] **Step 1: Constants**

```typescript
// apps/web/lib/heartbeat/constants.ts
export const HEARTBEAT_SERVICE_NAME = 'supabase' as const
export const HEARTBEAT_SOURCE = 'vercel-cron' as const

export const HEALTH_PASS_MAX_HOURS = 26
export const HEALTH_WARN_MAX_HOURS = 48
```

- [ ] **Step 2: Health evaluation**

```typescript
// apps/web/lib/heartbeat/evaluate-health.ts
import { HEALTH_PASS_MAX_HOURS, HEALTH_WARN_MAX_HOURS } from './constants'

export type HealthStatus = 'pass' | 'warn' | 'fail'

export function evaluateHealthFromLastSeen(lastSeenAt: Date, now = new Date()): HealthStatus {
  const ageHours = (now.getTime() - lastSeenAt.getTime()) / (1000 * 60 * 60)
  if (ageHours < HEALTH_PASS_MAX_HOURS) return 'pass'
  if (ageHours < HEALTH_WARN_MAX_HOURS) return 'warn'
  return 'fail'
}

export function ageHoursFromLastSeen(lastSeenAt: Date, now = new Date()): number {
  return (now.getTime() - lastSeenAt.getTime()) / (1000 * 60 * 60)
}
```

- [ ] **Step 3: Cron auth helper**

```typescript
// apps/web/lib/heartbeat/verify-cron-auth.ts
import { NextRequest } from 'next/server'

export function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice('Bearer '.length).trim()
  return token.length > 0 && token === secret
}
```

- [ ] **Step 4: Repository**

```typescript
// apps/web/lib/heartbeat/repository.ts
import { db } from '@/lib/db/connection'
import { serviceHeartbeats, serviceHeartbeatEvents } from '@/lib/db/schema/service-heartbeats'
import { eq } from 'drizzle-orm'
import { HEARTBEAT_SERVICE_NAME } from './constants'
import type { HealthStatus } from './evaluate-health'

export type RecordHeartbeatInput = {
  status: HealthStatus
  latencyMs: number
  environment: string
  deploymentId?: string
  source: string
  metadata?: Record<string, unknown>
}

export async function recordHeartbeat(input: RecordHeartbeatInput) {
  const now = new Date()
  const metadata = input.metadata ?? {}

  await db
    .insert(serviceHeartbeats)
    .values({
      serviceName: HEARTBEAT_SERVICE_NAME,
      lastSeenAt: now,
      source: input.source,
      environment: input.environment,
      status: input.status,
      latencyMs: input.latencyMs,
      deploymentId: input.deploymentId,
      metadata,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: serviceHeartbeats.serviceName,
      set: {
        lastSeenAt: now,
        source: input.source,
        environment: input.environment,
        status: input.status,
        latencyMs: input.latencyMs,
        deploymentId: input.deploymentId,
        metadata,
        updatedAt: now,
      },
    })

  await db.insert(serviceHeartbeatEvents).values({
    serviceName: HEARTBEAT_SERVICE_NAME,
    occurredAt: now,
    status: input.status,
    latencyMs: input.latencyMs,
    metadata,
  })
}

export async function getLatestHeartbeat(serviceName = HEARTBEAT_SERVICE_NAME) {
  const [row] = await db
    .select()
    .from(serviceHeartbeats)
    .where(eq(serviceHeartbeats.serviceName, serviceName))
    .limit(1)
  return row ?? null
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/heartbeat/
git commit -m "feat(heartbeat): repository, auth, and health evaluation"
```

---

## Task 4: Internal Heartbeat API Route

**Files:**
- Create: `apps/web/app/api/internal/heartbeat/route.ts`

- [ ] **Step 1: Implement route**

```typescript
// apps/web/app/api/internal/heartbeat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/heartbeat/verify-cron-auth'
import { recordHeartbeat } from '@/lib/heartbeat/repository'
import { evaluateHealthFromLastSeen } from '@/lib/heartbeat/evaluate-health'
import { HEARTBEAT_SERVICE_NAME, HEARTBEAT_SOURCE } from '@/lib/heartbeat/constants'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/connection'

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({
      skipped: true,
      reason: 'non-production',
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    })
  }

  const started = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
    const latencyMs = Date.now() - started
    const now = new Date()
    const status = evaluateHealthFromLastSeen(now) // fresh beat => pass
    const environment = process.env.VERCEL_ENV ?? 'production'
    const deploymentId = process.env.VERCEL_DEPLOYMENT_ID

    await recordHeartbeat({
      status,
      latencyMs,
      environment,
      deploymentId,
      source: HEARTBEAT_SOURCE,
      metadata: { trigger: 'cron' },
    })

    return NextResponse.json({
      service: HEARTBEAT_SERVICE_NAME,
      status,
      lastSeenAt: now.toISOString(),
      latencyMs,
      environment,
      deploymentId,
      source: HEARTBEAT_SOURCE,
    })
  } catch (error) {
    console.error('[Heartbeat] failed', error)
    return NextResponse.json(
      { error: 'Heartbeat failed', service: HEARTBEAT_SERVICE_NAME },
      { status: 503 },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/internal/heartbeat/route.ts
git commit -m "feat(api): internal cron heartbeat endpoint"
```

---

## Task 5: Status API Route

**Files:**
- Create: `apps/web/app/api/status/route.ts`

- [ ] **Step 1: Implement route**

```typescript
// apps/web/app/api/status/route.ts
import { NextResponse } from 'next/server'
import { getLatestHeartbeat } from '@/lib/heartbeat/repository'
import {
  evaluateHealthFromLastSeen,
  ageHoursFromLastSeen,
} from '@/lib/heartbeat/evaluate-health'

export async function GET() {
  const checkedAt = new Date().toISOString()
  const row = await getLatestHeartbeat()

  if (!row) {
    return NextResponse.json({
      overall: 'fail',
      checkedAt,
      services: [],
    })
  }

  const lastSeenAt = new Date(row.lastSeenAt)
  const status = evaluateHealthFromLastSeen(lastSeenAt)

  return NextResponse.json({
    overall: status,
    checkedAt,
    services: [
      {
        serviceName: row.serviceName,
        status,
        lastSeenAt: lastSeenAt.toISOString(),
        ageHours: Math.round(ageHoursFromLastSeen(lastSeenAt) * 10) / 10,
        latencyMs: row.latencyMs,
        environment: row.environment,
        source: row.source,
      },
    ],
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/status/route.ts
git commit -m "feat(api): public service status endpoint"
```

---

## Task 6: Middleware, Vercel Cron, Environment

**Files:**
- Modify: `apps/web/middleware.ts`
- Modify: `apps/web/vercel.json`
- Modify: `apps/web/env.config.json`

- [ ] **Step 1: Add public routes in middleware**

In `routeProtection` Map, add:

```typescript
[/^\/api\/internal\/heartbeat/, ProtectionLevel.PUBLIC],
[/^\/api\/status/, ProtectionLevel.PUBLIC],
```

In `isPublicRoute` matcher array, add:

```typescript
'/api/internal/heartbeat',
'/api/status',
```

- [ ] **Step 2: Configure Vercel cron**

In `apps/web/vercel.json`, replace `"crons": []` with:

```json
"crons": [
  {
    "path": "/api/internal/heartbeat",
    "schedule": "0 5 * * *"
  }
]
```

- [ ] **Step 3: Add `CRON_SECRET` to env config**

In `apps/web/env.config.json` → `optional` array:

```json
{
  "name": "CRON_SECRET",
  "description": "Bearer secret for Vercel Cron invocations of internal heartbeat",
  "type": "string",
  "sensitive": true,
  "validation": { "minLength": 32 }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/middleware.ts apps/web/vercel.json apps/web/env.config.json
git commit -m "chore: wire cron, public routes, and CRON_SECRET env"
```

---

## Task 7: Integration Tests (Real Postgres)

**Files:**
- Create: `apps/web/__tests__/integration/heartbeat-service-health.integration.test.ts`

Follow existing pattern in `real-database-integration.test.ts`: skip when `DATABASE_URL` / Supabase creds unavailable; use unique metadata in rows; clean up events if needed.

- [ ] **Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { recordHeartbeat, getLatestHeartbeat } from '@/lib/heartbeat/repository'
import { evaluateHealthFromLastSeen } from '@/lib/heartbeat/evaluate-health'

const hasDb =
  !!process.env.DATABASE_URL ||
  (!!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!hasDb)('heartbeat service health (integration)', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'development' // force real connection if configured
  })

  it('records heartbeat and reads it back', async () => {
    const unique = `test-${Date.now()}`
    await recordHeartbeat({
      status: 'pass',
      latencyMs: 1,
      environment: 'test',
      source: 'integration-test',
      metadata: { unique },
    })

    const row = await getLatestHeartbeat()
    expect(row).not.toBeNull()
    expect(row!.status).toBe('pass')
    expect((row!.metadata as { unique?: string }).unique).toBe(unique)
  })

  it('evaluates warn and fail thresholds', () => {
    const now = new Date()
    const pass = new Date(now.getTime() - 25 * 60 * 60 * 1000)
    const warn = new Date(now.getTime() - 30 * 60 * 60 * 1000)
    const fail = new Date(now.getTime() - 50 * 60 * 60 * 1000)
    expect(evaluateHealthFromLastSeen(pass)).toBe('pass')
    expect(evaluateHealthFromLastSeen(warn)).toBe('warn')
    expect(evaluateHealthFromLastSeen(fail)).toBe('fail')
  })
})
```

- [ ] **Step 2: Run integration test**

```bash
cd /workspace/apps/web && pnpm vitest run __tests__/integration/heartbeat-service-health.integration.test.ts
```

Expected: PASS when DB configured; SKIP otherwise.

- [ ] **Step 3: Commit**

```bash
git add apps/web/__tests__/integration/heartbeat-service-health.integration.test.ts
git commit -m "test: heartbeat integration against real postgres"
```

---

## Task 8: API Route Tests (Auth & Production Guard)

**Files:**
- Create: `apps/web/__tests__/api/heartbeat-status.api.test.ts`

- [ ] **Step 1: Test unauthorized heartbeat**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as heartbeatGet } from '../../app/api/internal/heartbeat/route'

describe('/api/internal/heartbeat', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret-minimum-32-chars!!')
    vi.stubEnv('VERCEL_ENV', 'production')
  })

  it('returns 401 without bearer token', async () => {
    const req = new NextRequest('http://localhost/api/internal/heartbeat')
    const res = await heartbeatGet(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong bearer token', async () => {
    const req = new NextRequest('http://localhost/api/internal/heartbeat', {
      headers: { Authorization: 'Bearer wrong' },
    })
    const res = await heartbeatGet(req)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Test non-production skip**

```typescript
it('skips writes outside production', async () => {
  vi.stubEnv('VERCEL_ENV', 'preview')
  const req = new NextRequest('http://localhost/api/internal/heartbeat', {
    headers: { Authorization: 'Bearer test-cron-secret-minimum-32-chars!!' },
  })
  const res = await heartbeatGet(req)
  const body = await res.json()
  expect(res.status).toBe(200)
  expect(body.skipped).toBe(true)
})
```

- [ ] **Step 3: Run tests**

```bash
cd /workspace/apps/web && pnpm vitest run __tests__/api/heartbeat-status.api.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/__tests__/api/heartbeat-status.api.test.ts
git commit -m "test: heartbeat route auth and production guard"
```

---

## Task 9: Production Verification Checklist

Run after deploy to Vercel **production** (documentation update only after these pass).

- [ ] **Step 1: Set `CRON_SECRET` in Vercel Production**

```bash
vercel env add CRON_SECRET production
```

- [ ] **Step 2: Apply migrations to production Supabase**

Run Drizzle migrate / Supabase migration against production DB (team process).

- [ ] **Step 3: Manual cron invoke**

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://<production-domain>/api/internal/heartbeat"
```

Expected: `200`, `skipped` false, `latencyMs` present.

- [ ] **Step 4: Verify status endpoint**

```bash
curl -sS "https://<production-domain>/api/status"
```

Expected: `overall: "pass"`, `services[0].serviceName: "supabase"`.

- [ ] **Step 5: Verify unauthorized blocked**

```bash
curl -sS -o /dev/null -w "%{http_code}" "https://<production-domain>/api/internal/heartbeat"
```

Expected: `401`.

- [ ] **Step 6: Confirm row in Supabase**

Query `service_heartbeats` where `service_name = 'supabase'` and recent `service_heartbeat_events` row.

- [ ] **Step 7: Update deployment docs** (only after Steps 1–6 succeed)

Add section to `docs/vercel-deployment.md` covering `CRON_SECRET`, cron schedule, and `/api/status` semantics.

---

## Spec Coverage Self-Review

| Requirement | Task |
|-------------|------|
| Vercel Cron scheduled heartbeat | Task 6 (`vercel.json`) |
| Invokes `/api/internal/heartbeat` | Task 4 |
| Production-only execution | Task 4, Task 8 |
| `CRON_SECRET` Bearer validation → 401 | Task 3, 4, 8 |
| Upsert `service_heartbeats` | Task 1, 3, 4 |
| Insert `service_heartbeat_events` | Task 1, 3, 4 |
| Record timestamp, latency, deployment ID, environment | Task 3, 4 |
| Health pass/warn/fail thresholds | Task 3, 5 |
| Structured JSON heartbeat response | Task 4 |
| `GET /api/status` | Task 5 |
| Cron schedule `0 5 * * *` | Task 6 |
| Acceptance: unauthorized blocked | Task 8, 9 |
| Acceptance: Supabase writes queryable | Task 7, 9 |

**Out of scope (future):** event retention/cleanup job, multi-service registry, status UI page, alerting webhooks.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Clerk middleware blocks cron | Public route entries (Task 6) |
| Preview/staging cron writes test data | `VERCEL_ENV === 'production'` guard |
| Drizzle vs Supabase migration drift | Update both; run `pnpm db:generate` after schema |
| Missing `CRON_SECRET` in prod | Fail closed (401); document in Task 9 |
| `system_metrics` table name confusion | New dedicated tables per spec |

---

## Execution Handoff

**Plan saved to:** `docs/superpowers/plans/2026-05-19-supabase-heartbeat-service-health.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task with review between tasks.
2. **Inline Execution** — implement tasks sequentially in one session with checkpoints after Tasks 3, 6, and 9.
