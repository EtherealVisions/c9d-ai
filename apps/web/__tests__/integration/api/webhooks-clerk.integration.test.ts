/**
 * Clerk Webhook Integration Tests
 * Tests the complete webhook handling flow including user lifecycle events,
 * session tracking, and security event processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/clerk/route'
import { userSyncService } from '@/lib/services/user-sync'
import { securityEventTracker } from '@/lib/services/security-event-tracker'
import { createSupabaseClient } from '@/lib/database'
import { Webhook } from 'svix'

// Mock dependencies
vi.mock('@/lib/config/init', () => ({
  getAppConfigSync: vi.fn(() => 'test-webhook-secret')
}))

vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: vi.fn()
  }))
}))

vi.mock('@/lib/services/user-sync')
vi.mock('@/lib/services/security-event-tracker')

const mockUserSyncService = vi.mocked(userSyncService)
const mockSecurityEventTracker = vi.mocked(securityEventTracker)
const mockWebhook = vi.mocked(Webhook)

describe('Clerk Webhook Integration Tests', () => {
  let mockVerify: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup webhook verification mock
    mockVerify = vi.fn()
    mockWebhook.mockImplementation(() => ({
      verify: mockVerify
    }) as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Webhook Authentication', () => {
    it('should reject requests without required headers', async () => {
      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: {} })
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const body = await response.text()
      expect(body).toContain('Missing required webhook headers')
    })

    it('should reject requests with invalid signature', async () => {
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'invalid-signature'
        },
        body: JSON.stringify({ type: 'user.created', data: {} })
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const body = await response.text()
      expect(body).toContain('Invalid webhook signature')
    })

    it('should process valid webhook requests', async () => {
      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User'
        }
      }

      mockVerify.mockReturnValue(webhookEvent)
      mockUserSyncService.syncUser.mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        } as any,
        isNew: true
      })
      mockSecurityEventTracker.trackClerkWebhookEvent.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual({
        received: true,
        eventType: 'user.created',
        processed: true
      })
    })
  })

  describe('User Lifecycle Events', () => {
    beforeEach(() => {
      mockVerify.mockImplementation((body) => JSON.parse(body))
      mockSecurityEventTracker.trackClerkWebhookEvent.mockResolvedValue()
    })

    it('should handle user.created events', async () => {
      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'newuser@example.com' }],
          first_name: 'New',
          last_name: 'User',
          external_accounts: []
        }
      }

      mockUserSyncService.syncUser.mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User'
        } as any,
        isNew: true
      })

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.syncUser).toHaveBeenCalledWith(
        webhookEvent.data,
        expect.objectContaining({
          source: 'clerk_webhook',
          action: 'user_created',
          webhookEvent: true
        })
      )
      expect(mockSecurityEventTracker.trackClerkWebhookEvent).toHaveBeenCalledWith(webhookEvent)
    })

    it('should handle user.updated events', async () => {
      const webhookEvent = {
        type: 'user.updated',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'updated@example.com' }],
          first_name: 'Updated',
          last_name: 'User',
          two_factor_enabled: true
        }
      }

      mockUserSyncService.syncUser.mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'updated@example.com',
          firstName: 'Updated',
          lastName: 'User'
        } as any,
        isNew: false
      })
      mockUserSyncService.logAuthEvent.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.syncUser).toHaveBeenCalledWith(
        webhookEvent.data,
        expect.objectContaining({
          source: 'clerk_webhook',
          action: 'user_updated',
          webhookEvent: true
        })
      )
      
      // Should log 2FA enablement
      expect(mockUserSyncService.logAuthEvent).toHaveBeenCalledWith(
        'user_123',
        'two_factor_enabled',
        expect.objectContaining({
          twoFactorEnabled: true,
          action: 'enabled',
          securityEnhancement: true
        })
      )
    })

    it('should handle user.deleted events', async () => {
      const webhookEvent = {
        type: 'user.deleted',
        data: {
          id: 'user_123'
        }
      }

      mockUserSyncService.deleteUser.mockResolvedValue(true)

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.deleteUser).toHaveBeenCalledWith('user_123')
    })

    it('should handle user deletion failure', async () => {
      const webhookEvent = {
        type: 'user.deleted',
        data: {
          id: 'user_123'
        }
      }

      mockUserSyncService.deleteUser.mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to delete user')
    })
  })

  describe('Session Lifecycle Events', () => {
    beforeEach(() => {
      mockVerify.mockImplementation((body) => JSON.parse(body))
      mockSecurityEventTracker.trackClerkWebhookEvent.mockResolvedValue()
      mockSecurityEventTracker.trackSessionEvent.mockResolvedValue()
    })

    it('should handle session.created events with enhanced tracking', async () => {
      const webhookEvent = {
        type: 'session.created',
        data: {
          id: 'sess_123',
          user_id: 'user_123',
          status: 'active',
          last_active_at: 1234567890,
          expire_at: 1234567890 + 3600,
          abandon_at: 1234567890 + 7200
        }
      }

      mockUserSyncService.handleSessionCreated.mockResolvedValue()
      mockUserSyncService.updateLastSignIn.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.handleSessionCreated).toHaveBeenCalledWith(
        'user_123',
        'sess_123',
        expect.objectContaining({
          source: 'clerk_webhook',
          action: 'session_created',
          sessionData: {
            status: 'active',
            lastActiveAt: 1234567890,
            expireAt: 1234567890 + 3600,
            abandonAt: 1234567890 + 7200
          }
        })
      )
      
      expect(mockUserSyncService.updateLastSignIn).toHaveBeenCalledWith(
        'user_123',
        {
          sessionId: 'sess_123',
          sessionStatus: 'active',
          timestamp: expect.any(String)
        }
      )
      
      expect(mockSecurityEventTracker.trackSessionEvent).toHaveBeenCalledWith(
        'user_123',
        'sess_123',
        'session_created',
        expect.objectContaining({
          sessionData: webhookEvent.data
        })
      )
    })

    it('should handle session.ended events with enhanced tracking', async () => {
      const webhookEvent = {
        type: 'session.ended',
        data: {
          id: 'sess_123',
          user_id: 'user_123',
          status: 'expired'
        }
      }

      mockUserSyncService.handleSessionEnded.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.handleSessionEnded).toHaveBeenCalledWith(
        'user_123',
        'sess_123',
        expect.objectContaining({
          source: 'clerk_webhook',
          action: 'session_ended',
          sessionData: {
            status: 'expired',
            endedAt: expect.any(String),
            reason: 'expired'
          }
        })
      )
      
      expect(mockSecurityEventTracker.trackSessionEvent).toHaveBeenCalledWith(
        'user_123',
        'sess_123',
        'session_ended',
        expect.objectContaining({
          sessionData: webhookEvent.data,
          endReason: 'expired'
        })
      )
    })

    it('should handle session.revoked events as security events', async () => {
      const webhookEvent = {
        type: 'session.revoked',
        data: {
          id: 'sess_123',
          user_id: 'user_123',
          revoked_by: 'admin_456'
        }
      }

      mockUserSyncService.getUserByClerkId.mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com'
      } as any)
      mockUserSyncService.logAuthEvent.mockResolvedValue()
      mockSecurityEventTracker.trackSecurityEvent.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.logAuthEvent).toHaveBeenCalledWith(
        'user_123',
        'session_ended',
        expect.objectContaining({
          sessionId: 'sess_123',
          reason: 'revoked',
          revokedBy: 'admin_456'
        })
      )
      
      expect(mockSecurityEventTracker.trackSecurityEvent).toHaveBeenCalledWith(
        'user_123',
        'session_revoked',
        expect.objectContaining({
          sessionId: 'sess_123',
          revokedBy: 'admin_456',
          reason: 'security_revocation'
        })
      )
    })
  })

  describe('Security Events', () => {
    beforeEach(() => {
      mockVerify.mockImplementation((body) => JSON.parse(body))
      mockSecurityEventTracker.trackClerkWebhookEvent.mockResolvedValue()
    })

    it('should handle user.banned events', async () => {
      const webhookEvent = {
        type: 'user.banned',
        data: {
          id: 'user_123'
        }
      }

      mockUserSyncService.getUserByClerkId.mockResolvedValue({
        id: 'user_123',
        email: 'banned@example.com'
      } as any)
      mockUserSyncService.updateUserStatus.mockResolvedValue({
        user: { id: 'user_123' } as any,
        isNew: false
      })
      mockUserSyncService.logAuthEvent.mockResolvedValue()
      mockSecurityEventTracker.createSecurityIncident.mockResolvedValue({
        id: 'incident_123',
        type: 'account_takeover',
        severity: 'high'
      } as any)

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.updateUserStatus).toHaveBeenCalledWith(
        'user_123',
        'suspended',
        'Account banned by administrator',
        'system'
      )
      
      expect(mockSecurityEventTracker.createSecurityIncident).toHaveBeenCalledWith({
        type: 'account_takeover',
        severity: 'high',
        userId: 'user_123',
        description: 'User account user_123 has been banned',
        evidence: {
          clerkEvent: webhookEvent,
          timestamp: expect.any(String)
        },
        actions: ['account_suspended', 'sessions_revoked']
      })
    })

    it('should handle email verification events', async () => {
      const webhookEvent = {
        type: 'email.created',
        data: {
          object_id: 'user_123',
          email_address: 'verified@example.com',
          verification: {
            status: 'verified',
            strategy: 'email_code'
          }
        }
      }

      mockUserSyncService.getUserByClerkId.mockResolvedValue({
        id: 'user_123',
        email: 'verified@example.com'
      } as any)
      mockUserSyncService.logAuthEvent.mockResolvedValue()
      mockSecurityEventTracker.trackSecurityEvent.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.logAuthEvent).toHaveBeenCalledWith(
        'user_123',
        'email_verification',
        expect.objectContaining({
          emailAddress: 'verified@example.com',
          verified: true,
          verificationStrategy: 'email_code'
        })
      )
      
      expect(mockSecurityEventTracker.trackSecurityEvent).toHaveBeenCalledWith(
        'user_123',
        'email_verified',
        expect.objectContaining({
          emailAddress: 'verified@example.com',
          verificationMethod: 'email_code'
        })
      )
    })
  })

  describe('Organization Events', () => {
    beforeEach(() => {
      mockVerify.mockImplementation((body) => JSON.parse(body))
      mockSecurityEventTracker.trackClerkWebhookEvent.mockResolvedValue()
    })

    it('should handle organizationMembership.created events', async () => {
      const webhookEvent = {
        type: 'organizationMembership.created',
        data: {
          public_user_data: {
            user_id: 'user_123'
          },
          organization: {
            id: 'org_456'
          },
          role: 'member'
        }
      }

      mockUserSyncService.getUserByClerkId.mockResolvedValue({
        id: 'user_123',
        email: 'member@example.com'
      } as any)
      mockUserSyncService.logAuthEvent.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.logAuthEvent).toHaveBeenCalledWith(
        'user_123',
        'user_updated',
        expect.objectContaining({
          action: 'organization_membership_created',
          organizationId: 'org_456',
          role: 'member'
        })
      )
    })

    it('should handle organizationMembership.deleted events', async () => {
      const webhookEvent = {
        type: 'organizationMembership.deleted',
        data: {
          public_user_data: {
            user_id: 'user_123'
          },
          organization: {
            id: 'org_456'
          },
          role: 'member'
        }
      }

      mockUserSyncService.getUserByClerkId.mockResolvedValue({
        id: 'user_123',
        email: 'former-member@example.com'
      } as any)
      mockUserSyncService.logAuthEvent.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.logAuthEvent).toHaveBeenCalledWith(
        'user_123',
        'user_updated',
        expect.objectContaining({
          action: 'organization_membership_deleted',
          organizationId: 'org_456',
          previousRole: 'member'
        })
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockVerify.mockImplementation((body) => JSON.parse(body))
      mockSecurityEventTracker.trackClerkWebhookEvent.mockResolvedValue()
    })

    it('should handle user sync errors gracefully', async () => {
      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'error@example.com' }]
        }
      }

      mockUserSyncService.syncUser.mockResolvedValue({
        user: {} as any,
        isNew: false,
        error: 'Database connection failed'
      })

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to sync user')
    })

    it('should handle unknown event types', async () => {
      const webhookEvent = {
        type: 'unknown.event',
        data: {}
      }

      mockSecurityEventTracker.trackSecurityEvent.mockResolvedValue()

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockSecurityEventTracker.trackSecurityEvent).toHaveBeenCalledWith(
        undefined,
        'webhook_unhandled_event',
        expect.objectContaining({
          eventType: 'unknown.event',
          eventData: {}
        })
      )
    })

    it('should handle webhook processing errors', async () => {
      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123'
        }
      }

      mockUserSyncService.syncUser.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body).toEqual({
        error: 'Internal server error',
        eventType: 'user.created',
        processed: false
      })
    })
  })

  describe('Webhook Metadata Tracking', () => {
    beforeEach(() => {
      mockVerify.mockImplementation((body) => JSON.parse(body))
      mockSecurityEventTracker.trackClerkWebhookEvent.mockResolvedValue()
    })

    it('should include webhook metadata in all events', async () => {
      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'metadata@example.com' }]
        }
      }

      mockUserSyncService.syncUser.mockResolvedValue({
        user: { id: 'user_123' } as any,
        isNew: true
      })

      const request = new NextRequest('http://localhost/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'webhook-123',
          'svix-timestamp': '1234567890',
          'svix-signature': 'valid-signature'
        },
        body: JSON.stringify(webhookEvent)
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(mockUserSyncService.syncUser).toHaveBeenCalledWith(
        webhookEvent.data,
        expect.objectContaining({
          webhookId: 'webhook-123',
          timestamp: '1234567890',
          eventType: 'user.created',
          clerkEventId: 'user_123',
          source: 'clerk_webhook',
          action: 'user_created',
          webhookEvent: true
        })
      )
    })
  })
})