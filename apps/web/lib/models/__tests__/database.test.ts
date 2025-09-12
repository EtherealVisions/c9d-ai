/**
 * Unit tests for database utilities
 * Note: These tests focus on the TypedSupabaseClient class structure and error handling
 * Integration tests with actual database would be in a separate test suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TypedSupabaseClient, DatabaseError, NotFoundError, ValidationError } from '../database'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  range: vi.fn(),
  in: vi.fn()
}

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

describe('TypedSupabaseClient', () => {
  let client: TypedSupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new TypedSupabaseClient({
      url: 'https://test.supabase.co',
      anonKey: 'test-key'
    })
  })

  describe('Error Handling', () => {
    it('should create DatabaseError with message and code', () => {
      const error = new DatabaseError('Test error', 'TEST_CODE', { detail: 'test' })
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toEqual({ detail: 'test' })
      expect(error.name).toBe('DatabaseError')
    })

    it('should create NotFoundError with resource and id', () => {
      const error = new NotFoundError('User', '123')
      
      expect(error.message).toBe('User with id 123 not found')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.name).toBe('NotFoundError')
    })

    it('should create ValidationError with message and details', () => {
      const error = new ValidationError('Invalid data', { field: 'email' })
      
      expect(error.message).toBe('Invalid data')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual({ field: 'email' })
      expect(error.name).toBe('ValidationError')
    })
  })

  describe('Client Methods', () => {
    it('should return underlying Supabase client', () => {
      const underlyingClient = client.getClient()
      expect(underlyingClient).toBe(mockSupabaseClient)
    })

    it('should handle successful user query', async () => {
      const mockUserRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        clerk_user_id: 'user_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: null,
        preferences: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      // Mock the chain of method calls
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUserRow, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const user = await client.getUser('123e4567-e89b-12d3-a456-426614174000')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockQuery.select).toHaveBeenCalledWith('*')
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174000')
      expect(mockQuery.single).toHaveBeenCalled()
      
      expect(user).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        clerkUserId: 'user_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: undefined,
        preferences: {},
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      })
    })

    it('should return null for not found user', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116', message: 'Not found' } 
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const user = await client.getUser('nonexistent-id')
      expect(user).toBeNull()
    })

    it('should throw DatabaseError for database errors', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST301', message: 'Database error' } 
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      await expect(client.getUser('123')).rejects.toThrow(DatabaseError)
    })

    it('should handle successful user creation', async () => {
      const userData = {
        clerkUserId: 'user_123',
        email: 'test@example.com',
        firstName: 'John',
        preferences: {}
      }

      const mockUserRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        clerk_user_id: 'user_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: null,
        avatar_url: null,
        preferences: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUserRow, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const user = await client.createUser(userData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockQuery.insert).toHaveBeenCalledWith({
        clerk_user_id: 'user_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: null,
        avatar_url: null,
        preferences: {}
      })
      
      expect(user.clerkUserId).toBe('user_123')
      expect(user.email).toBe('test@example.com')
    })

    it('should handle successful organization query by slug', async () => {
      const mockOrgRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Organization',
        slug: 'test-org',
        description: null,
        avatar_url: null,
        metadata: {},
        settings: {},
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockOrgRow, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const organization = await client.getOrganizationBySlug('test-org')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organizations')
      expect(mockQuery.eq).toHaveBeenCalledWith('slug', 'test-org')
      
      expect(organization?.slug).toBe('test-org')
      expect(organization?.name).toBe('Test Organization')
    })

    it('should handle membership creation', async () => {
      const membershipData = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        organizationId: '123e4567-e89b-12d3-a456-426614174002',
        roleId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active' as const,
        joinedAt: new Date('2023-01-01T00:00:00Z')
      }

      const mockMembershipRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        organization_id: '123e4567-e89b-12d3-a456-426614174002',
        role_id: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active',
        joined_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockMembershipRow, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const membership = await client.createMembership(membershipData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_memberships')
      expect(membership.status).toBe('active')
      expect(membership.userId).toBe('123e4567-e89b-12d3-a456-426614174001')
    })

    it('should handle audit log queries with filters', async () => {
      const mockAuditLogRows = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          organization_id: null,
          action: 'user.created',
          resource_type: 'user',
          resource_id: '123e4567-e89b-12d3-a456-426614174001',
          metadata: {},
          ip_address: null,
          user_agent: null,
          created_at: '2023-01-01T00:00:00Z'
        }
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAuditLogRows, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const auditLogs = await client.getAuditLogs({
        userId: '123e4567-e89b-12d3-a456-426614174001',
        limit: 10
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('audit_logs')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', '123e4567-e89b-12d3-a456-426614174001')
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].action).toBe('user.created')
    })
  })

  describe('Update Operations', () => {
    it('should handle user updates with partial data', async () => {
      const updateData = {
        firstName: 'Jane',
        preferences: { theme: 'light' }
      }

      const mockUpdatedUserRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        clerk_user_id: 'user_123',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        avatar_url: null,
        preferences: { theme: 'light' },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedUserRow, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const user = await client.updateUser('123e4567-e89b-12d3-a456-426614174000', updateData)

      expect(mockQuery.update).toHaveBeenCalledWith({
        first_name: 'Jane',
        preferences: { theme: 'light' }
      })
      expect(user.firstName).toBe('Jane')
      expect(user.preferences).toEqual({ theme: 'light' })
    })

    it('should handle membership updates', async () => {
      const updateData = {
        status: 'inactive' as const,
        roleId: '123e4567-e89b-12d3-a456-426614174004'
      }

      const mockUpdatedMembershipRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        organization_id: '123e4567-e89b-12d3-a456-426614174002',
        role_id: '123e4567-e89b-12d3-a456-426614174004',
        status: 'inactive',
        joined_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedMembershipRow, error: null })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const membership = await client.updateMembership(
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002',
        updateData
      )

      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'inactive',
        role_id: '123e4567-e89b-12d3-a456-426614174004'
      })
      expect(membership.status).toBe('inactive')
      expect(membership.roleId).toBe('123e4567-e89b-12d3-a456-426614174004')
    })
  })

  describe('Delete Operations', () => {
    it('should handle membership deletion', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn()
      }
      
      // First eq call returns this, second eq call returns the promise
      mockQuery.eq
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({ error: null })
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      await client.deleteMembership(
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_memberships')
      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', '123e4567-e89b-12d3-a456-426614174001')
      expect(mockQuery.eq).toHaveBeenCalledWith('organization_id', '123e4567-e89b-12d3-a456-426614174002')
    })
  })
})