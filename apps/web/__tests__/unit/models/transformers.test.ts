import { describe, it, expect } from 'vitest'
import { 
  transformOrganizationRow, 
  transformOrganizationToRow,
  transformUserRow,
  transformUserToRow,
  transformRows,
  transformRowSafe
} from '@/lib/models/transformers'
import type { OrganizationRow, UserRow } from '@/lib/models/types'

describe('Organization Transformers', () => {
  describe('transformOrganizationRow', () => {
    it('should transform organization row to model correctly', () => {
      const row: OrganizationRow = {
        id: '1',
        name: 'Test Organization',
        slug: 'test-org',
        description: 'A test organization',
        avatar_url: 'https://example.com/avatar.jpg',
        metadata: { key: 'value' },
        settings: { theme: 'dark' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const org = transformOrganizationRow(row)

      expect(org.id).toBe('1')
      expect(org.name).toBe('Test Organization')
      expect(org.slug).toBe('test-org')
      expect(org.description).toBe('A test organization')
      expect(org.avatarUrl).toBe('https://example.com/avatar.jpg')
      expect(org.metadata).toEqual({ key: 'value' })
      expect(org.settings).toEqual({ theme: 'dark' })
      expect(org.createdAt).toBeInstanceOf(Date)
      expect(org.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle null values correctly', () => {
      const row: OrganizationRow = {
        id: '1',
        name: 'Test Organization',
        slug: 'test-org',
        description: null,
        avatar_url: null,
        metadata: {},
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const org = transformOrganizationRow(row)

      expect(org.description).toBeUndefined()
      expect(org.avatarUrl).toBeUndefined()
    })
  })

  describe('transformOrganizationToRow', () => {
    it('should transform organization model to row correctly', () => {
      const org = {
        name: 'Test Organization',
        slug: 'test-org',
        description: 'A test organization',
        avatarUrl: 'https://example.com/avatar.jpg',
        metadata: { key: 'value' },
        settings: { theme: 'dark' }
      }

      const row = transformOrganizationToRow(org)

      expect(row.name).toBe('Test Organization')
      expect(row.slug).toBe('test-org')
      expect(row.description).toBe('A test organization')
      expect(row.avatar_url).toBe('https://example.com/avatar.jpg')
      expect(row.metadata).toEqual({ key: 'value' })
      expect(row.settings).toEqual({ theme: 'dark' })
    })

    it('should handle undefined values with nullish coalescing correctly', () => {
      const org = {
        name: 'Test Organization',
        slug: 'test-org',
        description: undefined,
        avatarUrl: undefined,
        metadata: {},
        settings: {}
      }

      const row = transformOrganizationToRow(org)

      expect(row.description).toBeNull()
      expect(row.avatar_url).toBeNull()
    })

    it('should preserve empty strings (not convert to null)', () => {
      const org = {
        name: 'Test Organization',
        slug: 'test-org',
        description: '', // Empty string should be preserved
        avatarUrl: '', // Empty string should be preserved
        metadata: {},
        settings: {}
      }

      const row = transformOrganizationToRow(org)

      // With nullish coalescing (??), empty strings are preserved
      expect(row.description).toBe('')
      expect(row.avatar_url).toBe('')
    })

    it('should handle null values correctly', () => {
      const org = {
        name: 'Test Organization',
        slug: 'test-org',
        description: null as any, // Explicitly null
        avatarUrl: null as any, // Explicitly null
        metadata: {},
        settings: {}
      }

      const row = transformOrganizationToRow(org)

      expect(row.description).toBeNull()
      expect(row.avatar_url).toBeNull()
    })
  })
})

describe('User Transformers', () => {
  describe('transformUserRow', () => {
    it('should transform user row to model correctly', () => {
      const row: UserRow = {
        id: '1',
        clerk_user_id: 'clerk_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        preferences: { theme: 'dark' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const user = transformUserRow(row)

      expect(user.id).toBe('1')
      expect(user.clerkUserId).toBe('clerk_123')
      expect(user.email).toBe('test@example.com')
      expect(user.firstName).toBe('John')
      expect(user.lastName).toBe('Doe')
      expect(user.avatarUrl).toBe('https://example.com/avatar.jpg')
      expect(user.preferences).toEqual({ theme: 'dark' })
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle null values correctly', () => {
      const row: UserRow = {
        id: '1',
        clerk_user_id: 'clerk_123',
        email: 'test@example.com',
        first_name: null,
        last_name: null,
        avatar_url: null,
        preferences: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const user = transformUserRow(row)

      expect(user.firstName).toBeUndefined()
      expect(user.lastName).toBeUndefined()
      expect(user.avatarUrl).toBeUndefined()
    })
  })

  describe('transformUserToRow', () => {
    it('should transform user model to row correctly', () => {
      const user = {
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: { theme: 'dark' }
      }

      const row = transformUserToRow(user)

      expect(row.clerk_user_id).toBe('clerk_123')
      expect(row.email).toBe('test@example.com')
      expect(row.first_name).toBe('John')
      expect(row.last_name).toBe('Doe')
      expect(row.avatar_url).toBe('https://example.com/avatar.jpg')
      expect(row.preferences).toEqual({ theme: 'dark' })
    })

    it('should handle undefined values with nullish coalescing correctly', () => {
      const user = {
        clerkUserId: 'clerk_123',
        email: 'test@example.com',
        firstName: undefined,
        lastName: undefined,
        avatarUrl: undefined,
        preferences: {}
      }

      const row = transformUserToRow(user)

      expect(row.first_name).toBeNull()
      expect(row.last_name).toBeNull()
      expect(row.avatar_url).toBeNull()
    })
  })
})

describe('Utility Functions', () => {
  describe('transformRows', () => {
    it('should transform array of rows correctly', () => {
      const rows: UserRow[] = [
        {
          id: '1',
          clerk_user_id: 'clerk_123',
          email: 'test1@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: null,
          preferences: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          clerk_user_id: 'clerk_456',
          email: 'test2@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          avatar_url: null,
          preferences: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      const users = transformRows(rows, transformUserRow)

      expect(users).toHaveLength(2)
      expect(users[0].email).toBe('test1@example.com')
      expect(users[1].email).toBe('test2@example.com')
    })

    it('should handle empty array', () => {
      const users = transformRows([], transformUserRow)
      expect(users).toHaveLength(0)
    })
  })

  describe('transformRowSafe', () => {
    it('should transform non-null row correctly', () => {
      const row: UserRow = {
        id: '1',
        clerk_user_id: 'clerk_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: null,
        preferences: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const user = transformRowSafe(row, transformUserRow)

      expect(user).not.toBeNull()
      expect(user?.email).toBe('test@example.com')
    })

    it('should handle null row correctly', () => {
      const user = transformRowSafe(null, transformUserRow)
      expect(user).toBeNull()
    })
  })
})

describe('Nullish Coalescing Behavior', () => {
  it('should demonstrate the difference between || and ?? operators', () => {
    // Test data with various falsy values
    const testCases = [
      { value: undefined, expected: null },
      { value: null, expected: null },
      { value: '', expected: '' }, // Empty string should be preserved
      { value: 0, expected: 0 }, // Zero should be preserved
      { value: false, expected: false }, // False should be preserved
      { value: 'valid', expected: 'valid' }
    ]

    testCases.forEach(({ value, expected }) => {
      // Using nullish coalescing (??) - only null/undefined become null
      const resultNullish = value ?? null
      expect(resultNullish).toBe(expected)

      // Using logical OR (||) - all falsy values become null
      const resultLogicalOr = value || null
      if (value === '' || value === 0 || value === false) {
        // These would incorrectly become null with ||
        expect(resultLogicalOr).toBe(null)
        // But with ??, they are preserved
        expect(resultNullish).toBe(value)
      }
    })
  })

  it('should preserve empty strings in organization transformation', () => {
    const org = {
      name: 'Test Organization',
      slug: 'test-org',
      description: '', // Empty string
      avatarUrl: '', // Empty string
      metadata: {},
      settings: {}
    }

    const row = transformOrganizationToRow(org)

    // Empty strings should be preserved, not converted to null
    expect(row.description).toBe('')
    expect(row.avatar_url).toBe('')
  })
})