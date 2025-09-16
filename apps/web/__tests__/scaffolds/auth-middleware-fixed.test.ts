/**
 * Fixed Authentication Middleware Test Scaffold
 * Addresses critical authentication mocking issues
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Proper mocking setup for authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn()
}))

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(public url: string, public init?: RequestInit) {}
    json() { return Promise.resolve(this.init?.body ? JSON.parse(this.init.body as string) : {}) }
  },
  NextResponse: {
    json: vi.fn((data: any, init?: ResponseInit) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Headers(init?.headers)
    })),
    next: vi.fn(() => ({
      status: 200,
      headers: new Headers()
    })),
    redirect: vi.fn((url: string) => ({
      status: 302,
      headers: new Headers({ Location: url })
    }))
  }
}))

// Import after mocking
import { withUserSync } from '@/lib/middleware/auth'
import { auth } from '@clerk/nextjs/server'

describe('Authentication Middleware - Fixed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withUserSync middleware', () => {
    it('should authenticate valid user and sync to database', async () => {
      // Mock successful authentication
      vi.mocked(auth).mockResolvedValue({
        userId: 'clerk_test_user_123',
        orgId: 'org_test_123'
      } as any)

      // Mock user service
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = withUserSync(mockHandler)
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('should return 401 for unauthenticated requests', async () => {
      // Mock failed authentication
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null
      } as any)

      const mockHandler = vi.fn()
      const wrappedHandler = withUserSync(mockHandler)
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await wrappedHandler(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('should handle authentication errors gracefully', async () => {
      // Mock authentication error
      vi.mocked(auth).mockRejectedValue(new Error('Auth service unavailable'))

      const mockHandler = vi.fn()
      const wrappedHandler = withUserSync(mockHandler)
      const request = new NextRequest('http://localhost:3000/api/test')

      const response = await wrappedHandler(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(500)
    })
  })
})