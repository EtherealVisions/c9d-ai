/**
 * Unit tests for Organizational Customization Service
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OrganizationalCustomizationService } from '../organizational-customization-service'
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'

// Mock Supabase client
const createMockSupabaseClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }))
})

const mockSupabaseClient = createMockSupabaseClient()

vi.mock('@/lib/database', () => ({
  createSupabaseClient: () => mockSupabaseClient
}))

describe('OrganizationalCustomizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getOrganizationCustomization', () => {
    it('should return organization customization when it exists', async () => {
      const mockConfig = {
        id: 'config-123',
        organization_id: 'org-123',
        welcome_message: 'Welcome to our company!',
        branding_assets: {
          logo: 'https://example.com/logo.png',
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          fontFamily: 'Arial, sans-serif'
        },
        custom_content: [
          {
            id: 'content-1',
            type: 'welcome_message',
            title: 'Custom Welcome',
            content: 'Welcome to our onboarding process',
            isActive: true,
            priority: 1
          }
        ],
        role_configurations: {
          developer: [
            {
              id: 'role-content-1',
              type: 'step_content',
              title: 'Developer Resources',
              content: 'Access to development tools',
              targetRole: 'developer',
              isActive: true,
              priority: 1
            }
          ]
        },
        mandatory_modules: [],
        completion_requirements: {
          minimumStepsCompleted: 5,
          requiredSteps: ['step-1', 'step-2'],
          minimumScore: 80,
          requiredTrainingModules: [],
          timeLimit: 7200
        },
        notification_settings: {
          channels: [
            {
              type: 'email',
              configuration: { smtp: 'smtp.example.com' },
              isActive: true
            }
          ],
          templates: [],
          triggers: []
        },
        integration_settings: [
          {
            type: 'slack',
            configuration: { webhook: 'https://hooks.slack.com/...' },
            isActive: true,
            events: ['onboarding_complete']
          }
        ],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockConfig,
        error: null
      })

      const result = await OrganizationalCustomizationService.getOrganizationCustomization('org-123')

      expect(result).toBeDefined()
      expect(result?.organizationId).toBe('org-123')
      expect(result?.welcomeMessage).toBe('Welcome to our company!')
      expect(result?.brandingAssets.logo).toBe('https://example.com/logo.png')
      expect(result?.customContent).toHaveLength(1)
      expect(result?.roleSpecificContent.developer).toHaveLength(1)
    })

    it('should return null when no customization exists', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await OrganizationalCustomizationService.getOrganizationCustomization('org-123')

      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: 'CONNECTION_ERROR' }
      })

      await expect(
        OrganizationalCustomizationService.getOrganizationCustomization('org-123')
      ).rejects.toThrow(DatabaseError)
    })
  })

  describe('updateOrganizationCustomization', () => {
    it('should create new customization when none exists', async () => {
      const customization = {
        organizationId: 'org-123',
        welcomeMessage: 'Welcome to our team!',
        brandingAssets: {
          logo: 'https://example.com/logo.png',
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          fontFamily: 'Arial, sans-serif'
        },
        customContent: [],
        roleSpecificContent: {},
        integrationSettings: [],
        notificationSettings: {
          channels: [],
          templates: [],
          triggers: []
        },
        completionRequirements: {
          minimumStepsCompleted: 3,
          requiredSteps: [],
          minimumScore: 70,
          requiredTrainingModules: []
        }
      }

      // Mock existing config check (not found)
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      // Mock insert
      const mockCreatedConfig = {
        id: 'config-123',
        organization_id: 'org-123',
        welcome_message: 'Welcome to our team!',
        branding_assets: customization.brandingAssets,
        custom_content: {},
        role_configurations: {},
        mandatory_modules: [],
        completion_requirements: customization.completionRequirements,
        notification_settings: customization.notificationSettings,
        integration_settings: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedConfig,
        error: null
      })

      const result = await OrganizationalCustomizationService.updateOrganizationCustomization(
        'org-123',
        customization
      )

      expect(result).toBeDefined()
      expect(result.organizationId).toBe('org-123')
      expect(result.welcomeMessage).toBe('Welcome to our team!')
    })

    it('should update existing customization', async () => {
      const existingConfig = {
        organizationId: 'org-123',
        welcomeMessage: 'Old welcome message',
        brandingAssets: {
          logo: 'https://example.com/old-logo.png',
          primaryColor: '#000000',
          secondaryColor: '#ffffff',
          fontFamily: 'Times, serif'
        },
        customContent: [],
        roleSpecificContent: {},
        integrationSettings: [],
        notificationSettings: {
          channels: [],
          templates: [],
          triggers: []
        },
        completionRequirements: {
          minimumStepsCompleted: 1,
          requiredSteps: [],
          minimumScore: 50,
          requiredTrainingModules: []
        }
      }

      const updates = {
        welcomeMessage: 'Updated welcome message',
        brandingAssets: {
          logo: 'https://example.com/new-logo.png',
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          fontFamily: 'Arial, sans-serif'
        }
      }

      // Mock existing config check (found)
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'config-123',
          organization_id: 'org-123',
          welcome_message: 'Old welcome message',
          branding_assets: existingConfig.brandingAssets,
          custom_content: {},
          role_configurations: {},
          mandatory_modules: [],
          completion_requirements: existingConfig.completionRequirements,
          notification_settings: existingConfig.notificationSettings,
          integration_settings: [],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      // Mock update
      const mockUpdatedConfig = {
        id: 'config-123',
        organization_id: 'org-123',
        welcome_message: 'Updated welcome message',
        branding_assets: updates.brandingAssets,
        custom_content: {},
        role_configurations: {},
        mandatory_modules: [],
        completion_requirements: existingConfig.completionRequirements,
        notification_settings: existingConfig.notificationSettings,
        integration_settings: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValueOnce({
        data: mockUpdatedConfig,
        error: null
      })

      const result = await OrganizationalCustomizationService.updateOrganizationCustomization(
        'org-123',
        updates
      )

      expect(result).toBeDefined()
      expect(result.welcomeMessage).toBe('Updated welcome message')
      expect(result.brandingAssets.logo).toBe('https://example.com/new-logo.png')
    })
  })

  describe('updateBrandingAssets', () => {
    it('should update branding assets successfully', async () => {
      const brandingAssets = {
        logo: 'https://example.com/logo.png',
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        fontFamily: 'Arial, sans-serif',
        customCSS: '.custom { color: red; }',
        favicon: 'https://example.com/favicon.ico'
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValueOnce({
        data: { branding_assets: brandingAssets },
        error: null
      })

      const result = await OrganizationalCustomizationService.updateBrandingAssets(
        'org-123',
        brandingAssets
      )

      expect(result).toEqual(brandingAssets)
    })

    it('should validate branding assets', async () => {
      const invalidBrandingAssets = {
        logo: '', // Invalid: empty logo
        primaryColor: 'invalid-color', // Invalid: not a valid color
        secondaryColor: '#6c757d',
        fontFamily: 'Arial, sans-serif'
      }

      await expect(
        OrganizationalCustomizationService.updateBrandingAssets('org-123', invalidBrandingAssets)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('createCustomContent', () => {
    it('should create custom content successfully', async () => {
      const contentRequest = {
        type: 'step' as const,
        title: 'Custom Welcome Step',
        description: 'A custom welcome step for new employees',
        targetRole: 'developer',
        content: {
          text: 'Welcome to the development team!',
          links: ['https://docs.example.com']
        },
        metadata: {
          estimatedTime: 15,
          difficulty: 'beginner'
        }
      }

      const mockCreatedContent = {
        id: 'content-123',
        content_type: 'template',
        title: 'Custom Welcome Step',
        description: 'A custom welcome step for new employees',
        content_data: contentRequest.content,
        media_urls: [],
        interactive_config: {},
        tags: ['developer'],
        version: 1,
        is_active: true,
        organization_id: 'org-123',
        created_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedContent,
        error: null
      })

      const result = await OrganizationalCustomizationService.createCustomContent(
        'org-123',
        contentRequest
      )

      expect(result).toBeDefined()
      expect(result.id).toBe('content-123')
      expect(result.title).toBe('Custom Welcome Step')
      expect(result.targetRole).toBe('developer')
    })

    it('should validate content request', async () => {
      const invalidContentRequest = {
        type: 'invalid' as any, // Invalid type
        title: '', // Invalid: empty title
        description: 'Test description',
        content: {}, // Invalid: empty content
        metadata: {}
      }

      await expect(
        OrganizationalCustomizationService.createCustomContent('org-123', invalidContentRequest)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('getCustomContent', () => {
    it('should return custom content with filters', async () => {
      const mockContent = [
        {
          id: 'content-1',
          content_type: 'template',
          title: 'Developer Welcome',
          description: 'Welcome message for developers',
          content_data: { text: 'Welcome developers!' },
          media_urls: [],
          interactive_config: {},
          tags: ['developer'],
          version: 1,
          is_active: true,
          organization_id: 'org-123',
          created_by: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'content-2',
          content_type: 'template',
          title: 'Admin Welcome',
          description: 'Welcome message for admins',
          content_data: { text: 'Welcome admins!' },
          media_urls: [],
          interactive_config: {},
          tags: ['admin'],
          version: 1,
          is_active: true,
          organization_id: 'org-123',
          created_by: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockSupabaseClient.from().select().eq().contains().order.mockResolvedValueOnce({
        data: mockContent,
        error: null
      })

      const result = await OrganizationalCustomizationService.getCustomContent(
        'org-123',
        { targetRole: 'developer' }
      )

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Developer Welcome')
    })

    it('should return empty array when no content found', async () => {
      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await OrganizationalCustomizationService.getCustomContent('org-123')

      expect(result).toHaveLength(0)
    })
  })

  describe('configureNotifications', () => {
    it('should configure notification settings successfully', async () => {
      const notificationSettings = {
        channels: [
          {
            type: 'email' as const,
            configuration: { smtp: 'smtp.example.com', port: 587 },
            isActive: true
          },
          {
            type: 'slack' as const,
            configuration: { webhook: 'https://hooks.slack.com/...' },
            isActive: true
          }
        ],
        templates: [
          {
            id: 'template-1',
            name: 'Welcome Template',
            type: 'welcome' as const,
            subject: 'Welcome to {{organizationName}}',
            content: 'Welcome {{userName}} to our onboarding process!',
            variables: ['organizationName', 'userName']
          }
        ],
        triggers: [
          {
            event: 'onboarding_started',
            conditions: { userRole: 'developer' },
            templateId: 'template-1',
            channels: ['email'],
            delay: 0
          }
        ]
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValueOnce({
        data: { notification_settings: notificationSettings },
        error: null
      })

      const result = await OrganizationalCustomizationService.configureNotifications(
        'org-123',
        notificationSettings
      )

      expect(result).toEqual(notificationSettings)
      expect(result.channels).toHaveLength(2)
      expect(result.templates).toHaveLength(1)
      expect(result.triggers).toHaveLength(1)
    })

    it('should validate notification settings', async () => {
      const invalidNotificationSettings = {
        channels: [], // Invalid: no channels
        templates: [],
        triggers: []
      }

      await expect(
        OrganizationalCustomizationService.configureNotifications('org-123', invalidNotificationSettings)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('configureIntegrations', () => {
    it('should configure integration settings successfully', async () => {
      const integrationSettings = [
        {
          type: 'slack' as const,
          configuration: {
            webhook: 'https://hooks.slack.com/services/...',
            channel: '#onboarding'
          },
          isActive: true,
          events: ['onboarding_complete', 'milestone_reached']
        },
        {
          type: 'webhook' as const,
          configuration: {
            url: 'https://api.example.com/webhook',
            secret: 'webhook-secret'
          },
          isActive: true,
          events: ['user_progress']
        }
      ]

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValueOnce({
        data: { integration_settings: integrationSettings },
        error: null
      })

      const result = await OrganizationalCustomizationService.configureIntegrations(
        'org-123',
        integrationSettings
      )

      expect(result).toEqual(integrationSettings)
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('slack')
      expect(result[1].type).toBe('webhook')
    })

    it('should validate integration settings', async () => {
      const invalidIntegrationSettings = [
        {
          type: 'invalid' as any, // Invalid type
          configuration: {}, // Invalid: empty configuration
          isActive: true,
          events: []
        }
      ]

      await expect(
        OrganizationalCustomizationService.configureIntegrations('org-123', invalidIntegrationSettings)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('setCompletionRequirements', () => {
    it('should set completion requirements successfully', async () => {
      const completionRequirements = {
        minimumStepsCompleted: 5,
        requiredSteps: ['step-1', 'step-2', 'step-3'],
        minimumScore: 85,
        requiredTrainingModules: ['module-1', 'module-2'],
        timeLimit: 7200,
        managerApproval: true
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValueOnce({
        data: { completion_requirements: completionRequirements },
        error: null
      })

      const result = await OrganizationalCustomizationService.setCompletionRequirements(
        'org-123',
        completionRequirements
      )

      expect(result).toEqual(completionRequirements)
      expect(result.minimumStepsCompleted).toBe(5)
      expect(result.minimumScore).toBe(85)
      expect(result.managerApproval).toBe(true)
    })

    it('should validate completion requirements', async () => {
      const invalidRequirements = {
        minimumStepsCompleted: -1, // Invalid: negative
        requiredSteps: [],
        minimumScore: 150, // Invalid: > 100
        requiredTrainingModules: [],
        timeLimit: -100 // Invalid: negative
      }

      await expect(
        OrganizationalCustomizationService.setCompletionRequirements('org-123', invalidRequirements)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('applyCustomization', () => {
    it('should apply organization customization to content', async () => {
      const baseContent = {
        title: 'Default Onboarding',
        description: 'Standard onboarding process',
        steps: []
      }

      const mockCustomization = {
        organizationId: 'org-123',
        welcomeMessage: 'Welcome to Acme Corp!',
        brandingAssets: {
          logo: 'https://acme.com/logo.png',
          primaryColor: '#ff6b35',
          secondaryColor: '#004e89',
          fontFamily: 'Roboto, sans-serif'
        },
        customContent: [
          {
            id: 'content-1',
            type: 'welcome_message' as const,
            title: 'Custom Welcome',
            content: 'Welcome to our amazing company!',
            isActive: true,
            priority: 1
          }
        ],
        roleSpecificContent: {
          developer: [
            {
              id: 'dev-content-1',
              type: 'step_content' as const,
              title: 'Developer Resources',
              content: 'Access to development tools and documentation',
              targetRole: 'developer',
              isActive: true,
              priority: 1
            }
          ]
        },
        integrationSettings: [],
        notificationSettings: {
          channels: [],
          templates: [],
          triggers: []
        },
        completionRequirements: {
          minimumStepsCompleted: 3,
          requiredSteps: [],
          minimumScore: 70,
          requiredTrainingModules: []
        }
      }

      // Mock customization query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: 'config-123',
          organization_id: 'org-123',
          welcome_message: mockCustomization.welcomeMessage,
          branding_assets: mockCustomization.brandingAssets,
          custom_content: mockCustomization.customContent,
          role_configurations: mockCustomization.roleSpecificContent,
          mandatory_modules: [],
          completion_requirements: mockCustomization.completionRequirements,
          notification_settings: mockCustomization.notificationSettings,
          integration_settings: mockCustomization.integrationSettings,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        error: null
      })

      const result = await OrganizationalCustomizationService.applyCustomization(
        'org-123',
        baseContent,
        'developer'
      )

      expect(result.branding).toEqual(mockCustomization.brandingAssets)
      expect(result.welcomeMessage).toBe('Welcome to Acme Corp!')
      expect(result.roleSpecificContent).toEqual(mockCustomization.roleSpecificContent.developer)
      expect(result.customContent).toEqual(mockCustomization.customContent)
    })

    it('should return base content when no customization exists', async () => {
      const baseContent = {
        title: 'Default Onboarding',
        description: 'Standard onboarding process'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await OrganizationalCustomizationService.applyCustomization(
        'org-123',
        baseContent
      )

      expect(result).toEqual(baseContent)
    })
  })

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSupabaseClient.from().select().eq().single.mockRejectedValueOnce(
        new Error('Connection timeout')
      )

      await expect(
        OrganizationalCustomizationService.getOrganizationCustomization('org-123')
      ).rejects.toThrow(DatabaseError)
    })

    it('should handle malformed configuration data', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { invalid: 'data', missing: 'required_fields' },
        error: null
      })

      const result = await OrganizationalCustomizationService.getOrganizationCustomization('org-123')

      // Should handle gracefully and return transformed data
      expect(result).toBeDefined()
    })
  })
})