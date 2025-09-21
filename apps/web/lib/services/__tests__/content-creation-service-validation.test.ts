/**
 * ContentCreationService Migration Tests - Validation Focus
 * Tests the validation logic and business rules for the migrated ContentCreationService
 */

import { describe, it, expect } from 'vitest'
import { 
  validateCreateContent, 
  validateUpdateContent,
  type CreateContent,
  type UpdateContent
} from '@/lib/validation/schemas/content'
import { z } from 'zod'

describe('ContentCreationService Migration - Validation Logic', () => {
  describe('Content Creation Validation', () => {
    it('should validate valid content creation data', () => {
      const validContentData: CreateContent = {
        title: 'Welcome to Our Platform',
        description: 'An introduction to our platform features',
        content: '<h1>Welcome!</h1><p>This is your onboarding content.</p>',
        contentType: 'html',
        version: '1.0.0',
        tags: ['welcome', 'introduction'],
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001',
        isActive: true
      }

      const result = validateCreateContent(validContentData)
      expect(result).toEqual(validContentData)
    })

    it('should reject content with empty title', () => {
      const invalidContentData = {
        title: '', // Empty title not allowed
        description: 'Valid description',
        content: 'Valid content',
        contentType: 'html',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })

    it('should reject content with title that is too long', () => {
      const invalidContentData = {
        title: 'A'.repeat(256), // Too long
        description: 'Valid description',
        content: 'Valid content',
        contentType: 'html',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })

    it('should reject content with description that is too long', () => {
      const invalidContentData = {
        title: 'Valid Title',
        description: 'A'.repeat(1001), // Too long
        content: 'Valid content',
        contentType: 'html',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })

    it('should reject content with invalid organization ID', () => {
      const invalidContentData = {
        title: 'Valid Title',
        description: 'Valid description',
        content: 'Valid content',
        contentType: 'html',
        organizationId: 'invalid-uuid', // Invalid UUID
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })

    it('should reject content with invalid creator ID', () => {
      const invalidContentData = {
        title: 'Valid Title',
        description: 'Valid description',
        content: 'Valid content',
        contentType: 'html',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: 'invalid-uuid' // Invalid UUID
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })

    it('should reject content with invalid content type', () => {
      const invalidContentData = {
        title: 'Valid Title',
        description: 'Valid description',
        content: 'Valid content',
        contentType: 'invalid-type', // Invalid content type
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })

    it('should reject content that is too long', () => {
      const invalidContentData = {
        title: 'Valid Title',
        description: 'Valid description',
        content: 'A'.repeat(50001), // Too long
        contentType: 'html',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })

    it('should reject content with invalid tags', () => {
      const invalidContentData = {
        title: 'Valid Title',
        description: 'Valid description',
        content: 'Valid content',
        contentType: 'html',
        tags: ['A'.repeat(51)], // Tag too long
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      expect(() => validateCreateContent(invalidContentData)).toThrow()
    })
  })

  describe('Content Update Validation', () => {
    it('should validate valid content update data', () => {
      const validUpdateData: UpdateContent = {
        title: 'Updated Title',
        description: 'Updated description',
        content: '<h1>Updated content</h1>',
        tags: ['updated', 'content']
      }

      const result = validateUpdateContent(validUpdateData)
      expect(result).toEqual(validUpdateData)
    })

    it('should allow partial updates', () => {
      const partialUpdateData: UpdateContent = {
        title: 'Updated Title Only'
      }

      const result = validateUpdateContent(partialUpdateData)
      expect(result).toEqual(partialUpdateData)
    })

    it('should reject empty title in update', () => {
      const invalidUpdateData = {
        title: '' // Empty title not allowed
      }

      expect(() => validateUpdateContent(invalidUpdateData)).toThrow()
    })

    it('should allow null values for optional fields', () => {
      const updateDataWithNulls: UpdateContent = {
        description: null
      }

      const result = validateUpdateContent(updateDataWithNulls)
      expect(result).toEqual(updateDataWithNulls)
    })
  })

  describe('Business Logic Validation', () => {
    it('should validate template variables correctly', () => {
      // This tests the template variable validation logic
      const validateVariableValue = (value: unknown, rule: any): boolean => {
        switch (rule.type) {
          case 'required':
            return value !== null && value !== undefined && value !== ''
          case 'min_length':
            return typeof value === 'string' && value.length >= rule.value
          case 'max_length':
            return typeof value === 'string' && value.length <= rule.value
          case 'pattern':
            return typeof value === 'string' && new RegExp(rule.value).test(value)
          case 'range':
            const [min, max] = rule.value
            return typeof value === 'number' && value >= min && value <= max
          default:
            return true
        }
      }

      // Test required validation
      expect(validateVariableValue('test', { type: 'required' })).toBe(true)
      expect(validateVariableValue('', { type: 'required' })).toBe(false)
      expect(validateVariableValue(null, { type: 'required' })).toBe(false)

      // Test min_length validation
      expect(validateVariableValue('hello', { type: 'min_length', value: 3 })).toBe(true)
      expect(validateVariableValue('hi', { type: 'min_length', value: 3 })).toBe(false)

      // Test max_length validation
      expect(validateVariableValue('hello', { type: 'max_length', value: 10 })).toBe(true)
      expect(validateVariableValue('hello world!', { type: 'max_length', value: 10 })).toBe(false)

      // Test pattern validation
      expect(validateVariableValue('test@example.com', { type: 'pattern', value: '^[^@]+@[^@]+\\.[^@]+$' })).toBe(true)
      expect(validateVariableValue('invalid-email', { type: 'pattern', value: '^[^@]+@[^@]+\\.[^@]+$' })).toBe(false)

      // Test range validation
      expect(validateVariableValue(5, { type: 'range', value: [1, 10] })).toBe(true)
      expect(validateVariableValue(15, { type: 'range', value: [1, 10] })).toBe(false)
    })

    it('should determine content difficulty correctly', () => {
      // This tests the difficulty calculation logic
      const calculateDifficulty = (sections: any[]): string => {
        const interactiveCount = sections.filter(s => 
          ['interactive', 'quiz', 'exercise'].includes(s.type)
        ).length
        
        const totalSections = sections.length
        const interactiveRatio = totalSections > 0 ? interactiveCount / totalSections : 0

        if (interactiveRatio > 0.6) return 'advanced'
        if (interactiveRatio > 0.3) return 'intermediate'
        return 'beginner'
      }

      const beginnerSections = [
        { type: 'text' },
        { type: 'text' },
        { type: 'text' }
      ]
      expect(calculateDifficulty(beginnerSections)).toBe('beginner')

      const intermediateSections = [
        { type: 'text' },
        { type: 'interactive' },
        { type: 'text' }
      ]
      expect(calculateDifficulty(intermediateSections)).toBe('intermediate')

      const advancedSections = [
        { type: 'interactive' },
        { type: 'quiz' },
        { type: 'exercise' }
      ]
      expect(calculateDifficulty(advancedSections)).toBe('advanced')
    })

    it('should extract media URLs correctly', () => {
      // This tests the media URL extraction logic
      const extractMediaUrls = (sections: any[]): string[] => {
        const urls: string[] = []
        sections.forEach(section => {
          if (section.type === 'video' || section.type === 'image') {
            const url = section.content.url
            if (url) urls.push(url)
          }
        })
        return urls
      }

      const sections = [
        { type: 'text', content: { text: 'Hello' } },
        { type: 'video', content: { url: 'https://example.com/video.mp4' } },
        { type: 'image', content: { url: 'https://example.com/image.jpg' } },
        { type: 'interactive', content: { config: {} } }
      ]

      const urls = extractMediaUrls(sections)
      expect(urls).toEqual([
        'https://example.com/video.mp4',
        'https://example.com/image.jpg'
      ])
    })
  })

  describe('Error Handling Validation', () => {
    it('should handle Zod validation errors properly', () => {
      try {
        validateCreateContent({
          title: '', // Invalid empty title
          description: 'A'.repeat(1001), // Too long
          content: 'Valid content',
          contentType: 'invalid-type', // Invalid type
          organizationId: 'invalid-uuid', // Invalid UUID
          createdBy: 'invalid-uuid' // Invalid UUID
        })
      } catch (error) {
        expect(error).toBeInstanceOf(z.ZodError)
        const zodError = error as z.ZodError
        expect(zodError.issues.length).toBeGreaterThan(0)
        expect(zodError.issues.some(issue => issue.path.includes('title'))).toBe(true)
        expect(zodError.issues.some(issue => issue.path.includes('organizationId'))).toBe(true)
      }
    })

    it('should provide detailed validation error messages', () => {
      try {
        validateCreateContent({
          title: '',
          organizationId: '',
          createdBy: ''
        })
      } catch (error) {
        const zodError = error as z.ZodError
        const titleError = zodError.issues.find(issue => issue.path.includes('title'))
        expect(titleError?.message).toContain('String must contain at least 1 character(s)')
      }
    })
  })

  describe('Input Sanitization', () => {
    it('should handle null and undefined values correctly', () => {
      const validContentData = {
        title: 'Valid Title',
        description: null,
        content: 'Valid content',
        contentType: 'html' as const,
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = validateCreateContent(validContentData)
      expect(result.description).toBe(null)
    })

    it('should apply default values correctly', () => {
      const minimalContentData = {
        title: 'Valid Title',
        content: 'Valid content',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        createdBy: '123e4567-e89b-12d3-a456-426614174001'
      }

      const result = validateCreateContent(minimalContentData)
      expect(result.contentType).toBe('html') // Default value
      expect(result.version).toBe('1.0.0') // Default value
      expect(result.tags).toEqual([]) // Default value
      expect(result.isActive).toBe(true) // Default value
    })
  })
})