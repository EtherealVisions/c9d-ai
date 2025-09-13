/**
 * UserService - Comprehensive user account management service
 * Provides CRUD operations for user profiles, preferences, and account management
 */

import { createTypedSupabaseClient, DatabaseError, NotFoundError, ValidationError } from '../models/database'
import { validateUpdateUser, validateCreateUser } from '../models/schemas'
import type { User } from '../models/types'
import { UserSyncService } from './user-sync'

export interface UpdateUserProfileData {
  firstName?: string
  lastName?: string
  avatarUrl?: string
  preferences?: Record<string, any>
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  timezone?: string
  notifications?: {
    email?: boolean
    push?: boolean
    marketing?: boolean
  }
  dashboard?: {
    defaultView?: string
    itemsPerPage?: number
  }
  [key: string]: any
}

export interface UserServiceResult<T> {
  data?: T
  error?: string
  code?: string
}

export class UserService {
  private db = createTypedSupabaseClient()

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<UserServiceResult<User>> {
    try {
      const user = await this.db.getUser(id)
      
      if (!user) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      return { data: user }
    } catch (error) {
      console.error('Error getting user:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get user',
        code: 'GET_USER_ERROR'
      }
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkUserId: string): Promise<UserServiceResult<User>> {
    try {
      const user = await this.db.getUserByClerkId(clerkUserId)
      
      if (!user) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      return { data: user }
    } catch (error) {
      console.error('Error getting user by Clerk ID:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get user',
        code: 'GET_USER_ERROR'
      }
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(id: string, profileData: UpdateUserProfileData): Promise<UserServiceResult<User>> {
    try {
      // Validate the update data
      const validatedData = validateUpdateUser(profileData)

      // Check if user exists
      const existingUser = await this.db.getUser(id)
      if (!existingUser) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      // Update the user
      const updatedUser = await this.db.updateUser(id, validatedData)

      // Log the profile update
      await this.logUserActivity(id, 'user.profile.updated', 'user', id, {
        updatedFields: Object.keys(profileData),
        previousValues: {
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          avatarUrl: existingUser.avatarUrl
        }
      })

      return { data: updatedUser }
    } catch (error) {
      console.error('Error updating user profile:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: 'VALIDATION_ERROR'
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to update user profile',
        code: 'UPDATE_PROFILE_ERROR'
      }
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(id: string, preferences: Partial<UserPreferences>): Promise<UserServiceResult<User>> {
    try {
      // Get current user to merge preferences
      const existingUser = await this.db.getUser(id)
      if (!existingUser) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      // Merge new preferences with existing ones
      const mergedPreferences = {
        ...existingUser.preferences,
        ...preferences
      }

      // Update user with merged preferences
      const updatedUser = await this.db.updateUser(id, {
        preferences: mergedPreferences
      })

      // Log the preferences update
      await this.logUserActivity(id, 'user.preferences.updated', 'user', id, {
        updatedPreferences: Object.keys(preferences),
        newValues: preferences
      })

      return { data: updatedUser }
    } catch (error) {
      console.error('Error updating user preferences:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to update user preferences',
        code: 'UPDATE_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Get user preferences with defaults
   */
  async getUserPreferences(id: string): Promise<UserServiceResult<UserPreferences>> {
    try {
      const user = await this.db.getUser(id)
      
      if (!user) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      // Provide default preferences structure
      const defaultPreferences: UserPreferences = {
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          marketing: false
        },
        dashboard: {
          defaultView: 'overview',
          itemsPerPage: 10
        }
      }

      // Merge user preferences with defaults
      const preferences = {
        ...defaultPreferences,
        ...user.preferences
      }

      return { data: preferences }
    } catch (error) {
      console.error('Error getting user preferences:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get user preferences',
        code: 'GET_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Reset user preferences to defaults
   */
  async resetUserPreferences(id: string): Promise<UserServiceResult<User>> {
    try {
      const defaultPreferences: UserPreferences = {
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          marketing: false
        },
        dashboard: {
          defaultView: 'overview',
          itemsPerPage: 10
        }
      }

      const updatedUser = await this.db.updateUser(id, {
        preferences: defaultPreferences
      })

      // Log the preferences reset
      await this.logUserActivity(id, 'user.preferences.reset', 'user', id, {
        resetToDefaults: true
      })

      return { data: updatedUser }
    } catch (error) {
      console.error('Error resetting user preferences:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to reset user preferences',
        code: 'RESET_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Get user with organization memberships
   */
  async getUserWithMemberships(id: string): Promise<UserServiceResult<any>> {
    try {
      const userWithMemberships = await this.db.getUserWithMemberships(id)
      
      if (!userWithMemberships) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      return { data: userWithMemberships }
    } catch (error) {
      console.error('Error getting user with memberships:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to get user with memberships',
        code: 'GET_USER_MEMBERSHIPS_ERROR'
      }
    }
  }

  /**
   * Sync user from Clerk (create or update)
   */
  async syncUserFromClerk(clerkUser: any): Promise<UserServiceResult<User>> {
    try {
      const syncResult = await UserSyncService.syncUser(clerkUser)
      
      if (syncResult.error) {
        return {
          error: syncResult.error,
          code: 'USER_SYNC_ERROR'
        }
      }

      return { data: syncResult.user }
    } catch (error) {
      console.error('Error syncing user from Clerk:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to sync user from Clerk',
        code: 'USER_SYNC_ERROR'
      }
    }
  }

  /**
   * Delete user account (soft delete by updating status)
   */
  async deactivateUser(id: string): Promise<UserServiceResult<User>> {
    try {
      // Get current user
      const existingUser = await this.db.getUser(id)
      if (!existingUser) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      // Update preferences to mark as deactivated
      const updatedUser = await this.db.updateUser(id, {
        preferences: {
          ...existingUser.preferences,
          accountStatus: 'deactivated',
          deactivatedAt: new Date().toISOString()
        }
      })

      // Log the deactivation
      await this.logUserActivity(id, 'user.account.deactivated', 'user', id, {
        deactivatedAt: new Date().toISOString()
      })

      return { data: updatedUser }
    } catch (error) {
      console.error('Error deactivating user:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to deactivate user',
        code: 'DEACTIVATE_USER_ERROR'
      }
    }
  }

  /**
   * Reactivate user account
   */
  async reactivateUser(id: string): Promise<UserServiceResult<User>> {
    try {
      // Get current user
      const existingUser = await this.db.getUser(id)
      if (!existingUser) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      // Remove deactivation status from preferences
      const updatedPreferences = { ...existingUser.preferences }
      delete updatedPreferences.accountStatus
      delete updatedPreferences.deactivatedAt

      const updatedUser = await this.db.updateUser(id, {
        preferences: updatedPreferences
      })

      // Log the reactivation
      await this.logUserActivity(id, 'user.account.reactivated', 'user', id, {
        reactivatedAt: new Date().toISOString()
      })

      return { data: updatedUser }
    } catch (error) {
      console.error('Error reactivating user:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to reactivate user',
        code: 'REACTIVATE_USER_ERROR'
      }
    }
  }

  /**
   * Check if user account is active
   */
  async isUserActive(id: string): Promise<UserServiceResult<boolean>> {
    try {
      const user = await this.db.getUser(id)
      
      if (!user) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      const isActive = user.preferences?.accountStatus !== 'deactivated'
      return { data: isActive }
    } catch (error) {
      console.error('Error checking user status:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to check user status',
        code: 'CHECK_USER_STATUS_ERROR'
      }
    }
  }

  /**
   * Log user activity to audit log
   */
  private async logUserActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.db.createAuditLog({
        userId,
        organizationId: null,
        action,
        resource: resourceType,
        resourceId,
        details: metadata,
        ipAddress: null,
        userAgent: null
      })
    } catch (error) {
      console.error('Failed to log user activity:', error)
      // Don't throw error for logging failures
    }
  }
}

// Export singleton instance
export const userService = new UserService()