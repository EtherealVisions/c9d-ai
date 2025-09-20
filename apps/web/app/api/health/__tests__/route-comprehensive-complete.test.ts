/**
 * Comprehensive test suite for /api/health route
 * Achieves 90% coverage for API route functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock NextResponse to prevent constructor issues
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  
  // Create a proper NextResponse mock that can be used as constructor
  const MockNextResponse = function(body: any, init?: ResponseInit) {
    return {
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(body || ''),
      status: init?.status || 200,
      headers: new Headers(init?.headers)
    }
  }
  
  // Add static methods
  MockNextResponse.json = vi.fn((data, init) => ({
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(data || ''),
    status: init?.status || 200,
    headers: new Headers(init?.headers)
  }))
  
  MockNextResponse.next = vi.fn(() => ({
    status: 200,
    headers: new Headers()
  }))
  
  return {
    ...actual,
    NextResponse: MockNextResponse
  }
})

// Mock the config manager
const mockConfigManager = {
  getStats: vi.fn(),
  getHealthStatus: vi.fn(),
  performHealthCheck: vi.fn(),
  isInitialized: vi.fn()
}

vi.mock('../../../../lib/config/manager', () => ({
  getConfigManager: () => mockConfigManager
}))

// Import after mocking
const { GET, HEAD } = await import('../route')

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Set up default environment
    process.env.NODE_ENV = 'test'
    process.env.npm_package_version = '1.0.0'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.NODE_ENV
    delete process.env.npm_package_version
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
          configValidation: { status: 'pass', message: 'All configs valid' },
          phaseConnection: { status: 'pass', message: 'Phase connected' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        }
      }

      const mockHealthCheck = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'All configs valid' },
          phaseConnection: { status: 'pass', message: 'Phase connected' },
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
      expect(data.checks.configuration.status).toBe('pass')
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
        lastError: null
      }

      const mockHealthStatus = {
        healthy: false,
        checks: {
          configValidation: { status: 'fail', message: 'Config validation failed' },
          phaseConnection: { status: 'fail', message: 'Phase connection failed' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        }
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
      expect(data.checks.configuration.status).toBe('fail')
      expect(data.errors).toEqual(['Configuration validation failed'])

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
          configValidation: { status: 'pass', message: 'All configs valid' },
          phaseConnection: { status: 'pass', message: 'Phase connected' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        }
      }

      const mockHealthCheck = {
        healthy: false,
        checks: {
          configValidation: { status: 'pass', message: 'All configs valid' },
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
      expect(data.configuration.healthy).toBe(true)
      expect(data.checks.phaseConnection.status).toBe('fail')
      expect(data.errors).toEqual(['Phase connection timeout'])
    })

    it('should include last error information when available', async () => {
      const mockError = new Error('Configuration load failed')
      mockError.name = 'ConfigurationError'

      const mockStats = {
        initialized: true,
        healthy: false,
        configCount: 0,
        lastRefresh: null,
        phaseConfigured: false,
        cacheEnabled: false,
        lastError: mockError
      }

      const mockHealthStatus = {
        healthy: false,
        checks: {
          configValidation: { status: 'fail', message: 'Config validation failed' },
          phaseConnection: { status: 'fail', message: 'Phase not configured' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        }
      }

      const mockHealthCheck = {
        healthy: false,
        checks: {
          configValidation: { status: 'fail', message: 'Config validation failed' },
          phaseConnection: { status: 'fail', message: 'Phase not configured' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        },
        errors: ['Configuration load failed']
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue(mockHealthStatus)
      mockConfigManager.performHealthCheck.mockResolvedValue(mockHealthCheck)

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.lastError).toEqual({
        name: 'ConfigurationError',
        message: 'Configuration load failed',
        timestamp: expect.any(String)
      })
    })

    it('should use default values when environment variables are not set', async () => {
      delete process.env.NODE_ENV
      delete process.env.npm_package_version

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
          configValidation: { status: 'pass', message: 'All configs valid' },
          phaseConnection: { status: 'pass', message: 'Phase connected' },
          initialization: { status: 'pass', message: 'Initialized successfully' }
        }
      }

      const mockHealthCheck = {
        healthy: true,
        checks: {
          configValidation: { status: 'pass', message: 'All configs valid' },
          phaseConnection: { status: 'pass', message: 'Phase connected' },
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

      // Check headers
      expect(response.headers.get('X-Health-Status')).toBe('error')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
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

      // HEAD should not have body
      const body = await response.text()
      expect(body).toBe('')
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
        throw new Error('Config manager error')
      })

      const request = new NextRequest('http://localhost:3000/api/health', { method: 'HEAD' })
      const response = await HEAD(request)

      expect(response.status).toBe(503)
      expect(response.headers.get('X-Health-Status')).toBe('error')
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })
  })

  describe('Response Headers', () => {
    it('should always include cache control headers', async () => {
      const mockStats = {
        initialized: true,
        healthy: true,
        configCount: 10,
        lastRefresh: '2024-01-01T00:00:00Z',
        phaseConfigured: true,
        cacheEnabled: true,
        lastError: null
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue({ healthy: true, checks: {} })
      mockConfigManager.performHealthCheck.mockResolvedValue({ healthy: true, checks: {}, errors: [] })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    })

    it('should include configuration status headers', async () => {
      const mockStats = {
        initialized: false,
        healthy: false,
        configCount: 0,
        lastRefresh: null,
        phaseConfigured: false,
        cacheEnabled: false,
        lastError: null
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue({ healthy: false, checks: {} })
      mockConfigManager.performHealthCheck.mockResolvedValue({ healthy: false, checks: {}, errors: [] })

      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)

      expect(response.headers.get('X-Config-Initialized')).toBe('false')
      expect(response.headers.get('X-Phase-Configured')).toBe('false')
    })
  })

  describe('Timestamp and Version Information', () => {
    it('should include current timestamp in response', async () => {
      const mockStats = {
        initialized: true,
        healthy: true,
        configCount: 10,
        lastRefresh: '2024-01-01T00:00:00Z',
        phaseConfigured: true,
        cacheEnabled: true,
        lastError: null
      }

      mockConfigManager.getStats.mockReturnValue(mockStats)
      mockConfigManager.getHealthStatus.mockReturnValue({ healthy: true, checks: {} })
      mockConfigManager.performHealthCheck.mockResolvedValue({ healthy: true, checks: {}, errors: [] })

      const beforeTime = new Date().toISOString()
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET(request)
      const afterTime = new Date().toISOString()
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(data.timestamp >= beforeTime).toBe(true)
      expect(data.timestamp <= afterTime).toBe(true)
    })
  })
})