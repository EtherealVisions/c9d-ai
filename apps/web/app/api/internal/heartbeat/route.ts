import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/connection'
import { verifyCronAuth } from '@/lib/heartbeat/verify-cron-auth'
import { recordHeartbeat } from '@/lib/heartbeat/repository'
import { evaluateHealthFromLastSeen } from '@/lib/heartbeat/evaluate-health'
import { HEARTBEAT_SERVICE_NAME, HEARTBEAT_SOURCE } from '@/lib/heartbeat/constants'

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
    const status = evaluateHealthFromLastSeen(now)
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
