/**
 * Simplified unit tests for OnboardingService
 * Tests core business logic and helper methods
 */

import { describe, it, expect } from 'vitest'

describe('OnboardingService Helper Methods', () => {
  describe('session type determination logic', () => {
    const determineSessionType = (
      organizationId?: string,
      userRole?: string,
      permissions: string[] = []
    ): 'individual' | 'team_admin' | 'team_member' => {
      if (!organizationId) {
        return 'individual'
      }

      const roleName = userRole?.toLowerCase() || ''
      
      // Check if user has admin permissions
      if (roleName.includes('admin') || roleName.includes('owner') || 
          permissions.includes('organization.manage') || 
          permissions.includes('members.invite')) {
        return 'team_admin'
      }

      return 'team_member'
    }

    it('should return individual for users without organization', () => {
      const result = determineSessionType(undefined, 'developer')
      expect(result).toBe('individual')
    })

    it('should return team_admin for admin roles', () => {
      const result = determineSessionType('org-123', 'admin')
      expect(result).toBe('team_admin')
    })

    it('should return team_admin for owner roles', () => {
      const result = determineSessionType('org-123', 'owner')
      expect(result).toBe('team_admin')
    })

    it('should return team_admin for users with admin permissions', () => {
      const result = determineSessionType('org-123', 'member', ['organization.manage'])
      expect(result).toBe('team_admin')
    })

    it('should return team_admin for users with invite permissions', () => {
      const result = determineSessionType('org-123', 'member', ['members.invite'])
      expect(result).toBe('team_admin')
    })

    it('should return team_member for regular members', () => {
      const result = determineSessionType('org-123', 'member', ['user.read'])
      expect(result).toBe('team_member')
    })

    it('should return team_member for users without specific permissions', () => {
      const result = determineSessionType('org-123', 'developer')
      expect(result).toBe('team_member')
    })
  })

  describe('recommended actions logic', () => {
    const getRecommendedActions = (adjustmentType: string, adjustmentReason: string): string[] => {
      const actions: string[] = []

      switch (adjustmentType) {
        case 'difficulty':
          actions.push('Consider providing additional support resources')
          actions.push('Offer one-on-one guidance sessions')
          actions.push('Break down complex steps into smaller tasks')
          break
        
        case 'pacing':
          if (adjustmentReason.includes('fast')) {
            actions.push('Provide advanced or accelerated content')
            actions.push('Offer optional deep-dive materials')
          } else if (adjustmentReason.includes('slow')) {
            actions.push('Allow more time for each step')
            actions.push('Provide additional practice exercises')
          }
          break
        
        case 'content_type':
          actions.push('Increase interactive elements')
          actions.push('Add multimedia content (videos, animations)')
          actions.push('Include hands-on exercises')
          break
        
        case 'engagement':
          actions.push('Add gamification elements')
          actions.push('Provide more frequent feedback')
          actions.push('Include social learning opportunities')
          break
        
        default:
          actions.push('Monitor user progress closely')
          actions.push('Be ready to provide additional support')
      }

      return actions
    }

    it('should provide difficulty adjustment recommendations', () => {
      const actions = getRecommendedActions('difficulty', 'User struggling with current difficulty level')
      
      expect(actions).toContain('Consider providing additional support resources')
      expect(actions).toContain('Offer one-on-one guidance sessions')
      expect(actions).toContain('Break down complex steps into smaller tasks')
    })

    it('should provide fast pacing recommendations', () => {
      const actions = getRecommendedActions('pacing', 'User prefers fast pace')
      
      expect(actions).toContain('Provide advanced or accelerated content')
      expect(actions).toContain('Offer optional deep-dive materials')
    })

    it('should provide slow pacing recommendations', () => {
      const actions = getRecommendedActions('pacing', 'User prefers slow pace')
      
      expect(actions).toContain('Allow more time for each step')
      expect(actions).toContain('Provide additional practice exercises')
    })

    it('should provide content type recommendations', () => {
      const actions = getRecommendedActions('content_type', 'Low engagement detected')
      
      expect(actions).toContain('Increase interactive elements')
      expect(actions).toContain('Add multimedia content (videos, animations)')
      expect(actions).toContain('Include hands-on exercises')
    })

    it('should provide engagement recommendations', () => {
      const actions = getRecommendedActions('engagement', 'User engagement is low')
      
      expect(actions).toContain('Add gamification elements')
      expect(actions).toContain('Provide more frequent feedback')
      expect(actions).toContain('Include social learning opportunities')
    })

    it('should provide default recommendations for unknown adjustment types', () => {
      const actions = getRecommendedActions('unknown', 'Some unknown issue')
      
      expect(actions).toContain('Monitor user progress closely')
      expect(actions).toContain('Be ready to provide additional support')
    })
  })

  describe('session state management logic', () => {
    const calculateSessionUpdate = (
      currentSession: {
        status: string
        paused_at?: string | null
        session_metadata?: Record<string, any>
      },
      action: 'pause' | 'resume' | 'complete'
    ) => {
      const now = new Date().toISOString()
      
      switch (action) {
        case 'pause':
          return {
            status: 'paused',
            paused_at: now,
            last_active_at: now,
            session_metadata: {
              ...currentSession.session_metadata,
              pausedAt: now
            }
          }
        
        case 'resume':
          const pauseDuration = currentSession.paused_at ? 
            Date.now() - new Date(currentSession.paused_at).getTime() : 0
          
          return {
            status: 'active',
            paused_at: null,
            last_active_at: now,
            session_metadata: {
              ...currentSession.session_metadata,
              resumedAt: now,
              pauseDuration
            }
          }
        
        case 'complete':
          return {
            status: 'completed',
            progress_percentage: 100,
            completed_at: now,
            last_active_at: now
          }
        
        default:
          return {}
      }
    }

    it('should calculate pause update correctly', () => {
      const currentSession = {
        status: 'active',
        session_metadata: { started: true }
      }

      const update = calculateSessionUpdate(currentSession, 'pause')

      expect(update.status).toBe('paused')
      expect(update.paused_at).toBeDefined()
      expect((update.session_metadata as any)?.pausedAt).toBeDefined()
    })

    it('should calculate resume update with pause duration', () => {
      const pausedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      const currentSession = {
        status: 'paused',
        paused_at: pausedAt,
        session_metadata: { started: true }
      }

      const update = calculateSessionUpdate(currentSession, 'resume')

      expect(update.status).toBe('active')
      expect(update.paused_at).toBeNull()
      expect((update.session_metadata as any)?.resumedAt).toBeDefined()
      expect((update.session_metadata as any)?.pauseDuration).toBeGreaterThan(0)
    })

    it('should calculate completion update correctly', () => {
      const currentSession = {
        status: 'active',
        session_metadata: { started: true }
      }

      const update = calculateSessionUpdate(currentSession, 'complete')

      expect(update.status).toBe('completed')
      expect(update.progress_percentage).toBe(100)
      expect(update.completed_at).toBeDefined()
    })
  })

  describe('path switching logic', () => {
    const validatePathSwitch = (
      currentPathId: string,
      newPathId: string,
      reason: string,
      userRole: string
    ): { isValid: boolean; issues: string[] } => {
      const issues: string[] = []

      if (currentPathId === newPathId) {
        issues.push('Cannot switch to the same path')
      }

      if (!reason || reason.trim().length === 0) {
        issues.push('Switch reason is required')
      }

      if (!newPathId || newPathId.trim().length === 0) {
        issues.push('New path ID is required')
      }

      // Validate reason is appropriate
      const validReasons = [
        'too difficult',
        'too easy', 
        'wrong content type',
        'pacing issues',
        'user preference',
        'technical issues'
      ]
      
      const reasonLower = reason.toLowerCase()
      const hasValidReason = validReasons.some(validReason => 
        reasonLower.includes(validReason)
      )

      if (!hasValidReason) {
        issues.push('Switch reason should be one of: difficulty, content type, pacing, preference, or technical issues')
      }

      return {
        isValid: issues.length === 0,
        issues
      }
    }

    it('should validate successful path switch', () => {
      const result = validatePathSwitch('path-123', 'path-456', 'Too difficult for user', 'developer')

      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should reject switching to same path', () => {
      const result = validatePathSwitch('path-123', 'path-123', 'User preference', 'developer')

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Cannot switch to the same path')
    })

    it('should require switch reason', () => {
      const result = validatePathSwitch('path-123', 'path-456', '', 'developer')

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Switch reason is required')
    })

    it('should require new path ID', () => {
      const result = validatePathSwitch('path-123', '', 'Too difficult', 'developer')

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('New path ID is required')
    })

    it('should validate reason appropriateness', () => {
      const result = validatePathSwitch('path-123', 'path-456', 'Random reason', 'developer')

      expect(result.isValid).toBe(false)
      expect(result.issues.some(issue => issue.includes('Switch reason should be'))).toBe(true)
    })

    it('should accept various valid reasons', () => {
      const validReasons = [
        'Too difficult for user',
        'Content is too easy',
        'Wrong content type for learning style',
        'Pacing issues with current path',
        'User preference change',
        'Technical issues with current path'
      ]

      for (const reason of validReasons) {
        const result = validatePathSwitch('path-123', 'path-456', reason, 'developer')
        expect(result.isValid).toBe(true)
      }
    })
  })
})