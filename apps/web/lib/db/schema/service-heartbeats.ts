/**
 * Service heartbeat schema for platform liveness tracking.
 */

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

export const serviceHeartbeatEvents = pgTable(
  'service_heartbeat_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serviceName: text('service_name').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    status: text('status').notNull(),
    latencyMs: integer('latency_ms'),
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    serviceOccurredIdx: index('service_heartbeat_events_service_occurred_idx').on(
      table.serviceName,
      table.occurredAt,
    ),
  }),
)

export type ServiceHeartbeat = InferSelectModel<typeof serviceHeartbeats>
export type NewServiceHeartbeat = InferInsertModel<typeof serviceHeartbeats>
export type ServiceHeartbeatEvent = InferSelectModel<typeof serviceHeartbeatEvents>
export type NewServiceHeartbeatEvent = InferInsertModel<typeof serviceHeartbeatEvents>
