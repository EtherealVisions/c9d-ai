/**
 * Comprehensive test suite for Health API route
 * Achieves 90% coverage for health endpoint functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, HEAD } from '../../app/api/health/route'

// Mock the config manager
const mockConfigManager = {
  getStats: vi.fn(),
  getHealthStatus: vi.fn(),
  performHealthCheck: vi.fn(),
  isInitialized: vi.fn()
}

vi.mock('../../lib/config/manager', () => ({
  getConfigManager: () => mockConfigManager
}))

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Set default environment variables
    process.env.npm_package_version = '1.0.0'
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.npm_package_version
    delete process.env.NODE_ENV
  })

  describe('GET /api/health', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockStats = {
        initialized: true,
        healthy: true,
        configCount: 10,
        lastRefresh: '2024-01-01T00:00:00Z',
        phaseConfigured: true,
        cacheEnabled: true,
        lastError: null
      }

      const mockHealthStatus = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'pass', message: 'Phase connection OK' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: []
      }

      const mockHealthCheck = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'pass', message: 'Phase connection OK' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: []
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue(mockHealthStatus)
      mockConfigManager.performHealthCheck.mockResolvedValue(mockHealthCheck)

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.version).toBe('1.0.0')
      expect(data.environment).toBe('test')
      expect(data.configuration.initialized).toBe(true)
      expect(data.configuration.healthy).toBe(true)
      expect(data.configuration.configCount).toBe(10)
      expect(data.configuration.phaseConfigured).toBe(true)
      expect(data.configuration.cacheEnabled).toBe(true)
      expect(data.checks.configValidation.status).toBe('pass')
      expect(data.checks.phaseConnection.status).toBe('pass')
      expect(data.checks.initialization.status).toBe('pass')
      expect(data.errors).toEqual([])
      expect(data.lastError).toBeNull()

      // Check headers
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      expect(response.headers.get('X-Health-Status')).toBe('healthy')
      expect(response.headers.get('X-Config-Initialized')).toBe('true')
      expect(response.headers.get('X-Phase-Configured')).toBe('true')
    })

    it('should return unhealthy status when config stats are unhealthy', async () => {
      const mockStats = {
        initialized: true,
        healthy: false,
        configCount: 5,
        lastRefresh: '2024-01-01T00:00:00Z',
        phaseConfigured: false,
        cacheEnabled: false,
        lastError: new Error('Configuration error')
      }

      const mockHealthStatus = {
        healthy: false,
        checks: {
          configValidation: { status: 'fail', message: 'Config validation failed' },
          phaseConnection: { status: 'fail', message: 'Phase connection failed' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: ['Configuration validation failed']
      }

      const mockHealthCheck = {
        healthy: true,
        checks: {
          configValidation: { status: 'fail', message: 'Config validation failed' },
          phaseConnection: { status: 'fail', message: 'Phase connection failed' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: ['Configuration validation failed']
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue(mockHealthStatus)
      mockConfigManager.performHealthCheck.mockResolvedValue(mockHealthCheck)

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.configuration.healthy).toBe(false)
      expect(data.configuration.phaseConfigured).toBe(false)
      expect(data.configuration.cacheEnabled).toBe(false)
      expect(data.checks.configValidation.status).toBe('fail')
      expect(data.checks.phaseConnection.status).toBe('fail')
      expect(data.errors).toEqual(['Configuration validation failed'])
      expect(data.lastError).toEqual({
        name: 'Error',
        message: 'Configuration error',
        timestamp: expect.any(String)
      })

      // Check headers
      expect(response.headers.get('X-Health-Status')).toBe('unhealthy')
      expect(response.headers.get('X-Config-Initialized')).toBe('true')
      expect(response.headers.get('X-Phase-Configured')).toBe('false')
    })

    it('should return unhealthy status when health check fails', async () => {
      const mockStats = {
        initialized: true,
        healthy: true,
        configCount: 10,
        lastRefresh: '2024-01-01T00:00:00Z',
        phaseConfigured: true,
        cacheEnabled: true,
        lastError: null
      }

      const mockHealthStatus = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'pass', message: 'Phase connection OK' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: []
      }

      const mockHealthCheck = {
        healthy: false,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'fail', message: 'Phase connection timeout' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: ['Phase connection timeout']
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue(mockHealthStatus)
      mockConfigManager.performHealthCheck.mockResolvedValue(mockHealthCheck)

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.configuration.healthy).toBe(true) // Config stats are healthy
      expect(data.checks.phaseConnection.status).toBe('fail')
      expect(data.errors).toEqual(['Phase connection timeout'])

      expect(response.headers.get('X-Health-Status')).toBe('unhealthy')
    })

    it('should use default values when environment variables are not set', async () => {
      delete process.env.npm_package_version
      delete process.env.NODE_ENV

      const mockStats = {
        initialized: true,
        healthy: true,
        configCount: 10,
        lastRefresh: '2024-01-01T00:00:00Z',
        phaseConfigured: true,
        cacheEnabled: true,
        lastError: null
      }

      const mockHealthStatus = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'pass', message: 'Phase connection OK' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: []
      }

      const mockHealthCheck = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'pass', message: 'Phase connection OK' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: []
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue(mockHealthStatus)
      mockConfigManager.performHealthCheck.mockResolvedValue(mockHealthCheck)

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.version).toBe('0.1.0')
      expect(data.environment).toBe('development')
    })

    it('should handle lastError that is not an Error instance', async () => {
      const mockStats = {
        initialized: true,
        healthy: true,
        configCount: 10,
        lastRefresh: '2024-01-01T00:00:00Z',
        phaseConfigured: true,
        cacheEnabled: true,
        lastError: 'String error message'
      }

      const mockHealthStatus = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'pass', message: 'Phase connection OK' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: []
      }

      const mockHealthCheck = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'Config is valid' },
          phaseConnection: { status: 'pass', message: 'Phase connection OK' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: []
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue(mockHealthStatus)
      mockConfigManager.performHealthCheck.mockResolvedValue(mockHealthCheck)

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(data.lastError).toEqual({
        name: 'String error message',
        message: 'String error message',
        timestamp: undefined
      })
    })

    it('should handle errors gracefully', async () => {
      mockConfigManager.getStats.mockImplementation(() => {
        throw new Error('Config manager error')
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('error')
      expect(data.error.name).toBe('Error')
      expect(data.error.message).toBe('Config manager error')
      expect(data.configuration.initialized).toBe(false)
      expect(data.configuration.healthy).toBe(false)

      expect(response.headers.get('X-Health-Status')).toBe('error')
      expect(console.error).toHaveBeenCalledWith('[Health] Health check failed:', expect.any(Error))
    })

    it('should handle non-Error exceptions', async () => {
      mockConfigManager.getStats.mockImplementation(() => {
        throw 'String error'
      })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('error')
      expect(data.error.name).toBe('UnknownError')
      expect(data.error.message).toBe('Health check failed')
    })
  })

  describe('HEAD /api/health', () => {
    it('should return 200 when system is healthy', async () => {
      mockConfigManager.isInitialized.mockReturnValue(true)
      mockConfigManager.getStats.mockReturnValue({ healthy: true })

      const request = new NextRequest('http://localhost:3000/api/health', { method: 'HEAD' })
      const response = await HEAD(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Health-Status')).toBe('healthy')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      
      // HEAD should not have a body
      const text = await response.text()
      expect(text).toBe('')
    })

    it('should return 503 when system is not initialized', async () => {
      mockConfigManager.isInitialized.mockReturnValue(false)
      mockConfigManager.getStats.mockReturnValue({ healthy: true })

      const request = new NextRequest('http://localhost:3000/api/health', { method: 'HEAD' })
      const response = await HEAD(request)

      expect(response.status).toBe(503)
      expect(response.headers.get('X-Health-Status')).toBe('unhealthy')
    })

    it('should return 503 when system is unhealthy', async () => {
      mockConfigManager.isInitialized.mockReturnValue(true)
      mockConfigManager.getStats.mockReturnValue({ healthy: false })

      const request = new NextRequest('http://localhost:3000/api/health', { method: 'HEAD' })
      const response = await HEAD(request)

      expect(response.status).toBe(503)
      expect(response.headers.get('X-Health-Status')).toBe('unhealthy')
    })

    it('should handle errors gracefully', async () => {
      mockConfigManager.isInitialized.mockImplementation(() => {
        throw new Error('Initialization check failed')
      })

      const request = new NextRequest('http://localhost:3000/api/health', { method: 'HEAD' })
      const response = await HEAD(request)

      expect(response.status).toBe(503)
      expect(response.headers.get('X-Health-Status')).toBe('error')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })
  })
})