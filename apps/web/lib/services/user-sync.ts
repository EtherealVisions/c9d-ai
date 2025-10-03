import { getRepositoryFactory } from '@/lib/repositories/factory'
import type { User } from '../models/types'
import type { User as ClerkUser } from '@clerk/nextjs/server'
import type { UserResource } from '@clerk/types'

export interface UserSyncResult {
  user: User
  isNew: boolean
  error?: string
  syncMetadata?: UserSyncMetadata
}

export interface UserSyncMetadata {
  syncedAt: Date
  source: 'webhook' | 'api' | 'manual'
  changes: string[]
  previousValues?: Record<string, any>
}

export interface AuthEvent {
  id: string
  userId: string
  type: AuthEventType
  metadata: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface UserProfileUpdateData {
  firstName?: string
  lastName?: string
  avatarUrl?: string
  email?: string
  preferences?: Record<string, any>
  customFields?: Record<string, any>
}

export enum AuthEventType {
  SIGN_IN = 'sign_in',
  SIGN_OUT = 'sign_out',
  SIGN_UP = 'sign_up',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  SESSION_CREATED = 'session_created',
  SESSION_ENDED = 'session_ended'
}

export class UserSyncService {
  private getRepositoryFactory() {
    return getRepositoryFactory()
  }

  /**
   * Synchronizes a Clerk user with the local database
   * Creates a new user if they don't exist, updates if they do
   * Enhanced with better change tracking and metadata support
   */
  async syncUser(clerkUser: ClerkUser | UserResource, metadata?: Record<string, any>): Promise<UserSyncResult> {
    try {
      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      // Check if user already exists
      const existingUser = await userRepository.findByClerkId(clerkUser.id)

      // Normalize user data from either ClerkUser or UserResource
      const isUserResource = 'primaryEmailAddress' in clerkUser
      const email = isUserResource 
        ? (clerkUser as UserResource).primaryEmailAddress?.emailAddress || ''
        : (clerkUser as ClerkUser).emailAddresses[0]?.emailAddress || ''
      
      const userData = {
        clerk_user_id: clerkUser.id,
        email,
        first_name: clerkUser.firstName || null,
        last_name: clerkUser.lastName || null,
        avatar_url: clerkUser.imageUrl || null,
        preferences: existingUser?.preferences || {
          onboardingCompleted: false,
          onboardingSteps: {},
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            marketing: false
          }
        }
      }

      if (existingUser) {
        // Update existing user
        const updateData = {
          email,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          avatarUrl: clerkUser.imageUrl || null,
          preferences: userData.preferences
        }
        
        const updatedUser = await userRepository.update(existingUser.id, updateData)
        
        if (!updatedUser) {
          throw new Error('Failed to update user')
        }

        // Log user update event
        await this.logAuthEvent(existingUser.id, AuthEventType.USER_UPDATED, {
          ...metadata,
          updatedFields: Object.keys(updateData),
          clerkUserId: clerkUser.id
        })

        return {
          user: updatedUser,
          isNew: false
        }
      } else {
        // Create new user
        const newUserData = {
          clerkUserId: clerkUser.id,
          email,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          avatarUrl: clerkUser.imageUrl || null,
          preferences: userData.preferences
        }
        
        const newUser = await userRepository.create(newUserData)

        // Log user creation events
        await this.logUserActivity(newUser.id, 'user.created', 'user', newUser.id)
        await this.logAuthEvent(newUser.id, AuthEventType.USER_CREATED, {
          ...metadata,
          clerkUserId: clerkUser.id,
          email: newUserData.email,
          signUpMethod: (isUserResource 
            ? (clerkUser as UserResource).externalAccounts?.length > 0 
            : (clerkUser as ClerkUser).externalAccounts?.length > 0) ? 'social' : 'email'
        })

        return {
          user: newUser,
          isNew: true
        }
      }
    } catch (error) {
      console.error('User sync error:', error)
      return {
        user: {} as User,
        isNew: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Gets a user by their Clerk ID
   */
  async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    try {
      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      return await userRepository.findByClerkId(clerkUserId)
    } catch (error) {
      console.error('Error fetching user by Clerk ID:', error)
      return null
    }
  }

  /**
   * Gets a user with their organization memberships
   */
  async getUserWithMemberships(clerkUserId: string) {
    try {
      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      const user = await userRepository.findByClerkId(clerkUserId)
      if (!user) {
        return null
      }
      
      return await userRepository.findWithMemberships(user.id)
    } catch (error) {
      console.error('Error fetching user with memberships:', error)
      return null
    }
  }

  /**
   * Deletes a user and all associated data
   */
  async deleteUser(clerkUserId: string): Promise<boolean> {
    try {
      const user = await this.getUserByClerkId(clerkUserId)
      if (!user) {
        return false
      }

      // Log user deletion before deleting
      await this.logUserActivity(user.id, 'user.deleted', 'user', user.id)

      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      await userRepository.delete(user.id)

      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }

  /**
   * Logs authentication events for security monitoring
   */
  async logAuthEvent(
    userId: string,
    eventType: AuthEventType,
    metadata: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // TODO: Use AuditLogRepository when created
      // For now, we'll log to console to avoid direct database access
      console.log('[AuthEvent]', {
        userId,
        action: eventType,
        resourceType: 'authentication',
        resourceId: userId,
        metadata: {
          ...metadata,
          eventType,
          timestamp: new Date().toISOString()
        },
        ipAddress,
        userAgent
      })
    } catch (error) {
      console.error('Failed to log auth event:', error)
      // Don't throw error for logging failures
    }
  }

  /**
   * Logs user activity to audit log
   */
  private async logUserActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, any> = {}
  ) {
    try {
      // TODO: Use AuditLogRepository when created
      // For now, we'll log to console to avoid direct database access
      console.log('[UserActivity]', {
        userId,
        action,
        resourceType,
        resourceId,
        metadata,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log user activity:', error)
      // Don't throw error for logging failures
    }
  }

  /**
   * Handles session creation events
   */
  async handleSessionCreated(
    clerkUserId: string,
    sessionId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const user = await this.getUserByClerkId(clerkUserId)
      if (user) {
        await this.logAuthEvent(user.id, AuthEventType.SESSION_CREATED, {
          ...metadata,
          sessionId,
          clerkUserId
        })
      }
    } catch (error) {
      console.error('Failed to handle session created event:', error)
    }
  }

  /**
   * Handles session ended events
   */
  async handleSessionEnded(
    clerkUserId: string,
    sessionId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const user = await this.getUserByClerkId(clerkUserId)
      if (user) {
        await this.logAuthEvent(user.id, AuthEventType.SESSION_ENDED, {
          ...metadata,
          sessionId,
          clerkUserId
        })
      }
    } catch (error) {
      console.error('Failed to handle session ended event:', error)
    }
  }

  /**
   * Updates user's last sign-in timestamp with enhanced session metadata
   */
  async updateLastSignIn(
    clerkUserId: string, 
    sessionMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      const signInData = {
        lastSignInAt: new Date().toISOString(),
        ...(sessionMetadata && { lastSessionMetadata: sessionMetadata })
      }

      // Get user and update preferences
      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      const user = await userRepository.findByClerkId(clerkUserId)
      if (user) {
        const updatedPreferences = {
          ...user.preferences,
          ...signInData
        }
        
        await userRepository.update(user.id, { preferences: updatedPreferences })
      } else {
        console.error('User not found for sign-in update:', clerkUserId)
      }
    } catch (error) {
      console.error('Failed to update last sign-in:', error)
    }
  }

  /**
   * Updates user profile with enhanced change tracking
   * Requirement 6.3: Support custom fields, validation rules, and user metadata collection
   */
  async updateUserProfile(
    clerkUserId: string, 
    profileData: UserProfileUpdateData,
    metadata?: Record<string, any>
  ): Promise<UserSyncResult> {
    try {
      // Get current user to track changes
      const currentUser = await this.getUserByClerkId(clerkUserId)
      if (!currentUser) {
        return {
          user: {} as User,
          isNew: false,
          error: 'User not found'
        }
      }

      // Track what fields are being changed
      const changes: string[] = []
      const previousValues: Record<string, any> = {}

      if (profileData.firstName !== undefined && profileData.firstName !== currentUser.firstName) {
        changes.push('firstName')
        previousValues.firstName = currentUser.firstName
      }
      if (profileData.lastName !== undefined && profileData.lastName !== currentUser.lastName) {
        changes.push('lastName')
        previousValues.lastName = currentUser.lastName
      }
      if (profileData.avatarUrl !== undefined && profileData.avatarUrl !== currentUser.avatarUrl) {
        changes.push('avatarUrl')
        previousValues.avatarUrl = currentUser.avatarUrl
      }
      if (profileData.email !== undefined && profileData.email !== currentUser.email) {
        changes.push('email')
        previousValues.email = currentUser.email
      }

      // Handle preferences updates with deep merge
      let updatedPreferences = currentUser.preferences
      if (profileData.preferences) {
        changes.push('preferences')
        previousValues.preferences = currentUser.preferences
        updatedPreferences = {
          ...currentUser.preferences,
          ...profileData.preferences
        }
      }

      // Handle custom fields (Requirement 6.3)
      if (profileData.customFields) {
        changes.push('customFields')
        previousValues.customFields = currentUser.preferences?.customFields
        updatedPreferences = {
          ...updatedPreferences,
          customFields: {
            ...updatedPreferences?.customFields,
            ...profileData.customFields
          }
        }
      }

      // Update user in database
      const updateData = {
        ...(profileData.firstName !== undefined && { first_name: profileData.firstName }),
        ...(profileData.lastName !== undefined && { last_name: profileData.lastName }),
        ...(profileData.avatarUrl !== undefined && { avatar_url: profileData.avatarUrl }),
        ...(profileData.email !== undefined && { email: profileData.email }),
        preferences: updatedPreferences
      }

      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      const user = await userRepository.findByClerkId(clerkUserId)
      if (!user) {
        throw new Error('User not found for profile update')
      }
      
      const updatedUser = await userRepository.update(user.id, updateData)
      
      // Log profile update event with detailed change tracking
      await this.logAuthEvent(updatedUser.id, AuthEventType.USER_UPDATED, {
        ...metadata,
        changes,
        previousValues,
        source: 'profile_update',
        updatedFields: Object.keys(updateData)
      })

      const syncMetadata: UserSyncMetadata = {
        syncedAt: new Date(),
        source: 'api',
        changes,
        previousValues
      }

      return {
        user: transformUserRow(updatedUser),
        isNew: false,
        syncMetadata
      }
    } catch (error) {
      console.error('User profile update error:', error)
      return {
        user: {} as User,
        isNew: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Bulk update user preferences with validation
   * Requirement 6.3: Support custom fields, validation rules, and user metadata collection
   */
  async updateUserPreferences(
    clerkUserId: string,
    preferences: Record<string, any>,
    validateCustomFields: boolean = true
  ): Promise<UserSyncResult> {
    try {
      const currentUser = await this.getUserByClerkId(clerkUserId)
      if (!currentUser) {
        return {
          user: {} as User,
          isNew: false,
          error: 'User not found'
        }
      }

      // Validate custom fields if enabled (Requirement 6.3)
      if (validateCustomFields && preferences.customFields) {
        const validationResult = this.validateCustomFields(preferences.customFields)
        if (!validationResult.isValid) {
          return {
            user: {} as User,
            isNew: false,
            error: `Custom field validation failed: ${validationResult.errors.join(', ')}`
          }
        }
      }

      // Merge preferences with existing ones
      const updatedPreferences = {
        ...currentUser.preferences,
        ...preferences,
        updatedAt: new Date().toISOString()
      }

      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      const user = await userRepository.findByClerkId(clerkUserId)
      if (!user) {
        throw new Error('User not found for preferences update')
      }
      
      const updatedUser = await userRepository.update(user.id, { preferences: updatedPreferences })
      
      // Log preferences update
      await this.logAuthEvent(updatedUser.id, AuthEventType.USER_UPDATED, {
        action: 'preferences_updated',
        updatedPreferences: Object.keys(preferences),
        hasCustomFields: !!preferences.customFields
      })

      return {
        user: transformUserRow(updatedUser),
        isNew: false,
        syncMetadata: {
          syncedAt: new Date(),
          source: 'api',
          changes: ['preferences']
        }
      }
    } catch (error) {
      console.error('User preferences update error:', error)
      return {
        user: {} as User,
        isNew: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get user analytics and engagement data
   * Requirement 8.1: Provide admin interfaces for user lookup, status management, and account actions
   */
  async getUserAnalytics(clerkUserId: string): Promise<{
    user: User | null
    analytics: {
      signInCount: number
      lastSignInAt: string | null
      accountAge: number
      sessionCount: number
      securityEvents: number
      organizationMemberships: number
    }
    error?: string
  }> {
    try {
      const user = await this.getUserByClerkId(clerkUserId)
      if (!user) {
        return {
          user: null,
          analytics: {
            signInCount: 0,
            lastSignInAt: null,
            accountAge: 0,
            sessionCount: 0,
            securityEvents: 0,
            organizationMemberships: 0
          },
          error: 'User not found'
        }
      }

      // TODO: Implement proper analytics repository methods
      // For now, return mock data to avoid direct database access
      const authEvents: any[] = []
      const membershipCount = 0
      
      console.log('[UserAnalytics] Analytics data needs proper repository implementation')

      const events = authEvents || []
      const signInEvents = events.filter((e: any) => e.action === AuthEventType.SIGN_IN)
      const sessionEvents = events.filter((e: any) => e.action === AuthEventType.SESSION_CREATED)
      const securityEvents = events.filter((e: any) => 
        e.action === AuthEventType.SUSPICIOUS_ACTIVITY || 
        e.action === AuthEventType.ACCOUNT_LOCKED
      )

      const accountAge = Math.floor(
        (new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      const lastSignInAt = user.preferences?.lastSignInAt || null

      return {
        user,
        analytics: {
          signInCount: signInEvents.length,
          lastSignInAt,
          accountAge,
          sessionCount: sessionEvents.length,
          securityEvents: securityEvents.length,
          organizationMemberships: membershipCount || 0
        }
      }
    } catch (error) {
      console.error('Error getting user analytics:', error)
      return {
        user: null,
        analytics: {
          signInCount: 0,
          lastSignInAt: null,
          accountAge: 0,
          sessionCount: 0,
          securityEvents: 0,
          organizationMemberships: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Admin function to manage user account status
   * Requirement 8.1: Provide admin interfaces for user lookup, status management, and account actions
   */
  async updateUserStatus(
    clerkUserId: string,
    status: 'active' | 'suspended' | 'deactivated',
    reason?: string,
    adminUserId?: string
  ): Promise<UserSyncResult> {
    try {
      const user = await this.getUserByClerkId(clerkUserId)
      if (!user) {
        return {
          user: {} as User,
          isNew: false,
          error: 'User not found'
        }
      }

      const updatedPreferences = {
        ...user.preferences,
        accountStatus: status,
        statusUpdatedAt: new Date().toISOString(),
        statusReason: reason,
        statusUpdatedBy: adminUserId
      }

      const repositoryFactory = this.getRepositoryFactory()
      const userRepository = repositoryFactory.createUserRepository()
      
      const updatedUser = await userRepository.update(user.id, { preferences: updatedPreferences })
      
      // Log status change
      await this.logAuthEvent(user.id, AuthEventType.USER_UPDATED, {
        action: 'status_updated',
        newStatus: status,
        previousStatus: user.preferences?.accountStatus || 'active',
        reason,
        adminUserId
      })

      return {
        user: updatedUser,
        isNew: false,
        syncMetadata: {
          syncedAt: new Date(),
          source: 'manual',
          changes: ['accountStatus']
        }
      }
    } catch (error) {
      console.error('User status update error:', error)
      return {
        user: {} as User,
        isNew: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Validate custom fields according to defined rules
   * Requirement 6.3: Support custom fields, validation rules, and user metadata collection
   */
  private validateCustomFields(customFields: Record<string, any>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Define validation rules for custom fields
    const validationRules = {
      department: {
        type: 'string',
        maxLength: 100,
        required: false
      },
      jobTitle: {
        type: 'string',
        maxLength: 100,
        required: false
      },
      phoneNumber: {
        type: 'string',
        pattern: /^\+?[\d\s\-\(\)]+$/,
        required: false
      },
      dateOfBirth: {
        type: 'string',
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        required: false
      },
      emergencyContact: {
        type: 'object',
        required: false,
        properties: {
          name: { type: 'string', maxLength: 100 },
          phone: { type: 'string', pattern: /^\+?[\d\s\-\(\)]+$/ }
        }
      }
    }

    // Validate each custom field
    for (const [fieldName, fieldValue] of Object.entries(customFields)) {
      const rule = validationRules[fieldName as keyof typeof validationRules]
      
      if (!rule) {
        errors.push(`Unknown custom field: ${fieldName}`)
        continue
      }

      if (fieldValue === null || fieldValue === undefined) {
        if (rule.required) {
          errors.push(`Required field missing: ${fieldName}`)
        }
        continue
      }

      // Type validation
      if (rule.type === 'string' && typeof fieldValue !== 'string') {
        errors.push(`Field ${fieldName} must be a string`)
        continue
      }

      if (rule.type === 'object' && typeof fieldValue !== 'object') {
        errors.push(`Field ${fieldName} must be an object`)
        continue
      }

      // String-specific validations
      if (rule.type === 'string' && typeof fieldValue === 'string') {
        if ('maxLength' in rule && rule.maxLength && fieldValue.length > rule.maxLength) {
          errors.push(`Field ${fieldName} exceeds maximum length of ${rule.maxLength}`)
        }

        if ('pattern' in rule && rule.pattern && !rule.pattern.test(fieldValue)) {
          errors.push(`Field ${fieldName} has invalid format`)
        }
      }

      // Object-specific validations
      if (rule.type === 'object' && 'properties' in rule && rule.properties && typeof fieldValue === 'object') {
        for (const [propName, propRule] of Object.entries(rule.properties)) {
          const propValue = fieldValue[propName]
          const typedPropRule = propRule as any
          
          if (typedPropRule.type === 'string' && propValue && typeof propValue !== 'string') {
            errors.push(`Property ${fieldName}.${propName} must be a string`)
          }

          if (typedPropRule.maxLength && propValue && propValue.length > typedPropRule.maxLength) {
            errors.push(`Property ${fieldName}.${propName} exceeds maximum length`)
          }

          if (typedPropRule.pattern && propValue && !typedPropRule.pattern.test(propValue)) {
            errors.push(`Property ${fieldName}.${propName} has invalid format`)
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService()