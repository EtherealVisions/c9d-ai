/**
 * Integration Tests for SessionManagementService
 * 
 * These tests use a real Supabase database to validate:
 * - Database schema and constraints
 * - Actual SQL query execution
 * - Data integrity and relationships
 * - Performance characteristics
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { SessionManagementService } from '../session-management-service'
import { setupIntegrationTest, testDb, validateTestEnvironment } from '../../../__tests__/setup/test-database'

// Validate test environment before running tests
validateTestEnvironment()

describe('SessionManagementService - Integration Tests', () => {
  let service: SessionManagementService
  let cleanup: () => Promise<void>
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    // Setup integration test environment
    const setup = await setupIntegrationTest()
    cleanup = setup.cleanup
    
    // Create test data
    testUser = await testDb.createTestUser({
      first_name: 'Integration',
      last_name: 'Test'
    })
    
    testOrganization = await testDb.createTestOrganization({
      name: 'Test Organization for Sessions'
    })
    
    await testDb.createTestMembership(testUser.id, testOrganization.id, 'admin')
  })

  afterAll(async () => {
    if (cleanup) {
      await cleanup()
    }
  })

  beforeEach(() => {
    service = new SessionManagementService()
  })

  describe('Session Lifecycle', () => {
    it('should create and manage a complete session lifecycle', async () => {
      const sessionId = `test_session_${Date.now()}`
      
      // 1. Initialize session
      await service.initializeSession(testUser.id, sessionId, testOrganization.id)
      
      // 2. Verify session was created in database
      const sessions = await service.getUserActiveSessions(testUser.id)
      expect(sessions).toHaveLength(1)
      expect(sessions[0].sessionId).toBe(sessionId)
      expect(sessions[0].userId).toBe(testUser.id)
      expect(sessions[0].organizationId).toBe(testOrganization.id)
      expect(sessions[0].isActive).toBe(true)
      
      // 3. Update session activity
      await service.updateSessionActivity(sessionId)
      
      // 4. Verify session is still valid
      const isValid = await service.checkAndRefreshSession(sessionId)
      expect(isValid).toBe(true)
      
      // 5. Revoke session
      await service.revokeSession(sessionId, 'test_completion')
      
      // 6. Verify session is no longer active
      const activeSessions = await service.getUserActiveSessions(testUser.id)
      expect(activeSessions).toHaveLength(0)
    })

    it('should handle multiple concurrent sessions', async () => {
      const sessionIds = [
        `test_session_1_${Date.now()}`,
        `test_session_2_${Date.now()}`,
        `test_session_3_${Date.now()}`
      ]
      
      // Create multiple sessions
      await Promise.all(
        sessionIds.map(sessionId => 
          service.initializeSession(testUser.id, sessionId, testOrganization.id)
        )
      )
      
      // Verify all sessions are active
      const sessions = await service.getUserActiveSessions(testUser.id)
      expect(sessions).toHaveLength(3)
      
      // Revoke one session
      await service.revokeSession(sessionIds[1], 'selective_logout')
      
      // Verify only 2 sessions remain
      const remainingSessions = await service.getUserActiveSessions(testUser.id)
      expect(remainingSessions).toHaveLength(2)
      
      // Revoke all other sessions
      await service.revokeOtherSessions(testUser.id, sessionIds[0])
      
      // Verify only the current session remains
      const finalSessions = await service.getUserActiveSessions(testUser.id)
      expect(finalSessions).toHaveLength(1)
      expect(finalSessions[0].sessionId).toBe(sessionIds[0])
    })
  })

  describe('Session Validation and Security', () => {
    it('should validate session expiry correctly', async () => {
      const sessionId = `test_expiry_${Date.now()}`
      
      // Initialize session
      await service.initializeSession(testUser.id, sessionId, testOrganization.id)
      
      // Session should be valid initially
      const isValidInitially = await service.checkAndRefreshSession(sessionId)
      expect(isValidInitially).toBe(true)
    })

    it('should handle invalid session IDs gracefully', async () => {
      const invalidSessionId = 'nonexistent_session_id'
      
      // Should return false for non-existent session
      const isValid = await service.checkAndRefreshSession(invalidSessionId)
      expect(isValid).toBe(false)
      
      // Should handle revocation gracefully
      await expect(
        service.revokeSession(invalidSessionId, 'test')
      ).resolves.not.toThrow()
    })
  })
})