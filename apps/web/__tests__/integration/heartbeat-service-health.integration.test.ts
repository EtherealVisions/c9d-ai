/**
 * Heartbeat service health integration tests (real PostgreSQL when configured).
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { recordHeartbeat, getLatestHeartbeat } from '@/lib/heartbeat/repository'
import { evaluateHealthFromLastSeen } from '@/lib/heartbeat/evaluate-health'

const hasDb =
  !!process.env.DATABASE_URL ||
  (!!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!hasDb)('heartbeat service health (integration)', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'development'
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
