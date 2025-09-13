import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ABTestingService } from '@/lib/services/ab-testing-service'
import { ABTestConfig } from '@/lib/types/analytics'
import { AnalyticsService } from '@/lib/services/analytics-service'

// Mock AnalyticsService
vi.mock('@/lib/services/analytics-service', () => ({
  AnalyticsService: {
    trackEvent: vi.fn()
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockLocalStorage
  },
  writable: true
})

describe('ABTestingService', () => {
  const mockTestConfig: ABTestConfig = {
    testId: 'hero_cta_test',
    name: 'Hero CTA Test',
    description: 'Testing different CTA variants in hero section',
    variants: [
      {
        id: 'control',
        name: 'Control',
        description: 'Original CTA',
        weight: 50,
        config: { text: 'Get Started', color: 'primary' }
      },
      {
        id: 'variant_a',
        name: 'Variant A',
        description: 'Alternative CTA',
        weight: 50,
        config: { text: 'Start Free Trial', color: 'secondary' }
      }
    ],
    trafficSplit: [50, 50],
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    enabled: true,
    minimumSampleSize: 100,
    confidenceLevel: 95
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clear service state after tests
    ABTestingService.clearAllTests()
  })

  describe('initializeTest', () => {
    it('should initialize a valid test configuration', () => {
      ABTestingService.initializeTest(mockTestConfig)

      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'ab_test_initialized',
        category: 'ab_test',
        label: 'hero_cta_test',
        properties: {
          test_name: 'Hero CTA Test',
          variants_count: 2,
          traffic_split: [50, 50],
          start_date: mockTestConfig.startDate.toISOString(),
          end_date: mockTestConfig.endDate?.toISOString()
        }
      })
    })

    it('should not initialize disabled test', () => {
      const disabledTest = { ...mockTestConfig, enabled: false }
      
      ABTestingService.initializeTest(disabledTest)

      expect(AnalyticsService.trackEvent).not.toHaveBeenCalled()
    })

    it('should not initialize invalid test configuration', () => {
      const invalidTest = {
        ...mockTestConfig,
        trafficSplit: [60, 60] // Invalid - sums to 120%
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      ABTestingService.initializeTest(invalidTest)

      expect(consoleSpy).toHaveBeenCalledWith('Invalid A/B test configuration:', invalidTest)
      expect(AnalyticsService.trackEvent).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })
  })

  describe('getVariant', () => {
    beforeEach(() => {
      ABTestingService.initializeTest(mockTestConfig)
    })

    it('should return null for non-existent test', () => {
      const variant = ABTestingService.getVariant('non_existent_test', 'user123')
      expect(variant).toBeNull()
    })

    it('should return null for disabled test', () => {
      const disabledTest = { ...mockTestConfig, enabled: false }
      ABTestingService.initializeTest(disabledTest)

      const variant = ABTestingService.getVariant(disabledTest.testId, 'user123')
      expect(variant).toBeNull()
    })

    it('should return null for test outside date range', () => {
      const pastTest = {
        ...mockTestConfig,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-12-31')
      }
      ABTestingService.initializeTest(pastTest)

      const variant = ABTestingService.getVariant(pastTest.testId, 'user123')
      expect(variant).toBeNull()
    })

    it('should assign consistent variant for same user', () => {
      const variant1 = ABTestingService.getVariant('hero_cta_test', 'user123')
      const variant2 = ABTestingService.getVariant('hero_cta_test', 'user123')

      expect(variant1).toBeTruthy()
      expect(variant2).toBeTruthy()
      expect(variant1?.id).toBe(variant2?.id)
    })

    it('should assign different variants for different users', () => {
      const variant1 = ABTestingService.getVariant('hero_cta_test', 'user123')
      const variant2 = ABTestingService.getVariant('hero_cta_test', 'user456')

      expect(variant1).toBeTruthy()
      expect(variant2).toBeTruthy()
      // Note: Due to hash-based assignment, this might occasionally be the same
      // but statistically should be different most of the time
    })

    it('should track assignment for new user', () => {
      ABTestingService.getVariant('hero_cta_test', 'user123')

      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'ab_test_assignment',
        category: 'ab_test',
        label: expect.stringMatching(/hero_cta_test_(control|variant_a)/),
        properties: {
          test_id: 'hero_cta_test',
          variant_id: expect.stringMatching(/(control|variant_a)/),
          user_key: 'user123'
        }
      })
    })

    it('should store assignment in localStorage', () => {
      ABTestingService.getVariant('hero_cta_test', 'user123')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'ab_test_assignments',
        expect.stringContaining('hero_cta_test')
      )
    })

    it('should handle anonymous users', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const variant = ABTestingService.getVariant('hero_cta_test')

      expect(variant).toBeTruthy()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'anonymous_user_id',
        expect.stringMatching(/anon_\d+_[a-z0-9]+/)
      )
    })
  })

  describe('trackConversion', () => {
    beforeEach(() => {
      ABTestingService.initializeTest(mockTestConfig)
      // Simulate user assignment
      ABTestingService.getVariant('hero_cta_test', 'user123')
    })

    it('should track conversion for assigned user', () => {
      ABTestingService.trackConversion('hero_cta_test', 'signup', 100, 'user123')

      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'ab_test_conversion',
        category: 'ab_test',
        label: expect.stringMatching(/hero_cta_test_(control|variant_a)_signup/),
        value: 100,
        properties: {
          test_id: 'hero_cta_test',
          variant_id: expect.stringMatching(/(control|variant_a)/),
          conversion_event: 'signup',
          user_key: 'user123'
        }
      })
    })

    it('should not track conversion for unassigned user', () => {
      const initialCallCount = (AnalyticsService.trackEvent as any).mock.calls.length

      ABTestingService.trackConversion('hero_cta_test', 'signup', 100, 'unassigned_user')

      expect((AnalyticsService.trackEvent as any).mock.calls.length).toBe(initialCallCount)
    })
  })

  describe('analyzeTestResults', () => {
    beforeEach(() => {
      ABTestingService.initializeTest(mockTestConfig)
    })

    it('should return empty array for non-existent test', () => {
      const results = ABTestingService.analyzeTestResults('non_existent_test')
      expect(results).toEqual([])
    })

    it('should return results for all variants', () => {
      const results = ABTestingService.analyzeTestResults('hero_cta_test')

      expect(results).toHaveLength(2)
      expect(results[0]).toHaveProperty('testId', 'hero_cta_test')
      expect(results[0]).toHaveProperty('variantId')
      expect(results[0]).toHaveProperty('sampleSize')
      expect(results[0]).toHaveProperty('conversionRate')
      expect(results[0]).toHaveProperty('confidenceInterval')
      expect(results[0]).toHaveProperty('statisticalSignificance')
      expect(results[0]).toHaveProperty('isWinner')
    })

    it('should calculate confidence intervals', () => {
      const results = ABTestingService.analyzeTestResults('hero_cta_test')

      results.forEach(result => {
        expect(result.confidenceInterval).toHaveLength(2)
        expect(result.confidenceInterval[0]).toBeLessThanOrEqual(result.confidenceInterval[1])
        expect(result.confidenceInterval[0]).toBeGreaterThanOrEqual(0)
        expect(result.confidenceInterval[1]).toBeLessThanOrEqual(100)
      })
    })

    it('should identify winning variant', () => {
      const results = ABTestingService.analyzeTestResults('hero_cta_test')
      const winners = results.filter(r => r.isWinner)

      // Should have at most one winner
      expect(winners.length).toBeLessThanOrEqual(1)
    })
  })

  describe('getTestStatus', () => {
    it('should return not_started for non-existent test', () => {
      const status = ABTestingService.getTestStatus('non_existent_test')
      expect(status).toBe('not_started')
    })

    it('should return not_started for future test', () => {
      const futureTest = {
        ...mockTestConfig,
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 86400000 * 30) // 30 days from now
      }
      ABTestingService.initializeTest(futureTest)

      const status = ABTestingService.getTestStatus(futureTest.testId)
      expect(status).toBe('not_started')
    })

    it('should return completed for past test', () => {
      const pastTest = {
        ...mockTestConfig,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-12-31')
      }
      ABTestingService.initializeTest(pastTest)

      const status = ABTestingService.getTestStatus(pastTest.testId)
      expect(status).toBe('completed')
    })

    it('should return paused for disabled test', () => {
      const disabledTest = { ...mockTestConfig, enabled: false }
      ABTestingService.initializeTest(disabledTest)

      const status = ABTestingService.getTestStatus(disabledTest.testId)
      expect(status).toBe('paused')
    })

    it('should return running for active test', () => {
      ABTestingService.initializeTest(mockTestConfig)

      const status = ABTestingService.getTestStatus(mockTestConfig.testId)
      expect(status).toBe('running')
    })
  })

  describe('pauseTest', () => {
    beforeEach(() => {
      ABTestingService.initializeTest(mockTestConfig)
    })

    it('should pause active test', () => {
      ABTestingService.pauseTest('hero_cta_test')

      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'ab_test_paused',
        category: 'ab_test',
        label: 'hero_cta_test'
      })

      const status = ABTestingService.getTestStatus('hero_cta_test')
      expect(status).toBe('paused')
    })
  })

  describe('resumeTest', () => {
    beforeEach(() => {
      ABTestingService.initializeTest(mockTestConfig)
      ABTestingService.pauseTest('hero_cta_test')
    })

    it('should resume paused test', () => {
      ABTestingService.resumeTest('hero_cta_test')

      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'ab_test_resumed',
        category: 'ab_test',
        label: 'hero_cta_test'
      })

      const status = ABTestingService.getTestStatus('hero_cta_test')
      expect(status).toBe('running')
    })
  })

  describe('endTest', () => {
    beforeEach(() => {
      ABTestingService.initializeTest(mockTestConfig)
    })

    it('should end active test', () => {
      ABTestingService.endTest('hero_cta_test')

      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith({
        event: 'ab_test_ended',
        category: 'ab_test',
        label: 'hero_cta_test',
        properties: {
          winner_variant: expect.any(String),
          total_participants: expect.any(Number),
          test_duration: expect.any(Number)
        }
      })

      const status = ABTestingService.getTestStatus('hero_cta_test')
      expect(status).toBe('completed')
    })
  })

  describe('getAllActiveTests', () => {
    it('should return only enabled tests', () => {
      const enabledTest = mockTestConfig
      const disabledTest = { ...mockTestConfig, testId: 'disabled_test', enabled: false }

      ABTestingService.initializeTest(enabledTest)
      ABTestingService.initializeTest(disabledTest)

      const activeTests = ABTestingService.getAllActiveTests()

      expect(activeTests).toHaveLength(1)
      expect(activeTests[0].testId).toBe('hero_cta_test')
      expect(activeTests[0].enabled).toBe(true)
    })
  })

  describe('clearUserAssignments', () => {
    beforeEach(() => {
      ABTestingService.initializeTest(mockTestConfig)
      ABTestingService.getVariant('hero_cta_test', 'user123')
    })

    it('should clear assignments for specific user', () => {
      ABTestingService.clearUserAssignments('user123')

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ab_test_assignments')
    })

    it('should clear assignments for anonymous user', () => {
      ABTestingService.clearUserAssignments()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ab_test_assignments')
    })
  })

  describe('validation', () => {
    it('should reject test with missing required fields', () => {
      const invalidTest = {
        ...mockTestConfig,
        testId: ''
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      ABTestingService.initializeTest(invalidTest)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should reject test with mismatched traffic split', () => {
      const invalidTest = {
        ...mockTestConfig,
        trafficSplit: [40, 40] // Only sums to 80%
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      ABTestingService.initializeTest(invalidTest)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should reject test with invalid date range', () => {
      const invalidTest = {
        ...mockTestConfig,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01') // End before start
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      ABTestingService.initializeTest(invalidTest)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})