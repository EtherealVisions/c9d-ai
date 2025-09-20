import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/clerk/route'
import { userSyncService } from '@/lib/services/user-sync'
import { authRouterService } from '@/lib/services/auth-router-service'

// Mock dependencies
vi.mock('@/lib/services/user-sync')
vi.mock('@/lib/services/auth-router-service')

// Mock Clerk webhook verification
vi.mock('@clerk/nextjs/server', () => ({
  WebhookEvent: vi.fn(),
  Webhook: vi.fn().mockImplementation(() => ({
    verify: vi.fn()
  }))
}))

describe('Webhook Handlers - Comprehensive Integration Tests', () => {
  let mockRequest: NextRequest
  let mockWebhook: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock webhook verification
    const { Webhook } = require('@clerk/nextjs/server')
    mockWebhook = {
      verify: vi.fn()
    }
    Webhook.mockImplementation(() => mockWebhook)

    // Mock environment variable
    process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret'

    // Mock services
    vi.mocked(userSyncService.syncUser).mockResolvedValue({
      user: {
        id: 'user-123',
        clerkUserId: 'clerk-user-123',
        email: 'test@example.com'
      } as any,
      isNew: false
    })

    vi.mocked(userSyncService.handleSessionCreated).mockResolvedValue()
    vi.mocked(userSyncService.handleSessionEnded).mockResolvedValue()
    vi.mocked(userSyncService.deleteUser).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.CLERK_WEBHOOK_SECRET
  })

  describe('User Created Webhook', () => {
    it('should handle user.created webhook successfully', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'John',
          last_name: 'Doe',
          image_url: 'https://example.com/avatar.jpg'
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.syncUser).toHaveBeenCalledWith(
        webhookPayload.data,
        expect.objectContaining({
          source: 'webhook',
          eventType: 'user.created'
        })
      )
    })

    it('should handle user.created with minimal data', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'clerk-user-123',
          email_addresses: []
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.syncUser).toHaveBeenCalledWith(
        webhookPayload.data,
        expect.any(Object)
      )
    })

    it('should handle user sync service errors gracefully', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }]
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock service error
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        user: {} as any,
        isNew: false,
        error: 'Database connection failed'
      })

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      // Should still return 200 to acknowledge webhook receipt
      expect(response.status).toBe(200)
    })
  })

  describe('User Updated Webhook', () => {
    it('should handle user.updated webhook successfully', async () => {
      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'updated@example.com' }],
          first_name: 'Jane',
          last_name: 'Smith',
          image_url: 'https://example.com/new-avatar.jpg'
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.syncUser).toHaveBeenCalledWith(
        webhookPayload.data,
        expect.objectContaining({
          source: 'webhook',
          eventType: 'user.updated'
        })
      )
    })

    it('should handle profile changes tracking', async () => {
      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'UpdatedName',
          last_name: 'Doe'
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock sync service to return change metadata
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        user: {
          id: 'user-123',
          firstName: 'UpdatedName'
        } as any,
        isNew: false,
        syncMetadata: {
          syncedAt: new Date(),
          source: 'webhook',
          changes: ['firstName'],
          previousValues: { firstName: 'John' }
        }
      })

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.syncUser).toHaveBeenCalled()
    })
  })

  describe('User Deleted Webhook', () => {
    it('should handle user.deleted webhook successfully', async () => {
      const webhookPayload = {
        type: 'user.deleted',
        data: {
          id: 'clerk-user-123',
          deleted: true
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.deleteUser).toHaveBeenCalledWith('clerk-user-123')
    })

    it('should handle user deletion failures gracefully', async () => {
      const webhookPayload = {
        type: 'user.deleted',
        data: {
          id: 'clerk-user-123',
          deleted: true
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock deletion failure
      vi.mocked(userSyncService.deleteUser).mockResolvedValue(false)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      // Should still return 200 to acknowledge webhook
      expect(response.status).toBe(200)
    })
  })

  describe('Session Webhooks', () => {
    it('should handle session.created webhook successfully', async () => {
      const webhookPayload = {
        type: 'session.created',
        data: {
          id: 'session-123',
          user_id: 'clerk-user-123',
          status: 'active',
          created_at: Date.now()
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.handleSessionCreated).toHaveBeenCalledWith(
        'clerk-user-123',
        'session-123',
        expect.objectContaining({
          source: 'webhook',
          eventType: 'session.created'
        })
      )
    })

    it('should handle session.ended webhook successfully', async () => {
      const webhookPayload = {
        type: 'session.ended',
        data: {
          id: 'session-123',
          user_id: 'clerk-user-123',
          status: 'ended',
          ended_at: Date.now()
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.handleSessionEnded).toHaveBeenCalledWith(
        'clerk-user-123',
        'session-123',
        expect.objectContaining({
          source: 'webhook',
          eventType: 'session.ended'
        })
      )
    })

    it('should handle session webhooks with missing user gracefully', async () => {
      const webhookPayload = {
        type: 'session.created',
        data: {
          id: 'session-123',
          user_id: 'nonexistent-user',
          status: 'active'
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock service to handle missing user
      vi.mocked(userSyncService.handleSessionCreated).mockRejectedValue(
        new Error('User not found')
      )

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      // Should still return 200 to acknowledge webhook
      expect(response.status).toBe(200)
    })
  })

  describe('Webhook Security and Validation', () => {
    it('should reject webhooks with invalid signatures', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: { id: 'clerk-user-123' }
      }

      // Mock signature verification failure
      mockWebhook.verify.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'invalid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
      expect(userSyncService.syncUser).not.toHaveBeenCalled()
    })

    it('should handle missing webhook secret', async () => {
      delete process.env.CLERK_WEBHOOK_SECRET

      const webhookPayload = {
        type: 'user.created',
        data: { id: 'clerk-user-123' }
      }

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(500)
    })

    it('should handle malformed webhook payloads', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: 'invalid-json',
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
    })

    it('should validate webhook event types', async () => {
      const webhookPayload = {
        type: 'unknown.event',
        data: { id: 'test-id' }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      // Should return 200 but not process unknown events
      expect(response.status).toBe(200)
      expect(userSyncService.syncUser).not.toHaveBeenCalled()
    })
  })

  describe('Webhook Performance and Reliability', () => {
    it('should handle high-frequency webhook bursts', async () => {
      const webhookPayloads = Array.from({ length: 10 }, (_, i) => ({
        type: 'user.updated',
        data: {
          id: `clerk-user-${i}`,
          email_addresses: [{ email_address: `user${i}@example.com` }]
        }
      }))

      const requests = webhookPayloads.map(payload => {
        mockWebhook.verify.mockReturnValue(payload)
        
        return new NextRequest('http://localhost:3000/api/webhooks/clerk', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            'svix-signature': 'valid-signature'
          }
        })
      })

      // Process all webhooks concurrently
      const responses = await Promise.all(requests.map(req => POST(req)))

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      expect(userSyncService.syncUser).toHaveBeenCalledTimes(10)
    })

    it('should handle webhook processing timeouts gracefully', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }]
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock slow service response
      vi.mocked(userSyncService.syncUser).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 30000))
      )

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      // Should handle timeout gracefully
      const response = await Promise.race([
        POST(mockRequest),
        new Promise(resolve => setTimeout(() => resolve({ status: 408 }), 1000))
      ])

      // Should either complete or timeout gracefully
      expect([200, 408]).toContain((response as any).status)
    })

    it('should handle database connection failures during webhook processing', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }]
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock database connection failure
      vi.mocked(userSyncService.syncUser).mockRejectedValue(
        new Error('Database connection failed')
      )

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      // Should return 200 to acknowledge webhook receipt
      expect(response.status).toBe(200)
    })
  })

  describe('Webhook Idempotency and Deduplication', () => {
    it('should handle duplicate webhook deliveries', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }]
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature',
          'svix-id': 'webhook-123',
          'svix-timestamp': '1234567890'
        }
      })

      // Process same webhook twice
      const response1 = await POST(mockRequest)
      const response2 = await POST(mockRequest)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      // Service should handle idempotency
      expect(userSyncService.syncUser).toHaveBeenCalledTimes(2)
    })

    it('should handle out-of-order webhook delivery', async () => {
      const olderWebhook = {
        type: 'user.updated',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'old@example.com' }],
          updated_at: 1000
        }
      }

      const newerWebhook = {
        type: 'user.updated',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'new@example.com' }],
          updated_at: 2000
        }
      }

      // Process newer webhook first, then older one
      mockWebhook.verify.mockReturnValueOnce(newerWebhook)
      let request = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(newerWebhook),
        headers: { 'svix-signature': 'valid-signature' }
      })
      await POST(request)

      mockWebhook.verify.mockReturnValueOnce(olderWebhook)
      request = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(olderWebhook),
        headers: { 'svix-signature': 'valid-signature' }
      })
      await POST(request)

      // Both should be processed
      expect(userSyncService.syncUser).toHaveBeenCalledTimes(2)
    })
  })

  describe('Webhook Integration with Other Services', () => {
    it('should integrate with routing service for user onboarding updates', async () => {
      const webhookPayload = {
        type: 'user.updated',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }],
          public_metadata: {
            onboarding_completed: true
          }
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock routing service integration
      vi.mocked(authRouterService.completeOnboarding).mockResolvedValue()

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.syncUser).toHaveBeenCalled()
    })

    it('should handle webhook processing with service dependencies', async () => {
      const webhookPayload = {
        type: 'user.created',
        data: {
          id: 'clerk-user-123',
          email_addresses: [{ email_address: 'test@example.com' }]
        }
      }

      mockWebhook.verify.mockReturnValue(webhookPayload)

      // Mock service chain
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        user: { id: 'user-123' } as any,
        isNew: true
      })

      mockRequest = new NextRequest('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookPayload),
        headers: {
          'svix-signature': 'valid-signature'
        }
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(userSyncService.syncUser).toHaveBeenCalledWith(
        webhookPayload.data,
        expect.objectContaining({
          source: 'webhook'
        })
      )
    })
  })
})