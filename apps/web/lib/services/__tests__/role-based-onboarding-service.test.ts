/**
 * Unit tests for Role-Based Onboarding Service
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoleBasedOnboardingService } from '../role-based-onboarding-service'
import { DatabaseError, NotFoundError, ValidationError, ErrorCode } from '@/lib/errors'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }))
}

vi.mock('@/lib/database', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}))

describe('RoleBasedOnboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getRoleSpecificPath', () => {
    it('should return role-specific onboarding path when configuration exists', async () => {
      const mockRoleConfig = {
        role: 'developer',
        onboardingPathId: 'path-123',
        customizations: [],
        trainingModules: [],
        completionCriteria: {
          requiredSteps: ['step-1', 'step-2'],
          minimumScore: 80,
          requiredTrainingModules: [],
          knowledgeChecks: [],
          practicalExercises: []
        },
        additionalResources: []
      }

      const mockPathData = {
        id: 'path-123',
        name: 'Developer Onboarding',
        description: 'Onboarding path for developers',
        target_role: 'developer',
        subscription_tier: null,
        estimated_duration: 120,
        is_active: true,
        prerequisites: [],
        learning_objectives: ['Learn development tools', 'Understand codebase'],
        success_criteria: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        onboarding_steps: [
          {
            id: 'step-1',
            path_id: 'path-123',
            title: 'Setup Development Environment',
            description: 'Install and configure development tools',
            step_type: 'setup',
            step_order: 0,
            estimated_time: 30,
            is_required: true,
            dependencies: [],
            content: {},
            interactive_elements: {},
            success_criteria: {},
            validation_rules: {},
            metadata: {},
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      }

      // Mock organization config query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          role_configurations: {
            developer: mockRoleConfig
          }
        },
        error: null
      })

      // Mock path query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockPathData,
        error: null
      })

      const result = await RoleBasedOnboardingService.getRoleSpecificPath(
        'user-123',
        'org-123',
        'developer'
      )

      expect(result).toBeDefined()
      expect(result.id).toBe('path-123')
      expect(result.name).toBe('Developer Onboarding')
      expect(result.target_role).toBe('developer')
      expect(result.steps).toHaveLength(1)
      expect(result.steps?.[0].title).toBe('Setup Development Environment')
    })

    it('should return default path when no organization configuration exists', async () => {
      const mockDefaultPath = {
        id: 'default-path-123',
        name: 'Default Developer Path',
        description: 'Default onboarding for developers',
        target_role: 'developer',
        subscription_tier: null,
        estimated_duration: 90,
        is_active: true,
        prerequisites: [],
        learning_objectives: [],
        success_criteria: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        onboarding_steps: []
      }

      // Mock organization config query (no config found)
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      // Mock default path query
      mockSupabaseClient.from().select().eq().is().order().limit().single.mockResolvedValueOnce({
        data: mockDefaultPath,
        error: null
      })

      const result = await RoleBasedOnboardingService.getRoleSpecificPath(
        'user-123',
        'org-123',
        'developer'
      )

      expect(result).toBeDefined()
      expect(result.id).toBe('default-path-123')
      expect(result.name).toBe('Default Developer Path')
    })

    it('should throw NotFoundError when no path is found', async () => {
      // Mock organization config query (no config found)
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      // Mock default path query (no path found)
      mockSupabaseClient.from().select().eq().is().order().limit().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      await expect(
        RoleBasedOnboardingService.getRoleSpecificPath('user-123', 'org-123', 'nonexistent-role')
      ).rejects.toThrow(NotFoundError)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
      })

      await expect(
        RoleBasedOnboardingService.getRoleSpecificPath('user-123', 'org-123', 'developer')
      ).rejects.toThrow(DatabaseError)
    })
  })

  describe('filterContentByRole', () => {
    it('should filter content based on role permissions', async () => {
      const mockContent = [
        {
          id: 'step-1',
          path_id: 'path-123',
          title: 'Public Step',
          description: 'Available to all roles',
          step_type: 'tutorial' as const,
          step_order: 0,
          estimated_time: 15,
          is_required: true,
          dependencies: [],
          content: {},
          interactive_elements: {},
          success_criteria: {},
          validation_rules: {},
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'step-2',
          path_id: 'path-123',
          title: 'Admin Only Step',
          description: 'Only for administrators',
          step_type: 'setup' as const,
          step_order: 1,
          estimated_time: 30,
          is_required: true,
          dependencies: [],
          content: {},
          interactive_elements: {},
          success_criteria: {},
          validation_rules: {},
          metadata: {
            allowedRoles: ['admin'],
            requiredPermissions: ['admin.manage']
          },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      // Mock role permissions query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { permissions: ['user.read', 'user.write'] },
        error: null
      })

      const result = await RoleBasedOnboardingService.filterContentByRole(
        mockContent,
        'developer',
        'org-123'
      )

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Public Step')
    })

    it('should include all content when user has admin permissions', async () => {
      const mockContent = [
        {
          id: 'step-1',
          path_id: 'path-123',
          title: 'Public Step',
          description: 'Available to all roles',
          step_type: 'tutorial' as const,
          step_order: 0,
          estimated_time: 15,
          is_required: true,
          dependencies: [],
          content: {},
          interactive_elements: {},
          success_criteria: {},
          validation_rules: {},
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'step-2',
          path_id: 'path-123',
          title: 'Admin Only Step',
          description: 'Only for administrators',
          step_type: 'setup' as const,
          step_order: 1,
          estimated_time: 30,
          is_required: true,
          dependencies: [],
          content: {},
          interactive_elements: {},
          success_criteria: {},
          validation_rules: {},
          metadata: {
            allowedRoles: ['admin'],
            requiredPermissions: ['admin.manage']
          },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      // Mock role permissions query (admin permissions)
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { permissions: ['admin.manage', 'user.read', 'user.write'] },
        error: null
      })

      const result = await RoleBasedOnboardingService.filterContentByRole(
        mockContent,
        'admin',
        'org-123'
      )

      expect(result).toHaveLength(2)
    })
  })

  describe('createTrainingModule', () => {
    it('should create training module successfully', async () => {
      const mockTrainingModule = {
        title: 'JavaScript Fundamentals',
        description: 'Learn JavaScript basics',
        role: 'developer',
        content: [
          {
            id: 'content-1',
            type: 'text' as const,
            title: 'Variables and Functions',
            content: { text: 'Learn about variables and functions' },
            estimatedTime: 30,
            learningObjectives: ['Understand variables', 'Write functions']
          }
        ],
        knowledgeChecks: [
          {
            id: 'check-1',
            type: 'quiz' as const,
            title: 'JavaScript Quiz',
            questions: [
              {
                id: 'q1',
                type: 'multiple_choice' as const,
                question: 'What is a variable?',
                options: ['A container for data', 'A function', 'A loop'],
                correctAnswer: 'A container for data',
                explanation: 'Variables store data values',
                points: 10
              }
            ],
            passingScore: 70,
            maxAttempts: 3
          }
        ],
        estimatedDuration: 60,
        prerequisites: [],
        isRequired: true
      }

      const mockCreatedModule = {
        ...mockTrainingModule,
        id: 'module-123',
        organization_id: 'org-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedModule,
        error: null
      })

      const result = await RoleBasedOnboardingService.createTrainingModule(
        'org-123',
        mockTrainingModule
      )

      expect(result).toBeDefined()
      expect(result.id).toBe('module-123')
      expect(result.title).toBe('JavaScript Fundamentals')
      expect(result.role).toBe('developer')
    })

    it('should validate training module data', async () => {
      const invalidModule = {
        title: '', // Invalid: empty title
        description: 'Test description',
        role: 'developer',
        content: [],
        knowledgeChecks: [],
        estimatedDuration: 0, // Invalid: zero duration
        prerequisites: [],
        isRequired: true
      }

      await expect(
        RoleBasedOnboardingService.createTrainingModule('org-123', invalidModule)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('getTrainingModulesForRole', () => {
    it('should return training modules for specific role', async () => {
      const mockModules = [
        {
          id: 'module-1',
          title: 'JavaScript Basics',
          role: 'developer',
          is_active: true,
          organization_id: 'org-123'
        },
        {
          id: 'module-2',
          title: 'Advanced JavaScript',
          role: 'developer',
          is_active: true,
          organization_id: 'org-123'
        }
      ]

      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: mockModules,
        error: null
      })

      const result = await RoleBasedOnboardingService.getTrainingModulesForRole(
        'developer',
        'org-123'
      )

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('JavaScript Basics')
      expect(result[1].title).toBe('Advanced JavaScript')
    })

    it('should return empty array when no modules found', async () => {
      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await RoleBasedOnboardingService.getTrainingModulesForRole(
        'nonexistent-role'
      )

      expect(result).toHaveLength(0)
    })
  })

  describe('validateKnowledgeCheck', () => {
    it('should validate knowledge check and return results', async () => {
      const mockKnowledgeCheck = {
        id: 'check-1',
        type: 'quiz' as const,
        title: 'JavaScript Quiz',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice' as const,
            question: 'What is a variable?',
            options: ['A container for data', 'A function', 'A loop'],
            correctAnswer: 'A container for data',
            explanation: 'Variables store data values',
            points: 10
          },
          {
            id: 'q2',
            type: 'true_false' as const,
            question: 'JavaScript is a compiled language',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'JavaScript is an interpreted language',
            points: 10
          }
        ],
        passingScore: 70,
        maxAttempts: 3
      }

      const userAnswers = {
        q1: 'A container for data',
        q2: 'False'
      }

      // Mock knowledge check query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockKnowledgeCheck,
        error: null
      })

      // Mock attempt recording
      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await RoleBasedOnboardingService.validateKnowledgeCheck(
        'user-123',
        'session-123',
        'check-1',
        userAnswers
      )

      expect(result.passed).toBe(true)
      expect(result.score).toBe(100)
      expect(result.feedback).toHaveLength(2)
      expect(result.nextActions).toContain('proceed_to_next_step')
    })

    it('should handle failing knowledge check', async () => {
      const mockKnowledgeCheck = {
        id: 'check-1',
        type: 'quiz' as const,
        title: 'JavaScript Quiz',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice' as const,
            question: 'What is a variable?',
            options: ['A container for data', 'A function', 'A loop'],
            correctAnswer: 'A container for data',
            explanation: 'Variables store data values',
            points: 10
          }
        ],
        passingScore: 70,
        maxAttempts: 3
      }

      const userAnswers = {
        q1: 'A function' // Wrong answer
      }

      // Mock knowledge check query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockKnowledgeCheck,
        error: null
      })

      // Mock attempt recording
      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: null,
        error: null
      })

      const result = await RoleBasedOnboardingService.validateKnowledgeCheck(
        'user-123',
        'session-123',
        'check-1',
        userAnswers
      )

      expect(result.passed).toBe(false)
      expect(result.score).toBe(0)
      expect(result.nextActions).toContain('review_content')
      expect(result.nextActions).toContain('retake_assessment')
    })

    it('should throw NotFoundError when knowledge check not found', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      })

      await expect(
        RoleBasedOnboardingService.validateKnowledgeCheck(
          'user-123',
          'session-123',
          'nonexistent-check',
          {}
        )
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.from().select().eq().single.mockRejectedValueOnce(
        new Error('Connection timeout')
      )

      await expect(
        RoleBasedOnboardingService.getRoleSpecificPath('user-123', 'org-123', 'developer')
      ).rejects.toThrow(DatabaseError)
    })

    it('should handle malformed data gracefully', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: { invalid: 'data' },
        error: null
      })

      await expect(
        RoleBasedOnboardingService.getRoleSpecificPath('user-123', 'org-123', 'developer')
      ).rejects.toThrow(DatabaseError)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete role-based onboarding flow', async () => {
      // Mock role configuration
      const mockRoleConfig = {
        role: 'developer',
        onboardingPathId: 'path-123',
        customizations: [
          {
            type: 'content_filter',
            target: 'step-1',
            configuration: { showAdvanced: true },
            isActive: true
          }
        ],
        trainingModules: [
          {
            id: 'module-1',
            title: 'Git Basics',
            description: 'Learn Git version control',
            role: 'developer',
            content: [],
            knowledgeChecks: [],
            estimatedDuration: 45,
            prerequisites: [],
            isRequired: true
          }
        ],
        completionCriteria: {
          requiredSteps: ['step-1', 'step-2'],
          minimumScore: 80,
          requiredTrainingModules: ['module-1'],
          knowledgeChecks: [],
          practicalExercises: []
        },
        additionalResources: []
      }

      const mockPathData = {
        id: 'path-123',
        name: 'Developer Onboarding',
        description: 'Complete developer onboarding',
        target_role: 'developer',
        subscription_tier: null,
        estimated_duration: 120,
        is_active: true,
        prerequisites: [],
        learning_objectives: [],
        success_criteria: {},
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        onboarding_steps: [
          {
            id: 'step-1',
            path_id: 'path-123',
            title: 'Environment Setup',
            description: 'Setup development environment',
            step_type: 'setup',
            step_order: 0,
            estimated_time: 30,
            is_required: true,
            dependencies: [],
            content: {},
            interactive_elements: {},
            success_criteria: {},
            validation_rules: {},
            metadata: {},
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      }

      // Mock organization config query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: {
          role_configurations: {
            developer: mockRoleConfig
          }
        },
        error: null
      })

      // Mock path query
      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockPathData,
        error: null
      })

      const result = await RoleBasedOnboardingService.getRoleSpecificPath(
        'user-123',
        'org-123',
        'developer'
      )

      expect(result).toBeDefined()
      expect(result.steps).toHaveLength(2) // Original step + training module step
      expect(result.steps?.some(step => step.title === 'Environment Setup')).toBe(true)
      expect(result.steps?.some(step => step.title === 'Git Basics')).toBe(true)
    })
  })
})