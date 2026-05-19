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
