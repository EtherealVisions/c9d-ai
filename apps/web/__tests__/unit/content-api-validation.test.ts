/**
 * Unit Tests for Content API Validation
 * 
 * Tests the Zod validation schemas used in migrated content API routes.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  createOnboardingContentSchema,
  updateOnboardingContentSchema,
  onboardingPathApiResponseSchema,
  createOnboardingStepSchema,
  createOnboardingSessionSchema,
  validateCreateContent,
  validateUpdateContent,
  safeValidateCreateContent,
  safeValidateUpdateContent
} from '@/lib/validation/schemas/content'

describe('Content API Validation Schemas', () => {
  describe('createOnboardingContentSchema', () => {
    it('should validate correct content creation data', () => {
      const validData = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Welcome to Our Team',
        content: '<h1>Welcome!</h1><p>This is your onboarding content.</p>',
        contentType: 'html' as const,
        description: 'Introduction content for new team members',
        version: '1.0.0',
        tags: ['onboarding', 'welcome', 'introduction'],
        createdBy: '123e4567-e89b-12d3-a456-426614174001',
        isActive: true
      }

      const result = createOnboardingContentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.title).toBe('Welcome to Our Team')
        expect(result.data.contentType).toBe('html')
        expect(result.data.tags).toEqual(['onboarding', 'welcome', 'introduction'])
      }
    })

    it('should reject invalid organization ID', () => {
      const invalidData = {
        organizationId: 'invalid-uuid',
        title: 'Test Content',
        content: 'Test content body',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = createOnboardingContentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['organizationId'])
        expect(result.error.errors[0].message).toContain('Invalid uuid')
      }
    })

    it('should reject empty title', () => {
      const invalidData = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        title: '',
        content: 'Test content body',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = createOnboardingContentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['title'])
        expect(result.error.errors[0].message).toContain('String must contain at least 1 character')
      }
    })

    it('should reject content that is too long', () => {
      const invalidData = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Content',
        content: 'x'.repeat(50001), // Exceeds 50000 character limit
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = createOnboardingContentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['content'])
        expect(result.error.errors[0].message).toContain('String must contain at most 50000 character')
      }
    })

    it('should reject invalid content type', () => {
      const invalidData = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Content',
        content: 'Test content body',
        contentType: 'invalid-type',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = createOnboardingContentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should apply default values', () => {
      const minimalData = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Content',
        content: 'Test content body',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = createOnboardingContentSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.contentType).toBe('html')
        expect(result.data.version).toBe('1.0.0')
        expect(result.data.tags).toEqual([])
        expect(result.data.isActive).toBe(true)
      }
    })
  })

  describe('updateOnboardingContentSchema', () => {
    it('should validate partial content update data', () => {
      const validData = {
        title: 'Updated Content Title',
        description: 'Updated description',
        isActive: false
      }

      const result = updateOnboardingContentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.title).toBe('Updated Content Title')
        expect(result.data.isActive).toBe(false)
        expect(result.data.content).toBeUndefined()
      }
    })

    it('should allow empty updates', () => {
      const result = updateOnboardingContentSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject invalid partial data', () => {
      const invalidData = {
        title: '', // Empty string not allowed
        contentType: 'invalid-type'
      }

      const result = updateOnboardingContentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('onboardingPathApiResponseSchema', () => {
    it('should validate complete API response data', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Developer Onboarding Path',
        description: 'Complete onboarding path for new developers',
        targetRole: 'developer',
        subscriptionTier: 'pro',
        estimatedDuration: 120,
        difficulty: 'intermediate',
        prerequisites: ['basic-programming', 'git-basics'],
        successCriteria: { 
          completionRate: 80,
          timeLimit: 180
        },
        metadata: { 
          category: 'technical',
          department: 'engineering'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        stepCount: 10,
        completionRate: 85.5,
        averageCompletionTime: 95
      }

      const result = onboardingPathApiResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.stepCount).toBe(10)
        expect(result.data.completionRate).toBe(85.5)
        expect(result.data.prerequisites).toEqual(['basic-programming', 'git-basics'])
      }
    })

    it('should handle null values correctly', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Basic Onboarding',
        description: null,
        targetRole: 'general',
        subscriptionTier: null,
        estimatedDuration: null,
        difficulty: 'beginner',
        prerequisites: [],
        successCriteria: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        stepCount: 0,
        completionRate: 0,
        averageCompletionTime: null
      }

      const result = onboardingPathApiResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.description).toBeNull()
        expect(result.data.subscriptionTier).toBeNull()
        expect(result.data.averageCompletionTime).toBeNull()
      }
    })
  })

  describe('createOnboardingStepSchema', () => {
    it('should validate step creation data', () => {
      const validData = {
        pathId: '123e4567-e89b-12d3-a456-426614174000',
        stepOrder: 1,
        title: 'Introduction Step',
        content: 'Welcome to your first step!',
        stepType: 'text' as const,
        isRequired: true,
        estimatedTime: 15,
        resources: [
          {
            type: 'link' as const,
            url: 'https://example.com/guide',
            title: 'Getting Started Guide',
            description: 'Comprehensive guide for beginners'
          }
        ]
      }

      const result = createOnboardingStepSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.stepOrder).toBe(1)
        expect(result.data.stepType).toBe('text')
        expect(result.data.resources).toHaveLength(1)
      }
    })

    it('should apply default values for step', () => {
      const minimalData = {
        pathId: '123e4567-e89b-12d3-a456-426614174000',
        stepOrder: 0,
        title: 'Minimal Step',
        content: 'Basic step content'
      }

      const result = createOnboardingStepSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.stepType).toBe('text')
        expect(result.data.isRequired).toBe(true)
        expect(result.data.resources).toEqual([])
        expect(result.data.metadata).toEqual({})
      }
    })

    it('should validate resource URLs', () => {
      const invalidData = {
        pathId: '123e4567-e89b-12d3-a456-426614174000',
        stepOrder: 1,
        title: 'Step with Invalid Resource',
        content: 'Step content',
        resources: [
          {
            type: 'link' as const,
            url: 'not-a-valid-url',
            title: 'Invalid Resource'
          }
        ]
      }

      const result = createOnboardingStepSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const urlError = result.error.errors.find(e => 
          e.path.includes('resources') && e.path.includes('url')
        )
        expect(urlError).toBeDefined()
      }
    })
  })

  describe('createOnboardingSessionSchema', () => {
    it('should validate session creation data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        pathId: '123e4567-e89b-12d3-a456-426614174002',
        sessionType: 'onboarding' as const,
        status: 'in_progress' as const,
        currentStepId: '123e4567-e89b-12d3-a456-426614174003',
        startedAt: new Date(),
        timeSpent: 300,
        progress: 25.5,
        preferences: {
          theme: 'dark',
          notifications: true
        }
      }

      const result = createOnboardingSessionSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.sessionType).toBe('onboarding')
        expect(result.data.status).toBe('in_progress')
        expect(result.data.progress).toBe(25.5)
      }
    })

    it('should apply default values for session', () => {
      const minimalData = {
        userId: '123e4567-e89b-12d3-a456-426614174000'
      }

      const result = createOnboardingSessionSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.status).toBe('not_started')
        expect(result.data.sessionType).toBe('onboarding')
        expect(result.data.timeSpent).toBe(0)
        expect(result.data.progress).toBe(0)
        expect(result.data.preferences).toEqual({})
      }
    })

    it('should validate progress range', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        progress: 150 // Invalid: exceeds 100
      }

      const result = createOnboardingSessionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const progressError = result.error.errors.find(e => e.path.includes('progress'))
        expect(progressError?.message).toContain('Number must be less than or equal to 100')
      }
    })
  })

  describe('Validation Helper Functions', () => {
    describe('validateCreateContent', () => {
      it('should validate and return parsed data', () => {
        const validData = {
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Content',
          content: 'Test content body',
          createdBy: '123e4567-e89b-12d3-a456-426614174001'
        }

        const result = validateCreateContent(validData)
        expect(result.title).toBe('Test Content')
        expect(result.organizationId).toBe('123e4567-e89b-12d3-a456-426614174000')
      })

      it('should throw on invalid data', () => {
        const invalidData = {
          organizationId: 'invalid-uuid',
          title: '',
          content: 'Test content'
        }

        expect(() => validateCreateContent(invalidData)).toThrow()
      })
    })

    describe('validateUpdateContent', () => {
      it('should validate partial update data', () => {
        const validData = {
          title: 'Updated Title'
        }

        const result = validateUpdateContent(validData)
        expect(result.title).toBe('Updated Title')
      })

      it('should throw on invalid data', () => {
        const invalidData = {
          title: ''
        }

        expect(() => validateUpdateContent(invalidData)).toThrow()
      })
    })

    describe('Safe validation functions', () => {
      it('should return success result for valid data', () => {
        const validData = {
          organizationId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Content',
          content: 'Test content body',
          createdBy: '123e4567-e89b-12d3-a456-426614174001'
        }

        const result = safeValidateCreateContent(validData)
        expect(result.success).toBe(true)
        
        if (result.success) {
          expect(result.data.title).toBe('Test Content')
        }
      })

      it('should return error result for invalid data', () => {
        const invalidData = {
          organizationId: 'invalid-uuid'
        }

        const result = safeValidateCreateContent(invalidData)
        expect(result.success).toBe(false)
        
        if (!result.success) {
          expect(result.error.errors.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should handle content with all optional fields', () => {
      const completeContentData = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Complete Content Example',
        content: '<div><h1>Complete Content</h1><p>This is a complete example with all fields.</p></div>',
        contentType: 'html' as const,
        description: 'A comprehensive content example with all possible fields',
        version: '2.1.0',
        tags: ['comprehensive', 'example', 'complete', 'onboarding'],
        createdBy: '123e4567-e89b-12d3-a456-426614174001',
        isActive: true
      }

      const result = createOnboardingContentSchema.safeParse(completeContentData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.tags).toHaveLength(4)
        expect(result.data.version).toBe('2.1.0')
        expect(result.data.contentType).toBe('html')
      }
    })

    it('should handle markdown content with special characters', () => {
      const markdownContent = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Markdown Content with Special Characters',
        content: '# Welcome!\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2\n\n```javascript\nconsole.log("Hello, world!");\n```',
        contentType: 'markdown' as const,
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = createOnboardingContentSchema.safeParse(markdownContent)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.contentType).toBe('markdown')
        expect(result.data.content).toContain('```javascript')
      }
    })
  })

  describe('Error Message Quality', () => {
    it('should provide clear error messages for validation failures', () => {
      const invalidData = {
        organizationId: 'invalid-uuid',
        title: '',
        content: 'x'.repeat(50001),
        contentType: 'invalid-type',
        createdBy: 'also-invalid-uuid'
      }

      const result = createOnboardingContentSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const errors = result.error.errors
        expect(errors.length).toBeGreaterThan(0)
        
        // Each error should have a clear path and message
        errors.forEach(error => {
          expect(error.path).toBeDefined()
          expect(error.message).toBeDefined()
          expect(error.message.length).toBeGreaterThan(0)
        })
      }
    })
  })
})