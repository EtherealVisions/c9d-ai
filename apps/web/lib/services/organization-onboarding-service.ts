/**
 * OrganizationOnboardingService - Service for managing organization onboarding configurations
 * Handles organization setup, team invitations, and onboarding customization
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { getRepositoryFactory } from '@/lib/repositories/factory'
import { DatabaseError, NotFoundError, ValidationError } from '../models/database'
import { membershipService } from './membership-service'
import { OnboardingService } from './onboarding-service'
import type { 
  OrganizationOnboardingConfigRow,
  OrganizationOnboardingConfigInsert,
  OrganizationOnboardingConfigUpdate,
  TeamInvitationRow,
  TeamInvitationInsert,
  TeamInvitationUpdate
} from '../models/onboarding-types'

export interface OrganizationTemplate {
  id: string
  name: string
  description: string
  category: 'startup' | 'enterprise' | 'agency' | 'nonprofit' | 'education' | 'custom'
  defaultRoles: Array<{
    name: string
    permissions: string[]
    isDefault?: boolean
  }>
  recommendedSettings: Record<string, unknown>
  onboardingPaths: Array<{
    role: string
    pathId: string
    isRequired: boolean
  }>
}

export interface TeamInvitationData {
  email: string
  role: string
  customMessage?: string
  onboardingPathOverride?: string
}

export interface OrganizationOnboardingConfig {
  organizationId: string
  welcomeMessage: string
  branding: {
    primaryColor?: string
    logoUrl?: string
    customCss?: string
  }
  customContent: Array<{
    id: string
    type: 'welcome' | 'tutorial' | 'resource'
    title: string
    content: string
    order: number
  }>
  roleConfigurations: Array<{
    role: string
    onboardingPath: string
    customizations: Record<string, unknown>
    mentorAssignment?: {
      enabled: boolean
      autoAssign: boolean
      mentorRole?: string
    }
    additionalResources: Array<{
      title: string
      url: string
      type: 'documentation' | 'video' | 'tutorial'
    }>
    completionCriteria: {
      requiredSteps: string[]
      timeLimit?: number
      passingScore?: number
    }
  }>
  mandatoryModules: string[]
  completionRequirements: {
    minimumSteps: number
    requiredModules: string[]
    timeLimit?: number
  }
  notificationSettings: {
    welcomeEmail: boolean
    progressReminders: boolean
    completionCelebration: boolean
    mentorNotifications: boolean
  }
}

export interface OrganizationOnboardingServiceResult<T> {
  data?: T
  error?: string
  code?: string
}

export class OrganizationOnboardingService {
  private getRepositoryFactory() {
    return getRepositoryFactory()
  }

  /**
   * Get available organization templates
   */
  async getOrganizationTemplates(): Promise<OrganizationOnboardingServiceResult<OrganizationTemplate[]>> {
    try {
      // For now, return predefined templates
      // In the future, these could be stored in the database
      const templates: OrganizationTemplate[] = [
        {
          id: 'startup',
          name: 'Startup Team',
          description: 'Perfect for small, agile teams with flexible roles',
          category: 'startup',
          defaultRoles: [
            { name: 'Founder', permissions: ['admin', 'manage_team', 'manage_billing'], isDefault: true },
            { name: 'Developer', permissions: ['develop', 'deploy'] },
            { name: 'Designer', permissions: ['design', 'review'] },
            { name: 'Marketing', permissions: ['marketing', 'analytics'] }
          ],
          recommendedSettings: {
            welcomeMessage: 'Welcome to our startup! Let\'s build something amazing together.',
            primaryColor: '#8b5cf6',
            welcomeEmail: true,
            progressReminders: true,
            completionCelebration: true,
            mentorNotifications: false,
            minimumSteps: 3,
            timeLimit: 14
          },
          onboardingPaths: [
            { role: 'Founder', pathId: 'founder-onboarding', isRequired: true },
            { role: 'Developer', pathId: 'developer-onboarding', isRequired: true },
            { role: 'Designer', pathId: 'designer-onboarding', isRequired: true },
            { role: 'Marketing', pathId: 'marketing-onboarding', isRequired: false }
          ]
        },
        {
          id: 'enterprise',
          name: 'Enterprise Organization',
          description: 'Structured onboarding for large organizations with formal processes',
          category: 'enterprise',
          defaultRoles: [
            { name: 'Administrator', permissions: ['admin', 'manage_team', 'manage_billing', 'audit'], isDefault: true },
            { name: 'Manager', permissions: ['manage_team', 'view_analytics'] },
            { name: 'Senior Developer', permissions: ['develop', 'deploy', 'review', 'mentor'] },
            { name: 'Developer', permissions: ['develop'] },
            { name: 'Analyst', permissions: ['analytics', 'reporting'] },
            { name: 'User', permissions: ['basic_access'] }
          ],
          recommendedSettings: {
            welcomeMessage: 'Welcome to our organization. Please complete all required training modules.',
            primaryColor: '#1e40af',
            welcomeEmail: true,
            progressReminders: true,
            completionCelebration: true,
            mentorNotifications: true,
            minimumSteps: 8,
            timeLimit: 30,
            mandatoryModules: ['security-training', 'compliance-overview', 'company-policies']
          },
          onboardingPaths: [
            { role: 'Administrator', pathId: 'admin-onboarding', isRequired: true },
            { role: 'Manager', pathId: 'manager-onboarding', isRequired: true },
            { role: 'Senior Developer', pathId: 'senior-dev-onboarding', isRequired: true },
            { role: 'Developer', pathId: 'developer-onboarding', isRequired: true },
            { role: 'Analyst', pathId: 'analyst-onboarding', isRequired: true },
            { role: 'User', pathId: 'basic-onboarding', isRequired: true }
          ]
        },
        {
          id: 'agency',
          name: 'Creative Agency',
          description: 'Client-focused team structure for creative and consulting work',
          category: 'agency',
          defaultRoles: [
            { name: 'Agency Owner', permissions: ['admin', 'manage_team', 'manage_billing', 'client_management'], isDefault: true },
            { name: 'Account Manager', permissions: ['client_management', 'project_management'] },
            { name: 'Creative Director', permissions: ['design', 'review', 'creative_approval'] },
            { name: 'Designer', permissions: ['design', 'collaborate'] },
            { name: 'Developer', permissions: ['develop', 'deploy'] },
            { name: 'Freelancer', permissions: ['collaborate', 'submit_work'] }
          ],
          recommendedSettings: {
            welcomeMessage: 'Welcome to our creative team! Let\'s create amazing work for our clients.',
            primaryColor: '#f59e0b',
            welcomeEmail: true,
            progressReminders: true,
            completionCelebration: true,
            mentorNotifications: true,
            minimumSteps: 5,
            timeLimit: 21
          },
          onboardingPaths: [
            { role: 'Agency Owner', pathId: 'owner-onboarding', isRequired: true },
            { role: 'Account Manager', pathId: 'account-manager-onboarding', isRequired: true },
            { role: 'Creative Director', pathId: 'creative-director-onboarding', isRequired: true },
            { role: 'Designer', pathId: 'designer-onboarding', isRequired: true },
            { role: 'Developer', pathId: 'developer-onboarding', isRequired: true },
            { role: 'Freelancer', pathId: 'freelancer-onboarding', isRequired: false }
          ]
        },
        {
          id: 'education',
          name: 'Educational Institution',
          description: 'Academic-focused structure for schools and training organizations',
          category: 'education',
          defaultRoles: [
            { name: 'Administrator', permissions: ['admin', 'manage_courses', 'manage_users'], isDefault: true },
            { name: 'Instructor', permissions: ['teach', 'grade', 'manage_content'] },
            { name: 'Teaching Assistant', permissions: ['assist', 'grade'] },
            { name: 'Student', permissions: ['learn', 'submit'] },
            { name: 'Guest', permissions: ['view_content'] }
          ],
          recommendedSettings: {
            welcomeMessage: 'Welcome to our learning community! We\'re here to support your educational journey.',
            primaryColor: '#059669',
            welcomeEmail: true,
            progressReminders: true,
            completionCelebration: true,
            mentorNotifications: true,
            minimumSteps: 4,
            timeLimit: 7
          },
          onboardingPaths: [
            { role: 'Administrator', pathId: 'admin-onboarding', isRequired: true },
            { role: 'Instructor', pathId: 'instructor-onboarding', isRequired: true },
            { role: 'Teaching Assistant', pathId: 'ta-onboarding', isRequired: true },
            { role: 'Student', pathId: 'student-onboarding', isRequired: true },
            { role: 'Guest', pathId: 'guest-onboarding', isRequired: false }
          ]
        }
      ]

      return { data: templates }
    } catch (error) {
      console.error('Error getting organization templates:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization templates',
        code: 'GET_TEMPLATES_ERROR'
      }
    }
  }

  /**
   * Create organization onboarding configuration
   */
  async createOrganizationOnboardingConfig(
    config: OrganizationOnboardingConfig,
    createdBy: string
  ): Promise<OrganizationOnboardingServiceResult<OrganizationOnboardingConfigRow>> {
    try {
      const configData: OrganizationOnboardingConfigInsert = {
        organization_id: config.organizationId,
        welcome_message: config.welcomeMessage,
        branding_assets: config.branding as Record<string, unknown>,
        custom_content: config.customContent as unknown as Record<string, unknown>,
        role_configurations: config.roleConfigurations as unknown as Record<string, unknown>,
        mandatory_modules: config.mandatoryModules,
        completion_requirements: config.completionRequirements,
        notification_settings: config.notificationSettings,
        integration_settings: {},
        is_active: true
      }

      const { data, error } = await this.db
        .from('organization_onboarding_configs')
        .insert(configData)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to create organization onboarding config', error)
      }

      // Log the configuration creation
      await this.logOnboardingActivity(
        createdBy,
        config.organizationId,
        'organization_onboarding_config.created',
        'organization_onboarding_config',
        data.id,
        {
          roleCount: config.roleConfigurations.length,
          mandatoryModulesCount: config.mandatoryModules.length,
          hasCustomBranding: !!config.branding.primaryColor || !!config.branding.logoUrl
        }
      )

      return { data }
    } catch (error) {
      console.error('Error creating organization onboarding config:', error)
      
      if (error instanceof DatabaseError && error.message.includes('duplicate')) {
        return {
          error: 'Organization onboarding configuration already exists',
          code: 'CONFIG_EXISTS'
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to create organization onboarding config',
        code: 'CREATE_CONFIG_ERROR'
      }
    }
  }

  /**
   * Get organization onboarding configuration
   */
  async getOrganizationOnboardingConfig(
    organizationId: string
  ): Promise<OrganizationOnboardingServiceResult<OrganizationOnboardingConfigRow>> {
    try {
      const { data, error } = await this.db
        .from('organization_onboarding_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: 'Organization onboarding configuration not found',
            code: 'CONFIG_NOT_FOUND'
          }
        }
        throw new DatabaseError('Failed to get organization onboarding config', error)
      }

      return { data }
    } catch (error) {
      console.error('Error getting organization onboarding config:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization onboarding config',
        code: 'GET_CONFIG_ERROR'
      }
    }
  }

  /**
   * Update organization onboarding configuration
   */
  async updateOrganizationOnboardingConfig(
    organizationId: string,
    updates: Partial<OrganizationOnboardingConfig>,
    updatedBy: string
  ): Promise<OrganizationOnboardingServiceResult<OrganizationOnboardingConfigRow>> {
    try {
      const updateData: OrganizationOnboardingConfigUpdate = {}

      if (updates.welcomeMessage !== undefined) {
        updateData.welcome_message = updates.welcomeMessage
      }
      if (updates.branding !== undefined) {
        updateData.branding_assets = updates.branding as Record<string, unknown>
      }
      if (updates.customContent !== undefined) {
        updateData.custom_content = updates.customContent as unknown as Record<string, unknown>
      }
      if (updates.roleConfigurations !== undefined) {
        updateData.role_configurations = updates.roleConfigurations as unknown as Record<string, unknown>
      }
      if (updates.mandatoryModules !== undefined) {
        updateData.mandatory_modules = updates.mandatoryModules
      }
      if (updates.completionRequirements !== undefined) {
        updateData.completion_requirements = updates.completionRequirements
      }
      if (updates.notificationSettings !== undefined) {
        updateData.notification_settings = updates.notificationSettings
      }

      const { data, error } = await this.db
        .from('organization_onboarding_configs')
        .update(updateData)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        throw new DatabaseError('Failed to update organization onboarding config', error)
      }

      // Log the configuration update
      await this.logOnboardingActivity(
        updatedBy,
        organizationId,
        'organization_onboarding_config.updated',
        'organization_onboarding_config',
        data.id,
        {
          updatedFields: Object.keys(updates)
        }
      )

      return { data }
    } catch (error) {
      console.error('Error updating organization onboarding config:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to update organization onboarding config',
        code: 'UPDATE_CONFIG_ERROR'
      }
    }
  }

  /**
   * Send team invitations with role-based onboarding paths
   */
  async sendTeamInvitations(
    organizationId: string,
    invitations: TeamInvitationData[],
    invitedBy: string
  ): Promise<OrganizationOnboardingServiceResult<TeamInvitationRow[]>> {
    try {
      const results: TeamInvitationRow[] = []
      const errors: string[] = []

      // Get organization onboarding config to determine paths
      const configResult = await this.getOrganizationOnboardingConfig(organizationId)
      const orgConfig = configResult.data

      for (const invitation of invitations) {
        try {
          // Determine onboarding path for the role
          let onboardingPath = invitation.onboardingPathOverride
          
          if (!onboardingPath && orgConfig) {
            const roleConfig = orgConfig.role_configurations as any
            const roleConfigArray = Array.isArray(roleConfig) ? roleConfig : []
            const matchingRole = roleConfigArray.find((config: any) => config.role === invitation.role)
            onboardingPath = matchingRole?.onboardingPath
          }

          // Create invitation using membership service
          const invitationResult = await membershipService.inviteUser({
            organizationId,
            email: invitation.email,
            roleId: invitation.role, // Note: This assumes role name = role ID
            invitedBy
          })

          if (invitationResult.error) {
            errors.push(`${invitation.email}: ${invitationResult.error}`)
            continue
          }

          // Create team invitation record with onboarding info
          const teamInvitationData: TeamInvitationInsert = {
            organization_id: organizationId,
            invited_by: invitedBy,
            email: invitation.email,
            role: invitation.role,
            custom_message: invitation.customMessage || null,
            onboarding_path_override: onboardingPath || null,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            accepted_at: null,
            onboarding_session_id: null,
            metadata: {
              membershipInvitationId: invitationResult.data?.id,
              hasCustomMessage: !!invitation.customMessage,
              hasOnboardingPathOverride: !!onboardingPath
            }
          }

          const { data: teamInvitation, error: teamInvitationError } = await this.db
            .from('team_invitations')
            .insert(teamInvitationData)
            .select()
            .single()

          if (teamInvitationError) {
            throw new DatabaseError('Failed to create team invitation', teamInvitationError)
          }

          results.push(teamInvitation)

          // Log the invitation
          await this.logOnboardingActivity(
            invitedBy,
            organizationId,
            'team_invitation.sent',
            'team_invitation',
            teamInvitation.id,
            {
              email: invitation.email,
              role: invitation.role,
              hasCustomMessage: !!invitation.customMessage,
              onboardingPath
            }
          )

        } catch (error) {
          console.error(`Error sending invitation to ${invitation.email}:`, error)
          errors.push(`${invitation.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (errors.length > 0 && results.length === 0) {
        return {
          error: `Failed to send all invitations: ${errors.join(', ')}`,
          code: 'ALL_INVITATIONS_FAILED'
        }
      }

      if (errors.length > 0) {
        return {
          data: results,
          error: `Some invitations failed: ${errors.join(', ')}`,
          code: 'PARTIAL_INVITATIONS_FAILED'
        }
      }

      return { data: results }
    } catch (error) {
      console.error('Error sending team invitations:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to send team invitations',
        code: 'SEND_INVITATIONS_ERROR'
      }
    }
  }

  /**
   * Get team invitations for an organization
   */
  async getTeamInvitations(
    organizationId: string,
    status?: 'pending' | 'accepted' | 'expired' | 'revoked'
  ): Promise<OrganizationOnboardingServiceResult<TeamInvitationRow[]>> {
    try {
      let query = this.db
        .from('team_invitations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        throw new DatabaseError('Failed to get team invitations', error)
      }

      return { data: data || [] }
    } catch (error) {
      console.error('Error getting team invitations:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get team invitations',
        code: 'GET_INVITATIONS_ERROR'
      }
    }
  }

  /**
   * Accept team invitation and start onboarding
   */
  async acceptTeamInvitation(
    invitationId: string,
    userId: string
  ): Promise<OrganizationOnboardingServiceResult<{ 
    invitation: TeamInvitationRow
    onboardingSession?: any 
  }>> {
    try {
      // Get the invitation
      const { data: invitation, error: invitationError } = await this.db
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single()

      if (invitationError) {
        throw new DatabaseError('Failed to get team invitation', invitationError)
      }

      if (invitation.status !== 'pending') {
        return {
          error: 'Invitation is no longer valid',
          code: 'INVITATION_NOT_PENDING'
        }
      }

      if (new Date() > new Date(invitation.expires_at)) {
        // Mark as expired
        await this.db
          .from('team_invitations')
          .update({ status: 'expired' })
          .eq('id', invitationId)

        return {
          error: 'Invitation has expired',
          code: 'INVITATION_EXPIRED'
        }
      }

      // Accept the membership invitation first
      const membershipInvitationId = invitation.metadata?.membershipInvitationId as string
      if (membershipInvitationId) {
        const acceptResult = await membershipService.acceptInvitation(membershipInvitationId, userId)
        if (acceptResult.error) {
          return {
            error: acceptResult.error,
            code: acceptResult.code || 'MEMBERSHIP_ACCEPT_ERROR'
          }
        }
      }

      // Update invitation status
      const { data: updatedInvitation, error: updateError } = await this.db
        .from('team_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single()

      if (updateError) {
        throw new DatabaseError('Failed to update team invitation', updateError)
      }

      // Start onboarding session if path is specified
      let onboardingSession = null
      if (invitation.onboarding_path_override) {
        const onboardingService = new OnboardingService()
        const sessionResult = await OnboardingService.initializeOnboarding(userId, {
          userId,
          organizationId: invitation.organization_id,
          userRole: invitation.role
        })

        if (sessionResult) {
          onboardingSession = sessionResult
        }
      }

      // Log the acceptance
      await this.logOnboardingActivity(
        userId,
        invitation.organization_id,
        'team_invitation.accepted',
        'team_invitation',
        invitationId,
        {
          email: invitation.email,
          role: invitation.role,
          onboardingSessionId: onboardingSession?.id
        }
      )

      return { 
        data: { 
          invitation: updatedInvitation,
          onboardingSession 
        } 
      }
    } catch (error) {
      console.error('Error accepting team invitation:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to accept team invitation',
        code: 'ACCEPT_INVITATION_ERROR'
      }
    }
  }

  /**
   * Revoke team invitation
   */
  async revokeTeamInvitation(
    invitationId: string,
    revokedBy: string
  ): Promise<OrganizationOnboardingServiceResult<TeamInvitationRow>> {
    try {
      const { data: invitation, error: getError } = await this.db
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single()

      if (getError) {
        throw new DatabaseError('Failed to get team invitation', getError)
      }

      if (invitation.status !== 'pending') {
        return {
          error: 'Only pending invitations can be revoked',
          code: 'INVITATION_NOT_PENDING'
        }
      }

      // Update invitation status
      const { data: updatedInvitation, error: updateError } = await this.db
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)
        .select()
        .single()

      if (updateError) {
        throw new DatabaseError('Failed to revoke team invitation', updateError)
      }

      // Revoke membership invitation if it exists
      const membershipInvitationId = invitation.metadata?.membershipInvitationId as string
      if (membershipInvitationId) {
        await membershipService.revokeInvitation(membershipInvitationId, revokedBy)
      }

      // Log the revocation
      await this.logOnboardingActivity(
        revokedBy,
        invitation.organization_id,
        'team_invitation.revoked',
        'team_invitation',
        invitationId,
        {
          email: invitation.email,
          role: invitation.role
        }
      )

      return { data: updatedInvitation }
    } catch (error) {
      console.error('Error revoking team invitation:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to revoke team invitation',
        code: 'REVOKE_INVITATION_ERROR'
      }
    }
  }

  /**
   * Get organization onboarding analytics
   */
  async getOrganizationOnboardingAnalytics(
    organizationId: string,
    period?: { start: string; end: string }
  ): Promise<OrganizationOnboardingServiceResult<any>> {
    try {
      // Get basic metrics
      let sessionQuery = this.db
        .from('onboarding_sessions')
        .select('*')
        .eq('organization_id', organizationId)

      let invitationQuery = this.db
        .from('team_invitations')
        .select('*')
        .eq('organization_id', organizationId)

      if (period) {
        sessionQuery = sessionQuery
          .gte('created_at', period.start)
          .lte('created_at', period.end)
        
        invitationQuery = invitationQuery
          .gte('created_at', period.start)
          .lte('created_at', period.end)
      }

      const [sessionsResult, invitationsResult] = await Promise.all([
        sessionQuery,
        invitationQuery
      ])

      if (sessionsResult.error) {
        throw new DatabaseError('Failed to get onboarding sessions', sessionsResult.error)
      }

      if (invitationsResult.error) {
        throw new DatabaseError('Failed to get team invitations', invitationsResult.error)
      }

      const sessions = sessionsResult.data || []
      const invitations = invitationsResult.data || []

      // Calculate metrics
      const totalSessions = sessions.length
      const completedSessions = sessions.filter((s: any) => s.status === 'completed').length
      const activeSessions = sessions.filter((s: any) => s.status === 'active').length
      const abandonedSessions = sessions.filter((s: any) => s.status === 'abandoned').length

      const totalInvitations = invitations.length
      const acceptedInvitations = invitations.filter((i: any) => i.status === 'accepted').length
      const pendingInvitations = invitations.filter((i: any) => i.status === 'pending').length
      const expiredInvitations = invitations.filter((i: any) => i.status === 'expired').length

      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
      const acceptanceRate = totalInvitations > 0 ? (acceptedInvitations / totalInvitations) * 100 : 0

      const averageCompletionTime = completedSessions > 0 
        ? sessions
            .filter((s: any) => s.status === 'completed' && s.completed_at)
            .reduce((sum: number, s: any) => {
              const start = new Date(s.started_at).getTime()
              const end = new Date(s.completed_at!).getTime()
              return sum + (end - start)
            }, 0) / completedSessions / (1000 * 60 * 60 * 24) // Convert to days
        : 0

      const analytics = {
        organizationId,
        period: period || { start: null, end: null },
        metrics: {
          totalSessions,
          completedSessions,
          activeSessions,
          abandonedSessions,
          completionRate,
          averageCompletionTime,
          totalInvitations,
          acceptedInvitations,
          pendingInvitations,
          expiredInvitations,
          acceptanceRate
        },
        sessionsByRole: this.groupByRole(sessions),
        invitationsByRole: this.groupByRole(invitations)
      }

      return { data: analytics }
    } catch (error) {
      console.error('Error getting organization onboarding analytics:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get organization onboarding analytics',
        code: 'GET_ANALYTICS_ERROR'
      }
    }
  }

  /**
   * Helper method to group data by role
   */
  private groupByRole(items: any[]): Record<string, number> {
    return items.reduce((acc, item) => {
      const role = item.role || item.session_type || 'unknown'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})
  }

  /**
   * Log onboarding activity to audit log
   */
  private async logOnboardingActivity(
    userId: string,
    organizationId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.db.from('audit_logs').insert({
        user_id: userId,
        organization_id: organizationId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log onboarding activity:', error)
      // Don't throw error for logging failures
    }
  }
}

// Export singleton instance
export const organizationOnboardingService = new OrganizationOnboardingService()