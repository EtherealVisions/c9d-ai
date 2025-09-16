/**
 * Unit tests for Onboarding Validation Schemas
 * Requirements: 1.1, 2.1, 6.1
 */

import { describe, it, expect } from 'vitest'
import {
  validateOnboardingPath,
  validateCreateOnboardingPath,
  validateUpdateOnboardingPath,
  validateOnboardingStep,
  validateCreateOnboardingStep,
  validateUpdateOnboardingStep,
  validateOnboardingSession,
  validateCreateOnboardingSession,
  validateUpdateOnboardingSession,
  validateUserProgress,
  validateCreateUserProgress,
  validateUpdateUserProgress,
  validateTeamInvitation,
  validateCreateTeamInvitation,
  validateUpdateTeamInvitation,
  validateOnboardingContext,
  validateStepResult,
  validateOnboardingProgress,
  onboardingSessionTypeSchema,
  onboardingSessionStatusSchema,
  onboardingStepTypeSchema,
  userProgressStatusSchema,
  teamInvitationStatusSchema,
  onboardingContentTypeSchema,
  onboardingMilestoneTypeSchema
} from '@/lib/validation/onboarding-validation'

describe('Onboarding Validation Schemas', () => {
  describe('Enum Schemas', () => {
    it('should validate onboarding session types', () => {
      expect(() => onboardingSessionTypeSchema.parse('individual')).not.toThrow()
      expect(() => onboardingSessionTypeSchema.parse('team_admin')).not.toThrow()
      expect(() => onboardingSessionTypeSchema.parse('team_member')).not.toThrow()
      expect(() => onboardingSessionTypeSchema.parse('invalid')).toThrow()
    })

    it('should validate onboarding session statuses', () => {
      expect(() => onboardingSessionStatusSchema.parse('active')).not.toThrow()
      expect(() => onboardingSessionStatusSchema.parse('paused')).not.toThrow()
      expect(() => onboardingSessionStatusSchema.parse('completed')).not.toThrow()
      expect(() => onboardingSessionStatusSchema.parse('abandoned')).not.toThrow()
      expect(() => onboardingSessionStatusSchema.parse('invalid')).toThrow()
    })

    it('should validate onboarding step types', () => {
      expect(() => onboardingStepTypeSchema.parse('tutorial')).not.toThrow()
      expect(() => onboardingStepTypeSchema.parse('exercise')).not.toThrow()
      expect(() => onboardingStepTypeSchema.parse('setup')).not.toThrow()
      expect(() => onboardingStepTypeSchema.parse('validation')).not.toThrow()
      expect(() => onboardingStepTypeSchema.parse('milestone')).not.toThrow()
      expect(() => onboardingStepTypeSchema.parse('invalid')).toThrow()
    })

    it('should validate user progress statuses', () => {
      expect(() => userProgressStatusSchema.parse('not_started')).not.toThrow()
      expect(() => userProgressStatusSchema.parse('in_progress')).not.toThrow()
      expect(() => userProgressStatusSchema.parse('completed')).not.toThrow()
      expect(() => userProgressStatusSchema.parse('skipped')).not.toThrow()
      expect(() => userProgressStatusSchema.parse('failed')).not.toThrow()
      expect(() => userProgressStatusSchema.parse('invalid')).toThrow()
    })

    it('should validate team invitation statuses', () => {
      expect(() => teamInvitationStatusSchema.parse('pending')).not.toThrow()
      expect(() => teamInvitationStatusSchema.parse('accepted')).not.toThrow()
      expect(() => teamInvitationStatusSchema.parse('expired')).not.toThrow()
      expect(() => teamInvitationStatusSchema.parse('revoked')).not.toThrow()
      expect(() => teamInvitationStatusSchema.parse('invalid')).toThrow()
    })

    it('should validate content types', () => {
      expect(() => onboardingContentTypeSchema.parse('text')).not.toThrow()
      expect(() => onboardingContentTypeSchema.parse('html')).not.toThrow()
      expect(() => onboardingContentTypeSchema.parse('markdown')).not.toThrow()
      expect(() => onboardingContentTypeSchema.parse('video')).not.toThrow()
      expect(() => onboardingContentTypeSchema.parse('image')).not.toThrow()
      expect(() => onboardingContentTypeSchema.parse('interactive')).not.toThrow()
      expect(() => onboardingContentTypeSchema.parse('template')).not.toThrow()
      expect(() => onboardingContentTypeSchema.parse('invalid')).toThrow()
    })

    it('should validate milestone types', () => {
      expect(() => onboardingMilestoneTypeSchema.parse('progress')).not.toThrow()
      expect(() => onboardingMilestoneTypeSchema.parse('achievement')).not.toThrow()
      expect(() => onboardingMilestoneTypeSchema.parse('completion')).not.toThrow()
      expect(() => onboardingMilestoneTypeSchema.parse('time_based')).not.toThrow()
      expect(() => onboardingMilestoneTypeSchema.parse('invalid')).toThrow()
    })
  })

  describe('Onboarding Path Validation', () => {
    const validPath = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Developer Onboarding',
      description: 'Complete onboarding for developers',
      target_role: 'developer',
      subscription_tier: 'pro',
      estimated_duration: 45,
      is_active: true,
      prerequisites: ['basic_knowledge'],
      learning_objectives: ['Learn platform', 'Create first project'],
      success_criteria: { project_created: true },
      metadata: { difficulty: 'beginner' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should validate complete onboarding path', () => {
      expect(() => validateOnboardingPath(validPath)).not.toThrow()
    })

    it('should validate create onboarding path', () => {
      const createData = { ...validPath }
      delete (createData as any).id
      delete (createData as any).created_at
      delete (createData as any).updated_at
      
      expect(() => validateCreateOnboardingPath(createData)).not.toThrow()
    })

    it('should validate update onboarding path', () => {
      const updateData = { name: 'Updated Name', description: 'Updated description' }
      expect(() => validateUpdateOnboardingPath(updateData)).not.toThrow()
    })

    it('should reject invalid path data', () => {
      const invalidPath = { ...validPath, name: '' }
      expect(() => validateOnboardingPath(invalidPath)).toThrow()
    })
  })

  describe('Onboarding Step Validation', () => {
    const validStep = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      path_id: '123e4567-e89b-12d3-a456-426614174001',
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
      metadata: { category: 'profile' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should validate complete onboarding step', () => {
      expect(() => validateOnboardingStep(validStep)).not.toThrow()
    })

    it('should validate create onboarding step', () => {
      const createData = { ...validStep }
      delete (createData as any).id
      delete (createData as any).created_at
      delete (createData as any).updated_at
      
      expect(() => validateCreateOnboardingStep(createData)).not.toThrow()
    })

    it('should validate update onboarding step', () => {
      const updateData = { title: 'Updated Title', estimated_time: 15 }
      expect(() => validateUpdateOnboardingStep(updateData)).not.toThrow()
    })

    it('should reject invalid step data', () => {
      const invalidStep = { ...validStep, step_order: 0 }
      expect(() => validateOnboardingStep(invalidStep)).toThrow()
    })
  })

  describe('Onboarding Session Validation', () => {
    const validSession = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      organization_id: '123e4567-e89b-12d3-a456-426614174002',
      path_id: '123e4567-e89b-12d3-a456-426614174003',
      session_type: 'individual' as const,
      status: 'active' as const,
      current_step_id: '123e4567-e89b-12d3-a456-426614174004',
      current_step_index: 0,
      progress_percentage: 25.5,
      time_spent: 300,
      started_at: '2024-01-01T00:00:00Z',
      last_active_at: '2024-01-01T00:00:00Z',
      completed_at: null,
      paused_at: null,
      session_metadata: { source: 'web' },
      preferences: { theme: 'dark' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should validate complete onboarding session', () => {
      expect(() => validateOnboardingSession(validSession)).not.toThrow()
    })

    it('should validate create onboarding session', () => {
      const createData = { ...validSession }
      delete (createData as any).id
      delete (createData as any).created_at
      delete (createData as any).updated_at
      
      expect(() => validateCreateOnboardingSession(createData)).not.toThrow()
    })

    it('should validate update onboarding session', () => {
      const updateData = { progress_percentage: 50, time_spent: 600 }
      expect(() => validateUpdateOnboardingSession(updateData)).not.toThrow()
    })

    it('should reject invalid session data', () => {
      const invalidSession = { ...validSession, progress_percentage: 150 }
      expect(() => validateOnboardingSession(invalidSession)).toThrow()
    })
  })

  describe('User Progress Validation', () => {
    const validProgress = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      session_id: '123e4567-e89b-12d3-a456-426614174001',
      step_id: '123e4567-e89b-12d3-a456-426614174002',
      user_id: '123e4567-e89b-12d3-a456-426614174003',
      status: 'completed' as const,
      started_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T00:05:00Z',
      time_spent: 300,
      attempts: 1,
      score: 95.5,
      feedback: { rating: 5 },
      user_actions: { clicks: 10 },
      step_result: { success: true },
      errors: {},
      achievements: { badge: 'first_step' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:05:00Z'
    }

    it('should validate complete user progress', () => {
      expect(() => validateUserProgress(validProgress)).not.toThrow()
    })

    it('should validate create user progress', () => {
      const createData = { ...validProgress }
      delete (createData as any).id
      delete (createData as any).created_at
      delete (createData as any).updated_at
      
      expect(() => validateCreateUserProgress(createData)).not.toThrow()
    })

    it('should validate update user progress', () => {
      const updateData = { status: 'completed' as const, score: 90 }
      expect(() => validateUpdateUserProgress(updateData)).not.toThrow()
    })

    it('should reject invalid progress data', () => {
      const invalidProgress = { ...validProgress, score: 150 }
      expect(() => validateUserProgress(invalidProgress)).toThrow()
    })
  })

  describe('Team Invitation Validation', () => {
    const validInvitation = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      organization_id: '123e4567-e89b-12d3-a456-426614174001',
      invited_by: '123e4567-e89b-12d3-a456-426614174002',
      email: 'test@example.com',
      role: 'developer',
      custom_message: 'Welcome to our team!',
      onboarding_path_override: '123e4567-e89b-12d3-a456-426614174003',
      invitation_token: 'abc123def456',
      status: 'pending' as const,
      expires_at: '2024-01-08T00:00:00Z',
      accepted_at: null,
      onboarding_session_id: null,
      metadata: { source: 'admin_panel' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    it('should validate complete team invitation', () => {
      expect(() => validateTeamInvitation(validInvitation)).not.toThrow()
    })

    it('should validate create team invitation', () => {
      const createData = { ...validInvitation }
      delete (createData as any).id
      delete (createData as any).invitation_token
      delete (createData as any).created_at
      delete (createData as any).updated_at
      
      expect(() => validateCreateTeamInvitation(createData)).not.toThrow()
    })

    it('should validate update team invitation', () => {
      const updateData = { status: 'accepted' as const, accepted_at: '2024-01-02T00:00:00Z' }
      expect(() => validateUpdateTeamInvitation(updateData)).not.toThrow()
    })

    it('should reject invalid invitation data', () => {
      const invalidInvitation = { ...validInvitation, email: 'invalid-email' }
      expect(() => validateTeamInvitation(invalidInvitation)).toThrow()
    })
  })

  describe('Business Logic Validation', () => {
    it('should validate onboarding context', () => {
      const validContext = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        userRole: 'developer',
        subscriptionTier: 'pro',
        preferences: { theme: 'dark' }
      }

      expect(() => validateOnboardingContext(validContext)).not.toThrow()
    })

    it('should validate step result', () => {
      const validStepResult = {
        stepId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'completed' as const,
        timeSpent: 300,
        userActions: [{ clicks: 5 }, { scrolls: 10 }],
        feedback: { rating: 5 },
        errors: [{ validation: 'none' }],
        achievements: [{ badge: 'first_step' }]
      }

      expect(() => validateStepResult(validStepResult)).not.toThrow()
    })

    it('should validate onboarding progress', () => {
      const validProgress = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        currentStepIndex: 2,
        completedSteps: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
        skippedSteps: [],
        milestones: [],
        overallProgress: 50.5,
        timeSpent: 600,
        lastUpdated: '2024-01-01T00:00:00Z'
      }

      expect(() => validateOnboardingProgress(validProgress)).not.toThrow()
    })

    it('should reject invalid business logic data', () => {
      const invalidContext = {
        userId: 'invalid-uuid',
        userRole: 'developer'
      }

      expect(() => validateOnboardingContext(invalidContext)).toThrow()
    })
  })
})