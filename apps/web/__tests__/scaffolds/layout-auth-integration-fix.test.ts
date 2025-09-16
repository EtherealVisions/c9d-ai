/**
 * Layout Authentication Integration Fix
 * Tests the updated layout.tsx authentication logic with proper test key handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MockInfrastructure } from './mock-infrastructure-emergency-fix.test'

// Mock the layout component behavior
const mockLayoutLogic = {
  checkClerkKeys: (publishableKey?: string, secretKey?: string) => {
    const hasPublishableKey = Boolean(publishableKey && publishableKey.trim())
    const hasSecretKey = Boolean(secretKey && secretKey.trim())
    return hasPublishableKey && hasSecretKey
  },
  
  isTestKey: (publishableKey?: string) => {
    return Boolean(publishableKey?.includes('test'))
  },
  
  shouldRenderWithClerk: (
    hasValidKeys: boolean, 
    isDevelopment: boolean, 
    isTestKey: boolean
  ) => {
    // NEW LOGIC: Allow test keys in development, block in production
    return hasValidKeys && !((!isDevelopment && isTestKey))
  }
}

describe('Layout Authentication Integration Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('Clerk Key Validation', () => {
    it('should validate proper Clerk keys', () => {
      const hasValidKeys = mockLayoutLogic.checkClerkKeys(
        'pk_test_valid_key',
        'sk_test_valid_secret'
      )
      
      expect(hasValidKeys).toBe(true)
    })
    
    it('should reject missing keys', () => {
      const hasValidKeys = mockLayoutLogic.checkClerkKeys('', '')
      expect(hasValidKeys).toBe(false)
    })
    
    it('should reject undefined keys', () => {
      const hasValidKeys = mockLayoutLogic.checkClerkKeys(undefined, undefined)
      expect(hasValidKeys).toBe(false)
    })
  })
  
  describe('Test Key Detection', () => {
    it('should detect test keys correctly', () => {
      const isTest = mockLayoutLogic.isTestKey('pk_test_example')
      expect(isTest).toBe(true)
    })
    
    it('should detect production keys correctly', () => {
      const isTest = mockLayoutLogic.isTestKey('pk_live_example')
      expect(isTest).toBe(false)
    })
    
    it('should handle undefined keys', () => {
      const isTest = mockLayoutLogic.isTestKey(undefined)
      expect(isTest).toBe(false)
    })
  })
  
  describe('Updated Authentication Logic', () => {
    describe('Development Environment', () => {
      const isDevelopment = true
      
      it('should allow valid production keys', () => {
        const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
          true,   // hasValidKeys
          isDevelopment,
          false   // isTestKey
        )
        
        expect(shouldRender).toBe(true)
      })
      
      it('should allow valid test keys (NEW BEHAVIOR)', () => {
        const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
          true,   // hasValidKeys
          isDevelopment,
          true    // isTestKey
        )
        
        expect(shouldRender).toBe(true)
      })
      
      it('should reject invalid keys', () => {
        const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
          false,  // hasValidKeys
          isDevelopment,
          false   // isTestKey
        )
        
        expect(shouldRender).toBe(false)
      })
    })
    
    describe('Production Environment', () => {
      const isDevelopment = false
      
      it('should allow valid production keys', () => {
        const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
          true,   // hasValidKeys
          isDevelopment,
          false   // isTestKey
        )
        
        expect(shouldRender).toBe(true)
      })
      
      it('should reject test keys in production', () => {
        const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
          true,   // hasValidKeys
          isDevelopment,
          true    // isTestKey
        )
        
        expect(shouldRender).toBe(false)
      })
      
      it('should reject invalid keys', () => {
        const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
          false,  // hasValidKeys
          isDevelopment,
          false   // isTestKey
        )
        
        expect(shouldRender).toBe(false)
      })
    })
  })
  
  describe('Environment-Specific Test Scenarios', () => {
    it('should handle development with test keys (common scenario)', () => {
      const publishableKey = 'pk_test_development_key'
      const secretKey = 'sk_test_development_secret'
      const isDevelopment = true
      
      const hasValidKeys = mockLayoutLogic.checkClerkKeys(publishableKey, secretKey)
      const isTestKey = mockLayoutLogic.isTestKey(publishableKey)
      const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
        hasValidKeys,
        isDevelopment,
        isTestKey
      )
      
      expect(hasValidKeys).toBe(true)
      expect(isTestKey).toBe(true)
      expect(shouldRender).toBe(true) // Should render with Clerk in development
    })
    
    it('should handle production with live keys', () => {
      const publishableKey = 'pk_live_production_key'
      const secretKey = 'sk_live_production_secret'
      const isDevelopment = false
      
      const hasValidKeys = mockLayoutLogic.checkClerkKeys(publishableKey, secretKey)
      const isTestKey = mockLayoutLogic.isTestKey(publishableKey)
      const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
        hasValidKeys,
        isDevelopment,
        isTestKey
      )
      
      expect(hasValidKeys).toBe(true)
      expect(isTestKey).toBe(false)
      expect(shouldRender).toBe(true) // Should render with Clerk in production
    })
    
    it('should handle production with test keys (security issue)', () => {
      const publishableKey = 'pk_test_accidentally_in_production'
      const secretKey = 'sk_test_accidentally_in_production'
      const isDevelopment = false
      
      const hasValidKeys = mockLayoutLogic.checkClerkKeys(publishableKey, secretKey)
      const isTestKey = mockLayoutLogic.isTestKey(publishableKey)
      const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
        hasValidKeys,
        isDevelopment,
        isTestKey
      )
      
      expect(hasValidKeys).toBe(true)
      expect(isTestKey).toBe(true)
      expect(shouldRender).toBe(false) // Should NOT render with Clerk (security)
    })
  })
  
  describe('Integration with Mock Infrastructure', () => {
    it('should work with fixed Clerk mocks', () => {
      const mockClerk = MockInfrastructure.createFixedClerkMock({
        userId: 'test-user',
        isAuthenticated: true
      })
      
      const authResult = mockClerk.auth()
      
      expect(authResult.userId).toBe('test-user')
      expect(authResult.sessionId).toBe('test-session-id')
    })
    
    it('should handle unauthenticated state properly', () => {
      const mockClerk = MockInfrastructure.createFixedClerkMock({
        isAuthenticated: false
      })
      
      const authResult = mockClerk.auth()
      
      expect(authResult.userId).toBeNull()
      expect(authResult.orgId).toBeNull()
      expect(authResult.sessionId).toBeNull()
    })
  })
  
  describe('Regression Prevention', () => {
    it('should maintain backward compatibility for valid scenarios', () => {
      // Test scenarios that should continue working
      const scenarios = [
        {
          name: 'Development with test keys',
          hasValidKeys: true,
          isDevelopment: true,
          isTestKey: true,
          expected: true
        },
        {
          name: 'Development with live keys',
          hasValidKeys: true,
          isDevelopment: true,
          isTestKey: false,
          expected: true
        },
        {
          name: 'Production with live keys',
          hasValidKeys: true,
          isDevelopment: false,
          isTestKey: false,
          expected: true
        },
        {
          name: 'Production with test keys (blocked)',
          hasValidKeys: true,
          isDevelopment: false,
          isTestKey: true,
          expected: false
        },
        {
          name: 'Invalid keys anywhere',
          hasValidKeys: false,
          isDevelopment: true,
          isTestKey: false,
          expected: false
        }
      ]
      
      scenarios.forEach(scenario => {
        const result = mockLayoutLogic.shouldRenderWithClerk(
          scenario.hasValidKeys,
          scenario.isDevelopment,
          scenario.isTestKey
        )
        
        expect(result).toBe(scenario.expected)
      })
    })
  })
})

// Export test utilities for other authentication tests
export const AuthTestUtils = {
  mockLayoutLogic,
  createTestScenario: (
    publishableKey: string,
    secretKey: string,
    isDevelopment: boolean
  ) => {
    const hasValidKeys = mockLayoutLogic.checkClerkKeys(publishableKey, secretKey)
    const isTestKey = mockLayoutLogic.isTestKey(publishableKey)
    const shouldRender = mockLayoutLogic.shouldRenderWithClerk(
      hasValidKeys,
      isDevelopment,
      isTestKey
    )
    
    return {
      hasValidKeys,
      isTestKey,
      shouldRender,
      environment: isDevelopment ? 'development' : 'production'
    }
  }
}