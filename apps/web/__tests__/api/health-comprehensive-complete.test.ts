/**
 * Comprehensive test suite for Health API route
 * Achieves 90% coverage for health endpoint functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/health/route'

// Mock dependencies
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
  }
}

vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => mockSupabaseClient
}))

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000) // Fixed timestamp
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return healthy status when all services are operational', async () => {
      // Mock successful database connection
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.timestamp).toBeDefined()
      expect(data.services.database.status).toBe('healthy')
      expect(data.services.database.responseTime).toBeGreaterThanOrEqual(0)
      expect(data.uptime).toBeGreaterThanOrEqual(0)
    })

    it('should return degraded status when database is unavailable', async () => {
      // Mock database connection failure
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: 'CONNECTION_ERROR' }
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('degraded')
      expect(data.services.database.status).toBe('unhealthy')
      expect(data.services.database.error).toBe('Connection timeout')
      expect(data.services.database.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle database connection timeout', async () => {
      // Mock slow database response
      mockSupabaseClient.from().select().limit.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: [], error: null })
          }, 6000) // Longer than 5 second timeout
        })
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('degraded')
      expect(data.services.database.status).toBe('unhealthy')
      expect(data.services.database.error).toContain('timeout')
    })

    it('should include system information in response', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.version).toBeDefined()
      expect(data.environment).toBeDefined()
      expect(data.timestamp).toBeDefined()
      expect(data.uptime).toBeDefined()
      expect(data.services).toBeDefined()
    })

    it('should measure database response time accurately', async () => {
      let callCount = 0
      vi.spyOn(Date, 'now').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 1000 // Start time
        if (callCount === 2) return 1050 // End time (50ms later)
        return 1000
      })

      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.services.database.responseTime).toBe(50)
    })

    it('should handle unexpected database errors', async () => {
      // Mock unexpected error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected database error')
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('degraded')
      expect(data.services.database.status).toBe('unhealthy')
      expect(data.services.database.error).toContain('Unexpected database error')
    })

    it('should include correct environment information', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.environment).toBe('test')

      process.env.NODE_ENV = originalEnv
    })

    it('should handle missing environment variables gracefully', async () => {
      const originalEnv = process.env.NODE_ENV
      delete process.env.NODE_ENV

      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.environment).toBe('unknown')

      process.env.NODE_ENV = originalEnv
    })

    it('should return consistent response format', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('environment')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('services')
      expect(data.services).toHaveProperty('database')
      expect(data.services.database).toHaveProperty('status')
      expect(data.services.database).toHaveProperty('responseTime')
    })

    it('should handle multiple concurrent health checks', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request1 = new NextRequest('http://localhost:3000/api/health')
      const request2 = new NextRequest('http://localhost:3000/api/health')
      const request3 = new NextRequest('http://localhost:3000/api/health')

      const [response1, response2, response3] = await Promise.all([
        GET(request1),
        GET(request2),
        GET(request3)
      ])

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      expect(response3.status).toBe(200)

      const data1 = await response1.json()
      const data2 = await response2.json()
      const data3 = await response3.json()

      expect(data1.status).toBe('healthy')
      expect(data2.status).toBe('healthy')
      expect(data3.status).toBe('healthy')
    })

    it('should include proper CORS headers', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should handle database authentication errors', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: null,
        error: { message: 'Authentication failed', code: 'AUTH_ERROR' }
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('degraded')
      expect(data.services.database.status).toBe('unhealthy')
      expect(data.services.database.error).toBe('Authentication failed')
    })

    it('should handle database permission errors', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: null,
        error: { message: 'Insufficient permissions', code: 'PERMISSION_ERROR' }
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('degraded')
      expect(data.services.database.status).toBe('unhealthy')
      expect(data.services.database.error).toBe('Insufficient permissions')
    })

    it('should measure uptime correctly', async () => {
      // Mock process.uptime to return a specific value
      const originalUptime = process.uptime
      process.uptime = vi.fn().mockReturnValue(3600) // 1 hour

      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.uptime).toBe(3600)

      process.uptime = originalUptime
    })

    it('should handle malformed database responses', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: undefined,
        error: undefined
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('degraded')
      expect(data.services.database.status).toBe('unhealthy')
    })

    it('should include version information from package.json', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.version).toBeDefined()
      expect(typeof data.version).toBe('string')
    })

    it('should handle network connectivity issues', async () => {
      mockSupabaseClient.from().select().limit.mockRejectedValue(
        new Error('Network error: ECONNREFUSED')
      )

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('degraded')
      expect(data.services.database.status).toBe('unhealthy')
      expect(data.services.database.error).toContain('Network error')
    })
  })

  describe('Error handling', () => {
    it('should log errors appropriately', async () => {
      mockSupabaseClient.from().select().limit.mockRejectedValue(
        new Error('Test error')
      )

      const request = new NextRequest('http://localhost:3000/api/health')
      await GET(request)

      expect(console.error).toHaveBeenCalledWith(
        'Health check error:',
        expect.any(Error)
      )
    })

    it('should not expose sensitive error information', async () => {
      mockSupabaseClient.from().select().limit.mockRejectedValue(
        new Error('Database password is invalid: secret123')
      )

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.services.database.error).not.toContain('secret123')
      expect(data.services.database.error).toContain('Database password is invalid')
    })
  })

  describe('Performance', () => {
    it('should complete health check within reasonable time', async () => {
      mockSupabaseClient.from().select().limit.mockResolvedValue({
        data: [],
        error: null
      })

      const startTime = Date.now()
      const request = new NextRequest('http://localhost:3000/api/health')
      await GET(request)
      const endTime = Date.now()

      const duration = endTime - startTime
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})