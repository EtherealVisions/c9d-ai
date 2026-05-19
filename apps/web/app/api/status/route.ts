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
