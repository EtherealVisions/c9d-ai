/**
 * Unit tests for Content Creation Service
 * Requirements: 7.3, 7.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ContentCreationService } from '../content-creation-service'
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'

// Mock Supabase client
const createMockSupabaseClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }))
})

const mockSupabaseClient = createMockSupabaseClient()

vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => mockSupabaseClient
}))

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123')
  }
})

describe('ContentCreationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getContentTemplates', () => {
    it('should return available content templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Welcome Message Template',
          description: 'Template for creating welcome messages',
          type: 'welcome_message',
          template: {
            title: 'Welcome to {{organizationName}}',
            content: 'Hello {{userName}}, welcome to our team!'
          },
          variables: [
            {
              name: 'organizationName',
              type: 'text',
              label: 'Organization Name',
              description: 'Name of the organization',
              required: true
            },
            {
              name: 'userName',
              type: 'text',
              label: 'User Name',
              description: 'Name of the user',
              required: true
            }
          ],
          category: 'messaging',
          tags: ['welcome', 'onboarding'],
          is_public: true,
          organization_id: null
        },
        {
          id: 'template-2',
          name: 'Custom Step Template',
          description: 'Template for creating custom onboarding steps',
          type: 'step',
          template: {
            title: '{{stepTitle}}',
            content: {
              text: '{{stepContent}}',
              estimatedTime: '{{estimatedTime}}'
            }
          },
          variables: [
            {
              name: 'stepTitle',
              type: 'text',
              label: 'Step Title',
              description: 'Title of the onboarding step',
              required: true
            }
          ],
          category: 'steps',
          tags: ['custom', 'step'],
          is_public: true,
          organization_id: null
        }
      ]

      mockSupabaseClient.from().select().eq().or().order.mockResolvedValueOnce({
        data: mockTemplates,
        error: null
      })

      const result = await ContentCreationService.getContentTemplates('org-123', 'messaging')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Welcome Message Template')
      expect(result[0].variables).toHaveLength(2)
      expect(result[1].type).toBe('step')
    })

    it('should return empty array when no templates found', async () => {
      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await ContentCreationService.getContentTemplates()

      expect(result).toHaveLength(0)
    })
  })

  describe('createContentFromTemplate', () => {
    it('should create content from template successfully', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Welcome Message Template',
        description: 'Template for creating welcome messages',
        type: 'welcome_message' as const,
        template: {
          title: 'Welcome to {{organizationName}}',
          description: 'Welcome message for new employees',
          content: {
            text: 'Hello {{userName}}, welcome to {{organizationName}}!'
          },
          mediaUrls: [],
          interactiveConfig: {},
          tags: ['welcome']
        },
        variables: [
          {
            name: 'organizationName',
            type: 'text' as const,
            label: 'Organization Name',
            description: 'Name of the organization',
            required: true
          },
          {
            name: 'userName',
            type: 'text' as const,
            label: 'User Name',
            description: 'Name of the user',
            required: true
          }
        ],
        category: 'messaging',
        tags: ['welcome', 'onboarding'],
        isPublic: true
      }

      const variables = {
        organizationName: 'Acme Corp',
        userName: 'John Doe'
      }

      const mockCreatedContent = {
        id: 'content-123',
        content_type: 'template',
        title: 'Welcome to Acme Corp',
        description: 'Welcome message for new employees',
        content_data: {
          text: 'Hello John Doe, welcome to Acme Corp!'
        },
        media_urls: [],
        interactive_config: {},
        tags: ['welcome'],
        version: 1,
        is_active: true,
        organization_id: 'org-123',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // Mock template query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'template-1',
          name: 'Welcome Message Template',
          description: 'Template for creating welcome messages',
          type: 'welcome_message',
          template: mockTemplate.template,
          variables: mockTemplate.variables,
          category: 'messaging',
          tags: ['welcome', 'onboarding'],
          is_public: true,
          organization_id: null
        },
        error: null
      })

      // Mock content creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedContent,
        error: null
      })

      const result = await ContentCreationService.createContentFromTemplate(
        'template-1',
        'org-123',
        variables,
        'user-123'
      )

      expect(result).toBeDefined()
      expect(result.id).toBe('content-123')
      expect(result.title).toBe('Welcome to Acme Corp')
    })

    it('should validate template variables', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test template',
        type: 'step' as const,
        template: {},
        variables: [
          {
            name: 'requiredField',
            type: 'text' as const,
            label: 'Required Field',
            description: 'This field is required',
            required: true
          }
        ],
        category: 'test',
        tags: [],
        isPublic: true
      }

      // Mock template query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'template-1',
          name: 'Test Template',
          description: 'Test template',
          type: 'step',
          template: {},
          variables: mockTemplate.variables,
          category: 'test',
          tags: [],
          is_public: true,
          organization_id: null
        },
        error: null
      })

      // Missing required variable
      const invalidVariables = {}

      await expect(
        ContentCreationService.createContentFromTemplate(
          'template-1',
          'org-123',
          invalidVariables,
          'user-123'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('should throw NotFoundError when template not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      await expect(
        ContentCreationService.createContentFromTemplate(
          'nonexistent-template',
          'org-123',
          {},
          'user-123'
        )
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('createCustomStep', () => {
    it('should create custom step successfully', async () => {
      const stepData = {
        title: 'Custom Development Setup',
        description: 'Setup development environment with custom tools',
        stepType: 'setup' as const,
        content: {
          instructions: [
            'Install Node.js',
            'Setup IDE',
            'Clone repository'
          ],
          resources: [
            'https://nodejs.org',
            'https://code.visualstudio.com'
          ]
        },
        interactiveElements: [
          {
            id: 'element-1',
            type: 'form' as const,
            configuration: {
              fields: [
                { name: 'nodeVersion', type: 'text', label: 'Node.js Version' }
              ]
            },
            validation: [
              {
                type: 'completion' as const,
                criteria: { required: true },
                errorMessage: 'Please enter Node.js version',
                successMessage: 'Version recorded successfully'
              }
            ],
            feedback: {
              immediate: true,
              showCorrectAnswers: false,
              explanations: {},
              encouragementMessages: ['Great job!']
            }
          }
        ],
        estimatedTime: 45,
        isRequired: true,
        dependencies: [],
        validationRules: [
          {
            type: 'completion' as const,
            criteria: { checkInstallation: true },
            errorMessage: 'Installation not verified',
            successMessage: 'Setup completed successfully'
          }
        ]
      }

      const mockCreatedContent = {
        id: 'content-123',
        content_type: 'interactive',
        title: 'Custom Development Setup',
        description: 'Setup development environment with custom tools',
        content_data: stepData.content,
        media_urls: [],
        interactive_config: {
          elements: stepData.interactiveElements,
          validation: stepData.validationRules
        },
        tags: ['custom_step'],
        version: 1,
        is_active: true,
        organization_id: 'org-123',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const mockCreatedStep = {
        id: 'step-123',
        title: stepData.title,
        description: stepData.description,
        step_type: stepData.stepType,
        step_order: 0,
        estimated_time: stepData.estimatedTime,
        is_required: stepData.isRequired,
        dependencies: stepData.dependencies,
        content: { contentId: 'content-123' },
        interactive_elements: { elements: stepData.interactiveElements },
        success_criteria: {},
        validation_rules: { rules: stepData.validationRules },
        metadata: {
          isCustom: true,
          organizationId: 'org-123',
          createdBy: 'user-123',
          contentId: 'content-123'
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // Mock content creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedContent,
        error: null
      })

      // Mock step creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedStep,
        error: null
      })

      const result = await ContentCreationService.createCustomStep(
        'org-123',
        stepData,
        'user-123'
      )

      expect(result).toBeDefined()
      expect(result.id).toBe('step-123')
      expect(result.title).toBe('Custom Development Setup')
      expect(result.step_type).toBe('setup')
    })

    it('should validate step data', async () => {
      const invalidStepData = {
        title: '', // Invalid: empty title
        description: 'Test description',
        stepType: 'invalid' as any, // Invalid: invalid step type
        content: {},
        interactiveElements: [],
        estimatedTime: -10, // Invalid: negative time
        isRequired: true,
        dependencies: [],
        validationRules: []
      }

      await expect(
        ContentCreationService.createCustomStep('org-123', invalidStepData, 'user-123')
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('createContentBuilder', () => {
    it('should create content builder successfully', async () => {
      const mockCreatedBuilder = {
        id: 'mock-uuid-123',
        name: 'Custom Onboarding Flow',
        description: 'A custom onboarding flow for developers',
        organizationId: 'org-123',
        createdBy: 'user-123',
        content: [],
        settings: {
          allowRoleCustomization: true,
          enableVersioning: true,
          requireApproval: false,
          autoPublish: false,
          notifyOnChanges: true
        },
        status: 'draft',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedBuilder,
        error: null
      })

      const result = await ContentCreationService.createContentBuilder(
        'org-123',
        'Custom Onboarding Flow',
        'A custom onboarding flow for developers',
        'user-123'
      )

      expect(result).toBeDefined()
      expect(result.id).toBe('mock-uuid-123')
      expect(result.name).toBe('Custom Onboarding Flow')
      expect(result.status).toBe('draft')
      expect(result.content).toHaveLength(0)
    })
  })

  describe('addContentSection', () => {
    it('should add content section to builder', async () => {
      const mockBuilder = {
        id: 'builder-123',
        name: 'Test Builder',
        description: 'Test builder',
        organizationId: 'org-123',
        createdBy: 'user-123',
        content: [
          {
            id: 'section-1',
            type: 'text' as const,
            title: 'Existing Section',
            content: { text: 'Existing content' },
            order: 0,
            isRequired: true,
            estimatedTime: 10,
            dependencies: []
          }
        ],
        settings: {
          allowRoleCustomization: true,
          enableVersioning: true,
          requireApproval: false,
          autoPublish: false,
          notifyOnChanges: true
        },
        status: 'draft' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const newSection = {
        type: 'video' as const,
        title: 'Introduction Video',
        content: {
          url: 'https://example.com/video.mp4',
          transcript: 'Video transcript here'
        },
        isRequired: true,
        estimatedTime: 15,
        dependencies: []
      }

      // Mock builder query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockBuilder,
        error: null
      })

      // Mock builder update
      mockSupabaseClient.from().update().eq.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await ContentCreationService.addContentSection('builder-123', newSection)

      expect(result).toBeDefined()
      expect(result.id).toBe('mock-uuid-123')
      expect(result.title).toBe('Introduction Video')
      expect(result.type).toBe('video')
      expect(result.order).toBe(1) // Should be after existing section
    })

    it('should throw NotFoundError when builder not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const newSection = {
        type: 'text' as const,
        title: 'Test Section',
        content: { text: 'Test content' },
        isRequired: true,
        estimatedTime: 10,
        dependencies: []
      }

      await expect(
        ContentCreationService.addContentSection('nonexistent-builder', newSection)
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('previewContent', () => {
    it('should generate content preview', async () => {
      const mockBuilder = {
        id: 'builder-123',
        name: 'Test Builder',
        description: 'Test builder for preview',
        organizationId: 'org-123',
        createdBy: 'user-123',
        content: [
          {
            id: 'section-1',
            type: 'text' as const,
            title: 'Introduction',
            content: { text: 'Welcome to our onboarding' },
            order: 0,
            isRequired: true,
            estimatedTime: 10,
            dependencies: []
          },
          {
            id: 'section-2',
            type: 'interactive' as const,
            title: 'Interactive Exercise',
            content: { exercise: 'Complete the setup' },
            order: 1,
            isRequired: true,
            estimatedTime: 20,
            dependencies: ['section-1']
          }
        ],
        settings: {
          allowRoleCustomization: true,
          enableVersioning: true,
          requireApproval: false,
          autoPublish: false,
          notifyOnChanges: true
        },
        status: 'draft' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockBuilder,
        error: null
      })

      const result = await ContentCreationService.previewContent('builder-123', 'developer')

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.metadata.estimatedTime).toBe(30) // 10 + 20
      expect(result.metadata.interactiveElements).toBe(1)
      expect(result.metadata.difficulty).toBe('intermediate') // Has interactive content
      expect(result.preview).toContain('Test Builder')
    })
  })

  describe('publishContent', () => {
    it('should publish content builder successfully', async () => {
      const mockBuilder = {
        id: 'builder-123',
        name: 'Complete Onboarding Flow',
        description: 'A complete onboarding flow',
        organizationId: 'org-123',
        createdBy: 'user-123',
        content: [
          {
            id: 'section-1',
            type: 'text' as const,
            title: 'Welcome',
            content: { text: 'Welcome message' },
            order: 0,
            isRequired: true,
            estimatedTime: 5,
            dependencies: []
          }
        ],
        settings: {
          allowRoleCustomization: true,
          enableVersioning: true,
          requireApproval: false,
          autoPublish: false,
          notifyOnChanges: true
        },
        status: 'draft' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      const mockPublishedContent = {
        id: 'content-123',
        content_type: 'interactive',
        title: 'Complete Onboarding Flow',
        description: 'A complete onboarding flow',
        content_data: { sections: mockBuilder.content },
        media_urls: [],
        interactive_config: {
          hasInteractive: false,
          interactiveCount: 0,
          types: []
        },
        tags: ['custom_content', 'published'],
        version: 1,
        is_active: true,
        organization_id: 'org-123',
        created_by: 'user-456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // Mock builder query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockBuilder,
        error: null
      })

      // Mock content creation
      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockPublishedContent,
        error: null
      })

      // Mock builder status update
      mockSupabaseClient.from().update().eq.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await ContentCreationService.publishContent('builder-123', 'user-456')

      expect(result).toBeDefined()
      expect(result.id).toBe('content-123')
      expect(result.title).toBe('Complete Onboarding Flow')
      expect(result.tags).toContain('published')
    })

    it('should validate builder status before publishing', async () => {
      const mockBuilder = {
        id: 'builder-123',
        name: 'Test Builder',
        description: 'Test builder',
        organizationId: 'org-123',
        createdBy: 'user-123',
        content: [],
        settings: {
          allowRoleCustomization: true,
          enableVersioning: true,
          requireApproval: false,
          autoPublish: false,
          notifyOnChanges: true
        },
        status: 'published' as const, // Already published
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockBuilder,
        error: null
      })

      await expect(
        ContentCreationService.publishContent('builder-123', 'user-456')
      ).rejects.toThrow(ValidationError)
    })

    it('should validate builder content before publishing', async () => {
      const mockBuilder = {
        id: 'builder-123',
        name: 'Test Builder',
        description: 'Test builder',
        organizationId: 'org-123',
        createdBy: 'user-123',
        content: [], // Empty content - invalid
        settings: {
          allowRoleCustomization: true,
          enableVersioning: true,
          requireApproval: false,
          autoPublish: false,
          notifyOnChanges: true
        },
        status: 'draft' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockBuilder,
        error: null
      })

      await expect(
        ContentCreationService.publishContent('builder-123', 'user-456')
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('getOrganizationContentBuilders', () => {
    it('should return organization content builders', async () => {
      const mockBuilders = [
        {
          id: 'builder-1',
          name: 'Developer Onboarding',
          description: 'Onboarding for developers',
          organizationId: 'org-123',
          createdBy: 'user-123',
          content: [],
          settings: {},
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'builder-2',
          name: 'Manager Onboarding',
          description: 'Onboarding for managers',
          organizationId: 'org-123',
          createdBy: 'user-456',
          content: [],
          settings: {},
          status: 'published',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: mockBuilders,
        error: null
      })

      const result = await ContentCreationService.getOrganizationContentBuilders('org-123')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Developer Onboarding')
      expect(result[1].status).toBe('published')
    })

    it('should filter by status when provided', async () => {
      const mockBuilders = [
        {
          id: 'builder-1',
          name: 'Draft Builder',
          description: 'Draft builder',
          organizationId: 'org-123',
          createdBy: 'user-123',
          content: [],
          settings: {},
          status: 'draft',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: mockBuilders,
        error: null
      })

      const result = await ContentCreationService.getOrganizationContentBuilders('org-123', 'draft')

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('draft')
    })
  })

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.from().select().eq().order.mockRejectedValueOnce(
        new Error('Connection timeout')
      )

      await expect(
        ContentCreationService.getContentTemplates()
      ).rejects.toThrow(DatabaseError)
    })

    it('should handle malformed template data', async () => {
      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: [{ invalid: 'template', missing: 'required_fields' }],
        error: null
      })

      const result = await ContentCreationService.getContentTemplates()

      // Should handle gracefully and return transformed data
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})