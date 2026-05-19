/**
 * API route tests for heartbeat and status endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as heartbeatGet } from '../../app/api/internal/heartbeat/route'

describe('/api/internal/heartbeat', () => {
  const cronSecret = 'test-cron-secret-minimum-32-chars!!'

  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', cronSecret)
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns 401 without bearer token', async () => {
    const req = new NextRequest('http://localhost/api/internal/heartbeat')
    const res = await heartbeatGet(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong bearer token', async () => {
    const req = new NextRequest('http://localhost/api/internal/heartbeat', {
      headers: { Authorization: 'Bearer wrong-token' },
    })
    const res = await heartbeatGet(req)
    expect(res.status).toBe(401)
  })

  it('skips writes outside production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const req = new NextRequest('http://localhost/api/internal/heartbeat', {
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    const res = await heartbeatGet(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe('non-production')
  })
})
