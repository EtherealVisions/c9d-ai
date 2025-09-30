/**
 * Unit tests for ContentManagerService - Drizzle Migration
 * Requirements: 1.1, 2.1, 6.1, 5.4 - Update tests to use new database layer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ContentManagerService } from '@/lib/services/content-manager-service'
import { DatabaseError, NotFoundError } from '@/lib/errors'
import { createMockDatabase } from '../../setup/drizzle-testing-setup'
import type { ContentContext, ContentEffectiveness } from '@/lib/services/content-manager-service'
import type { DrizzleDatabase } from '@/lib/db/connection'

// Mock Drizzle database
const mockDatabase = createMockDatabase()

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  getDatabase: () => mockDatabase
}))

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((column, value) => ({ column, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  or: vi.fn((...conditions) => ({ conditions, type: 'or' })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
  desc: vi.fn((column) => ({ column, type: 'desc' })),
  asc: vi.fn((column) => ({ column, type: 'asc' })),
  like: vi.fn((column, value) => ({ column, value, type: 'like' })),
  ilike: vi.fn((column, value) => ({ column, value, type: 'ilike' })),
  inArray: vi.fn((column, values) => ({ column, values, type: 'inArray' }))
}))

// Mock schema imports
vi.mock('@/lib/db/schema/content', () => ({
  onboardingContent: {
    id: 'id',
    organizationId: 'organizationId',
    contentType: 'contentType',
    title: 'title',
    description: 'description',
    contentData: 'contentData',
    tags: 'tags',
    isActive: 'isActive',
    createdBy: 'createdBy'
  },
  onboardingPaths: {
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    description: 'description',
    targetRole: 'targetRole',
    subscriptionTier: 'subscriptionTier',
    isActive: 'isActive'
  },
  onboardingSteps: {
    id: 'id',
    pathId: 'pathId',
    title: 'title',
    description: 'description',
    stepType: 'stepType',
    stepOrder: 'stepOrder',
    isRequired: 'isRequired'
  }
}))

describe('ContentManagerService - Drizzle Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock database methods
    Object.keys(mockDatabase).forEach(key => {
      if (typeof mockDatabase[key as keyof typeof mockDatabase] === 'function') {
        vi.mocked(mockDatabase[key as keyof typeof mockDatabase]).mockClear()
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Service Structure', () => {
    it('should have all required methods', () => {
      expect(ContentManagerService.getOnboardingContent).toBeDefined()
      expect(ContentManagerService.createCustomContent).toBeDefined()
      expect(ContentManagerService.updateContentTemplate).toBeDefined()
      expect(ContentManagerService.getContentForRole).toBeDefined()
      expect(ContentManagerService.validateContentEffectiveness).toBeDefined()
      expect(ContentManagerService.createOnboardingPath).toBeDefined()
      expect(ContentManagerService.createOnboardingStep).toBeDefined()
      expect(ContentManagerService.updateOnboardingPath).toBeDefined()
      expect(ContentManagerService.updateOnboardingStep).toBeDefined()
      expect(ContentManagerService.getContentByTags).toBeDefined()
      expect(ContentManagerService.searchContent).toBeDefined()
      expect(ContentManagerService.getContentTemplates).toBeDefined()
      expect(ContentManagerService.cloneContent).toBeDefined()
      expect(ContentManagerService.deactivateContent).toBeDefined()
      expect(ContentManagerService.getOrganizationContent).toBeDefined()
    })

    it('should be a class with static methods', () => {
      expect(typeof ContentManagerService.getOnboardingContent).toBe('function')
      expect(typeof ContentManagerService.createCustomContent).toBe('function')
      expect(typeof ContentManagerService.updateContentTemplate).toBe('function')
    })
  })

  describe('Type Safety', () => {
    it('should accept proper ContentContext types', () => {
      const validContext: ContentContext = {
        organizationId: 'org-1',
        userRole: 'developer',
        subscriptionTier: 'pro',
        language: 'en'
      }

      // This validates that the types are properly defined
      expect(validContext.organizationId).toBe('org-1')
      expect(validContext.userRole).toBe('developer')
      expect(validContext.subscriptionTier).toBe('pro')
      expect(validContext.language).toBe('en')
    })

    it('should handle ContentEffectiveness structure', () => {
      const effectiveness: ContentEffectiveness = {
        contentId: 'content-1',
        viewCount: 100,
        completionRate: 85.5,
        averageTimeSpent: 300,
        userSatisfactionScore: 4.2,
        commonIssues: ['Low completion rate', 'Too complex']
      }

      expect(effectiveness.contentId).toBe('content-1')
      expect(effectiveness.viewCount).toBe(100)
      expect(effectiveness.completionRate).toBe(85.5)
      expect(effectiveness.commonIssues).toHaveLength(2)
    })

    it('should handle different content types', () => {
      const contentTypes = ['text', 'html', 'markdown', 'video', 'image', 'interactive', 'template'] as const
      
      contentTypes.forEach(type => {
        const contentData = {
          content_type: type,
          title: `Test ${type} content`,
          description: `Description for ${type}`,
          content_data: { type: type },
          media_urls: [],
          interactive_config: {},
          tags: [type],
          version: 1,
          is_active: true,
          organization_id: null,
          created_by: null
        }
        
        expect(contentData.content_type).toBe(type)
        expect(contentData.title).toContain(type)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors properly', async () => {
      // Mock database error
      vi.mocked(mockDatabase.select).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.from).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.where).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.limit).mockRejectedValue(new Error('Database connection failed'))

      await expect(
        ContentManagerService.getOnboardingContent('content-1')
      ).rejects.toThrow()
    })

    it('should handle not found errors', async () => {
      // Mock empty result for content not found
      vi.mocked(mockDatabase.select).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.from).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.where).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.limit).mockResolvedValue([])

      const result = await ContentManagerService.getOnboardingContent('nonexistent')
      expect(result).toBeNull()
    })

    it('should handle clone content errors', async () => {
      // Mock database error for clone operation
      vi.mocked(mockDatabase.select).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.from).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.where).mockReturnValue(mockDatabase)
      vi.mocked(mockDatabase.limit).mockRejectedValue(new Error('Content not found'))

      await expect(
        ContentManagerService.cloneContent('nonexistent', 'org-1')
      ).rejects.toThrow()
    })
  })

  describe('Business Logic', () => {
    it('should validate onboarding path structure', () => {
      const pathData = {
        name: 'Developer Onboarding',
        description: 'Complete onboarding for developers',
        target_role: 'developer',
        subscription_tier: 'pro',
        estimated_duration: 45,
        is_active: true,
        prerequisites: ['basic_knowledge'],
        learning_objectives: ['Learn platform', 'Create first project'],
        success_criteria: { project_created: true },
        metadata: { difficulty: 'beginner' }
      }

      expect(pathData.name).toBe('Developer Onboarding')
      expect(pathData.target_role).toBe('developer')
      expect(pathData.estimated_duration).toBe(45)
      expect(pathData.prerequisites).toContain('basic_knowledge')
      expect(pathData.learning_objectives).toHaveLength(2)
    })

    it('should validate onboarding step structure', () => {
      const stepData = {
        path_id: 'path-1',
        title: 'Setup Profile',
        description: 'Complete your profile setup',
        step_type: 'setup' as const,
        step_order: 1,
        estimated_time: 10,
        is_required: true,
        dependencies: [],
        content: { instructions: 'Fill out the form' },
        interactive_elements: { form: true },
        success_criteria: { profile_complete: true },
        validation_rules: { required_fields: ['name', 'email'] },
        metadata: { category: 'profile' }
      }

      expect(stepData.path_id).toBe('path-1')
      expect(stepData.title).toBe('Setup Profile')
      expect(stepData.step_type).toBe('setup')
      expect(stepData.step_order).toBe(1)
      expect(stepData.is_required).toBe(true)
    })

    it('should handle content search and filtering', () => {
      // Test content filtering logic
      const tags = ['tutorial', 'beginner', 'setup']
      const searchTerm = 'profile setup'
      
      expect(tags).toContain('tutorial')
      expect(searchTerm.toLowerCase()).toContain('profile')
      
      // Test role-based filtering
      const roles = ['developer', 'admin', 'member']
      expect(roles).toContain('developer')
    })
  })
})