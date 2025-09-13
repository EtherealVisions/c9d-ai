import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConversionFunnelService } from '@/lib/services/conversion-funnel-service'
import { AnalyticsService } from '@/lib/services/analytics-service'

// Mock AnalyticsService
vi.mock('@/lib/services/analytics-service', () => ({
  AnalyticsService: {
    trackEvent: vi.fn()
  }
}))

// Mock window and localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage
  },
  writable: true
})

describe('ConversionFunnelService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue('[]')
    mockSessionStorage.getItem.mockReturnValue('test_session_id')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('trackFunnelStep', () => {
    it('should track valid funnel step', () => {
      ConversionFunnelService.trackFunnelStep('landing', { page_path: '/' }, 'user123')

      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'landing',
        category: 'conversion',
        label: 'Landing Page View',
        value: 1,
        properties: {
          funnel_step: 'landing',
          funnel_category: 'awareness',
          page_path: '/'
        },
        userId: 'user123'
      })
    })

    it('should store funnel step in localStorage', () => {
      ConversionFunnelService.trackFunnelStep('hero_cta_click', {}, 'user123')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'conversion_funnel',
        expect.stringContaining('hero_cta_click')
      )
    })

    it('should warn for unknown funnel step', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      ConversionFunnelService.trackFunnelStep('unknown_step', {}, 'user123')

      expect(consoleSpy).toHaveBeenCalledWith('Unknown funnel step: unknown_step')
      consoleSpy.mockRestore()
    })

    it('should generate session ID if not available', () => {
      mockSessionStorage.getItem.mockReturnValue(null)

      ConversionFunnelService.trackFunnelStep('landing', {}, 'user123')

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'analytics_session_id',
        expect.stringMatching(/session_\d+_[a-z0-9]+/)
      )
    })
  })

  describe('getFunnelData', () => {
    it('should return empty array when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const funnelData = ConversionFunnelService.getFunnelData()

      expect(funnelData).toEqual([])
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('conversion_funnel')
    })

    it('should return parsed funnel data', () => {
      const mockData = [
        {
          step: 'landing',
          event: 'landing',
          category: 'awareness',
          timestamp: '2024-01-01T00:00:00.000Z',
          sessionId: 'session_1'
        }
      ]
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData))

      const funnelData = ConversionFunnelService.getFunnelData()

      expect(funnelData).toEqual(mockData)
    })

    it('should handle invalid JSON gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')

      const funnelData = ConversionFunnelService.getFunnelData()

      expect(funnelData).toEqual([])
    })
  })

  describe('analyzeConversionFunnel', () => {
    const mockFunnelData = [
      {
        step: 'landing',
        event: 'landing',
        category: 'awareness' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:00:00.000Z'
      },
      {
        step: 'hero_cta_impression',
        event: 'hero_cta_impression',
        category: 'awareness' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:01:00.000Z'
      },
      {
        step: 'hero_cta_click',
        event: 'hero_cta_click',
        category: 'interest' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:02:00.000Z'
      },
      {
        step: 'conversion',
        event: 'conversion',
        category: 'conversion' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:10:00.000Z'
      },
      // Second session without conversion
      {
        step: 'landing',
        event: 'landing',
        category: 'awareness' as const,
        sessionId: 'session_2',
        timestamp: '2024-01-01T01:00:00.000Z'
      },
      {
        step: 'hero_cta_impression',
        event: 'hero_cta_impression',
        category: 'awareness' as const,
        sessionId: 'session_2',
        timestamp: '2024-01-01T01:01:00.000Z'
      }
    ]

    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFunnelData))
    })

    it('should analyze conversion funnel correctly', () => {
      const metrics = ConversionFunnelService.analyzeConversionFunnel()

      expect(metrics).toHaveProperty('totalVisitors', 2)
      expect(metrics).toHaveProperty('totalConversions', 1)
      expect(metrics).toHaveProperty('conversionRate', 50)
      expect(metrics).toHaveProperty('averageTimeToConvert')
      expect(metrics).toHaveProperty('funnelSteps')
      expect(metrics).toHaveProperty('dropOffPoints')
    })

    it('should calculate step metrics correctly', () => {
      const metrics = ConversionFunnelService.analyzeConversionFunnel()

      const landingStep = metrics.funnelSteps.find(step => step.step === 'landing')
      expect(landingStep).toBeDefined()
      expect(landingStep?.visitors).toBe(2)
      expect(landingStep?.conversions).toBe(2) // Both sessions had hero_cta_impression
      expect(landingStep?.conversionRate).toBe(100)
    })

    it('should identify drop-off points', () => {
      const metrics = ConversionFunnelService.analyzeConversionFunnel()

      // Should identify steps with high drop-off rates
      const dropOffPoints = metrics.dropOffPoints
      expect(dropOffPoints).toBeInstanceOf(Array)
      
      // Check if any step has drop-off rate > 60%
      dropOffPoints.forEach(dropOff => {
        expect(dropOff.dropOffRate).toBeGreaterThan(60)
        expect(dropOff).toHaveProperty('step')
        expect(dropOff).toHaveProperty('visitors')
        expect(dropOff).toHaveProperty('commonExitPages')
      })
    })

    it('should calculate average time to convert', () => {
      const metrics = ConversionFunnelService.analyzeConversionFunnel()

      expect(metrics.averageTimeToConvert).toBeGreaterThan(0)
      // Should be 10 minutes (600,000 ms) for the converting session
      expect(metrics.averageTimeToConvert).toBe(600000)
    })

    it('should filter by timeframe when provided', () => {
      const timeframe = {
        start: new Date('2024-01-01T00:30:00.000Z'),
        end: new Date('2024-01-01T02:00:00.000Z')
      }

      const metrics = ConversionFunnelService.analyzeConversionFunnel(timeframe)

      // Should only include session_2 data
      expect(metrics.totalVisitors).toBe(1)
      expect(metrics.totalConversions).toBe(0)
    })

    it('should handle empty funnel data', () => {
      mockLocalStorage.getItem.mockReturnValue('[]')

      const metrics = ConversionFunnelService.analyzeConversionFunnel()

      expect(metrics.totalVisitors).toBe(0)
      expect(metrics.totalConversions).toBe(0)
      expect(metrics.conversionRate).toBe(0)
      expect(metrics.averageTimeToConvert).toBe(0)
      expect(metrics.funnelSteps).toHaveLength(9) // All predefined steps
      expect(metrics.dropOffPoints).toHaveLength(0)
    })
  })

  describe('getConversionPath', () => {
    const mockFunnelData = [
      {
        step: 'landing',
        event: 'landing',
        category: 'awareness' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:00:00.000Z'
      },
      {
        step: 'hero_cta_click',
        event: 'hero_cta_click',
        category: 'interest' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:02:00.000Z'
      },
      {
        step: 'hero_cta_impression',
        event: 'hero_cta_impression',
        category: 'awareness' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:01:00.000Z'
      }
    ]

    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFunnelData))
    })

    it('should return conversion path for specific session', () => {
      const path = ConversionFunnelService.getConversionPath('session_1')

      expect(path).toHaveLength(3)
      // Should be sorted by timestamp
      expect(path[0].step).toBe('landing')
      expect(path[1].step).toBe('hero_cta_impression')
      expect(path[2].step).toBe('hero_cta_click')
    })

    it('should return empty array for non-existent session', () => {
      const path = ConversionFunnelService.getConversionPath('non_existent_session')

      expect(path).toEqual([])
    })
  })

  describe('getTopConversionPaths', () => {
    const mockFunnelData = [
      // Path 1: landing -> cta_click -> conversion (2 sessions)
      { step: 'landing', sessionId: 'session_1', timestamp: '2024-01-01T00:00:00.000Z' },
      { step: 'hero_cta_click', sessionId: 'session_1', timestamp: '2024-01-01T00:01:00.000Z' },
      { step: 'conversion', sessionId: 'session_1', timestamp: '2024-01-01T00:02:00.000Z' },
      
      { step: 'landing', sessionId: 'session_2', timestamp: '2024-01-01T01:00:00.000Z' },
      { step: 'hero_cta_click', sessionId: 'session_2', timestamp: '2024-01-01T01:01:00.000Z' },
      { step: 'conversion', sessionId: 'session_2', timestamp: '2024-01-01T01:02:00.000Z' },
      
      // Path 2: landing -> features_view (1 session, no conversion)
      { step: 'landing', sessionId: 'session_3', timestamp: '2024-01-01T02:00:00.000Z' },
      { step: 'features_view', sessionId: 'session_3', timestamp: '2024-01-01T02:01:00.000Z' }
    ]

    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFunnelData))
    })

    it('should return top conversion paths', () => {
      const topPaths = ConversionFunnelService.getTopConversionPaths(5)

      expect(topPaths).toBeInstanceOf(Array)
      expect(topPaths.length).toBeGreaterThan(0)
      
      // Should be sorted by count (descending)
      for (let i = 1; i < topPaths.length; i++) {
        expect(topPaths[i - 1].count).toBeGreaterThanOrEqual(topPaths[i].count)
      }

      // Each path should have required properties
      topPaths.forEach(path => {
        expect(path).toHaveProperty('path')
        expect(path).toHaveProperty('count')
        expect(path).toHaveProperty('conversionRate')
        expect(path.path).toBeInstanceOf(Array)
        expect(path.count).toBeGreaterThan(0)
        expect(path.conversionRate).toBeGreaterThanOrEqual(0)
        expect(path.conversionRate).toBeLessThanOrEqual(100)
      })
    })

    it('should limit results to specified count', () => {
      const topPaths = ConversionFunnelService.getTopConversionPaths(2)

      expect(topPaths.length).toBeLessThanOrEqual(2)
    })

    it('should calculate conversion rates correctly', () => {
      const topPaths = ConversionFunnelService.getTopConversionPaths(10)

      const pathWithConversion = topPaths.find(p => 
        p.path.includes('conversion')
      )
      
      if (pathWithConversion) {
        expect(pathWithConversion.conversionRate).toBe(100)
      }

      const pathWithoutConversion = topPaths.find(p => 
        !p.path.includes('conversion') && p.count > 0
      )
      
      if (pathWithoutConversion) {
        expect(pathWithoutConversion.conversionRate).toBe(0)
      }
    })
  })

  describe('getAbandonmentReasons', () => {
    it('should return abandonment reasons for form_start', () => {
      const reasons = ConversionFunnelService.getAbandonmentReasons('form_start')

      expect(reasons).toBeInstanceOf(Array)
      expect(reasons.length).toBeGreaterThan(0)
      
      reasons.forEach(reason => {
        expect(reason).toHaveProperty('reason')
        expect(reason).toHaveProperty('count')
        expect(typeof reason.reason).toBe('string')
        expect(typeof reason.count).toBe('number')
        expect(reason.count).toBeGreaterThan(0)
      })
    })

    it('should return abandonment reasons for demo_request', () => {
      const reasons = ConversionFunnelService.getAbandonmentReasons('demo_request')

      expect(reasons).toBeInstanceOf(Array)
      expect(reasons.length).toBeGreaterThan(0)
    })

    it('should return empty array for unknown step', () => {
      const reasons = ConversionFunnelService.getAbandonmentReasons('unknown_step')

      expect(reasons).toEqual([])
    })
  })

  describe('optimizeFunnel', () => {
    const mockFunnelData = [
      // High drop-off scenario
      { step: 'landing', sessionId: 'session_1', timestamp: '2024-01-01T00:00:00.000Z' },
      { step: 'landing', sessionId: 'session_2', timestamp: '2024-01-01T01:00:00.000Z' },
      { step: 'landing', sessionId: 'session_3', timestamp: '2024-01-01T02:00:00.000Z' },
      { step: 'landing', sessionId: 'session_4', timestamp: '2024-01-01T03:00:00.000Z' },
      { step: 'landing', sessionId: 'session_5', timestamp: '2024-01-01T04:00:00.000Z' },
      
      // Only one session continues
      { step: 'hero_cta_impression', sessionId: 'session_1', timestamp: '2024-01-01T00:01:00.000Z' }
    ]

    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFunnelData))
    })

    it('should return optimization recommendations', () => {
      const recommendations = ConversionFunnelService.optimizeFunnel()

      expect(recommendations).toBeInstanceOf(Array)
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('step')
        expect(rec).toHaveProperty('recommendation')
        expect(rec).toHaveProperty('impact')
        expect(['High', 'Medium', 'Low']).toContain(rec.impact)
        expect(typeof rec.recommendation).toBe('string')
        expect(rec.recommendation.length).toBeGreaterThan(0)
      })
    })

    it('should identify high-impact recommendations for high drop-off rates', () => {
      const recommendations = ConversionFunnelService.optimizeFunnel()

      const highImpactRecs = recommendations.filter(rec => rec.impact === 'High')
      
      // Should have high-impact recommendations for steps with >70% drop-off
      expect(highImpactRecs.length).toBeGreaterThan(0)
    })
  })

  describe('clearFunnelData', () => {
    it('should clear funnel data from localStorage', () => {
      ConversionFunnelService.clearFunnelData()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('conversion_funnel')
    })
  })

  describe('exportFunnelData', () => {
    const mockFunnelData = [
      {
        step: 'landing',
        event: 'landing',
        category: 'awareness' as const,
        sessionId: 'session_1',
        timestamp: '2024-01-01T00:00:00.000Z'
      }
    ]

    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockFunnelData))
    })

    it('should export funnel data as JSON string', () => {
      const exportedData = ConversionFunnelService.exportFunnelData()

      expect(typeof exportedData).toBe('string')
      
      const parsedData = JSON.parse(exportedData)
      expect(parsedData).toHaveProperty('funnelData')
      expect(parsedData).toHaveProperty('analysis')
      expect(parsedData).toHaveProperty('topPaths')
      expect(parsedData).toHaveProperty('exportedAt')
      
      expect(parsedData.funnelData).toEqual(mockFunnelData)
      expect(parsedData.analysis).toHaveProperty('totalVisitors')
      expect(parsedData.topPaths).toBeInstanceOf(Array)
      expect(new Date(parsedData.exportedAt)).toBeInstanceOf(Date)
    })
  })

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })

      expect(() => {
        ConversionFunnelService.getFunnelData()
      }).not.toThrow()

      const result = ConversionFunnelService.getFunnelData()
      expect(result).toEqual([])
    })

    it('should handle missing window object', () => {
      const originalWindow = global.window
      delete (global as any).window

      expect(() => {
        ConversionFunnelService.trackFunnelStep('landing', {}, 'user123')
      }).not.toThrow()

      global.window = originalWindow
    })

    it('should handle invalid timestamps in analysis', () => {
      const invalidData = [
        {
          step: 'landing',
          event: 'landing',
          category: 'awareness' as const,
          sessionId: 'session_1',
          timestamp: 'invalid-date'
        }
      ]

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidData))

      expect(() => {
        ConversionFunnelService.analyzeConversionFunnel()
      }).not.toThrow()

      const metrics = ConversionFunnelService.analyzeConversionFunnel()
      expect(metrics).toHaveProperty('totalVisitors')
    })
  })
})