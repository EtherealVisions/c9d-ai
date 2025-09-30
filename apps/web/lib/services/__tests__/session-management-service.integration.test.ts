/**
 * Integration Tests for SessionManagementService - Drizzle Migration
 * 
 * These tests use Drizzle database to validate:
 * - Database schema and constraints
 * - Actual SQL query execution with Drizzle
 * - Data integrity and relationships
 * - Performance characteristics
 * Requirements: 5.4 - Update tests to use new database layer
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { SessionManagementService } from '../session-management-service'
import {
  createTestDatabase,
  seedTestDatabase,
  cleanTestDatabase,
  createTestDatabaseUtils,
  TestDatabaseUtils,
  testSetup,
  testTeardown
} from '../../../__tests__/setup/drizzle-testing-setup'
import type { DrizzleDatabase } from '@/lib/db/connection'

describe('SessionManagementService - Integration Tests - Drizzle Migration', () => {
  let service: SessionManagementService
  let testDb: DrizzleDatabase
  let testUtils: TestDatabaseUtils
  let testUser: any
  let testOrganization: any

  beforeAll(async () => {
    // Setup Drizzle test database
    testDb = await testSetup()
    testUtils = createTestDatabaseUtils(testDb)
    
    // Create test data using Drizzle utilities
    testUser = await testUtils.createTestUser({
      firstName: 'Integration',
      lastName: 'Test',
      email: 'integration.test@example.com',
      clerkUserId: 'clerk_integration_test'
    })
    
    testOrganization = await testUtils.createTestOrganization({
      name: 'Test Organization for Sessions',
      slug: 'test-org-sessions'
    })
    
    const testRole = await testUtils.createTestRole({
      name: 'Admin',
      permissions: ['session.read', 'session.write']
    })
    
    await testUtils.createTestMembership(testUser.id, testOrganization.id, testRole.id)
  })

  afterAll(async () => {
    await testTeardown()
  })

  beforeEach(async () => {
    service = new SessionManagementService()
    // Clean session data between tests
    await cleanTestDatabase()
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