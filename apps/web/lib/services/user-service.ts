/**
 * UserService - Comprehensive user account management service
 * Migrated to use Drizzle repositories and Zod validation
 * Provides CRUD operations for user profiles, preferences, and account management
 */

import { UserRepository } from '@/lib/repositories/user-repository'
import { getRepositoryFactory } from '@/lib/repositories/factory'
import { auditService } from './audit-service'
import { 
  validateCreateUser, 
  validateUpdateUser, 
  validateUserPreferences,
  type CreateUser,
  type UpdateUser,
  type UserPreferences,
  type UserApiResponse
} from '@/lib/validation/schemas/users'
import { 
  ValidationError, 
  NotFoundError, 
  DatabaseError, 
  ErrorCode 
} from '@/lib/errors/custom-errors'
import type { User } from '@/lib/db/schema'
import { userSyncService } from './user-sync'
import { z } from 'zod'

export interface UpdateUserProfileData {
  firstName?: string
  lastName?: string
  avatarUrl?: string
  preferences?: Record<string, any>
}

export interface UserServiceResult<T> {
  data?: T
  error?: string
  code?: string
}

export class UserService {
  private userRepository: UserRepository

  constructor() {
    const factory = getRepositoryFactory()
    this.userRepository = factory.createUserRepository()
  }

  /**
   * Get user by ID with structured error handling
   */
  async getUser(id: string): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      const user = await this.userRepository.findById(id)
      
      if (!user) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...user,
        fullName: this.buildFullName(user.firstName, user.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: !user.preferences?.deactivated
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error getting user:', error)
      
      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to get user',
        code: 'GET_USER_ERROR'
      }
    }
  }

  /**
   * Get user by Clerk ID with validation
   */
  async getUserByClerkId(clerkUserId: string): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate input
      if (!clerkUserId || typeof clerkUserId !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid Clerk user ID is required')
      }

      const user = await this.userRepository.findByClerkId(clerkUserId)
      
      if (!user) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...user,
        fullName: this.buildFullName(user.firstName, user.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: !user.preferences?.deactivated
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error getting user by Clerk ID:', error)
      
      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to get user',
        code: 'GET_USER_ERROR'
      }
    }
  }

  /**
   * Update user profile information with comprehensive validation
   */
  async updateUserProfile(id: string, profileData: UpdateUserProfileData): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate input parameters
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Validate the update data using Zod schema
      const validatedData = validateUpdateUser(profileData)

      // Check if user exists
      const existingUser = await this.userRepository.findById(id)
      if (!existingUser) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Store previous values for audit logging
      const previousValues = {
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        avatarUrl: existingUser.avatarUrl
      }

      // Update the user using repository
      const updatedUser = await this.userRepository.update(id, validatedData)

      // Log the profile update with audit service
      await auditService.logEvent({
        userId: id,
        action: 'user.profile.updated',
        resourceType: 'user',
        resourceId: id,
        severity: 'low',
        metadata: {
          updatedFields: Object.keys(profileData),
          previousValues,
          newValues: validatedData
        }
      })

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...updatedUser,
        fullName: this.buildFullName(updatedUser.firstName, updatedUser.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: !updatedUser.preferences?.deactivated
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error updating user profile:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to update user profile',
        code: 'UPDATE_PROFILE_ERROR'
      }
    }
  }

  /**
   * Update user preferences with validation
   */
  async updateUserPreferences(id: string, preferences: Partial<UserPreferences>): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate input parameters
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Validate preferences using Zod schema
      const validatedPreferences = validateUserPreferences(preferences)

      // Get current user to merge preferences
      const existingUser = await this.userRepository.findById(id)
      if (!existingUser) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Merge new preferences with existing ones
      const currentPreferences = existingUser.preferences as Record<string, unknown> || {}
      const mergedPreferences = {
        ...currentPreferences,
        ...validatedPreferences
      }

      // Update user with merged preferences using repository
      const updatedUser = await this.userRepository.updatePreferences(id, mergedPreferences)

      // Log the preferences update with audit service
      await auditService.logEvent({
        userId: id,
        action: 'user.preferences.updated',
        resourceType: 'user',
        resourceId: id,
        severity: 'low',
        metadata: {
          updatedPreferences: Object.keys(preferences),
          newValues: validatedPreferences,
          previousValues: currentPreferences
        }
      })

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...updatedUser,
        fullName: this.buildFullName(updatedUser.firstName, updatedUser.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: !updatedUser.preferences?.deactivated
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error updating user preferences:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to update user preferences',
        code: 'UPDATE_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Get user preferences with defaults and validation
   */
  async getUserPreferences(id: string): Promise<UserServiceResult<UserPreferences>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      const user = await this.userRepository.findById(id)
      
      if (!user) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Get preferences using repository method
      const userPreferences = await this.userRepository.getPreferences(id)

      // Provide default preferences structure
      const defaultPreferences: UserPreferences = {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          inApp: true,
          marketing: false
        },
        accessibility: {
          highContrast: false,
          reducedMotion: false,
          screenReader: false,
          fontSize: 'medium'
        },
        privacy: {
          profileVisibility: 'organization',
          activityTracking: true,
          dataSharing: false
        }
      }

      // Merge user preferences with defaults
      const mergedPreferences = {
        ...defaultPreferences,
        ...userPreferences
      }

      // Validate the merged preferences
      const validatedPreferences = validateUserPreferences(mergedPreferences)

      return { data: validatedPreferences }
    } catch (error) {
      console.error('Error getting user preferences:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to get user preferences',
        code: 'GET_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Reset user preferences to defaults with validation
   */
  async resetUserPreferences(id: string): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Check if user exists
      const existingUser = await this.userRepository.findById(id)
      if (!existingUser) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Define default preferences
      const defaultPreferences: UserPreferences = {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          inApp: true,
          marketing: false
        },
        accessibility: {
          highContrast: false,
          reducedMotion: false,
          screenReader: false,
          fontSize: 'medium'
        },
        privacy: {
          profileVisibility: 'organization',
          activityTracking: true,
          dataSharing: false
        }
      }

      // Validate default preferences
      const validatedPreferences = validateUserPreferences(defaultPreferences)

      // Update user preferences using repository
      const updatedUser = await this.userRepository.updatePreferences(id, validatedPreferences)

      // Log the preferences reset with audit service
      await auditService.logEvent({
        userId: id,
        action: 'user.preferences.reset',
        resourceType: 'user',
        resourceId: id,
        severity: 'low',
        metadata: {
          resetToDefaults: true,
          previousPreferences: existingUser.preferences
        }
      })

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...updatedUser,
        fullName: this.buildFullName(updatedUser.firstName, updatedUser.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: !updatedUser.preferences?.deactivated
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error resetting user preferences:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to reset user preferences',
        code: 'RESET_PREFERENCES_ERROR'
      }
    }
  }

  /**
   * Get user with organization memberships using repository
   */
  async getUserWithMemberships(id: string): Promise<UserServiceResult<any>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      const userWithMemberships = await this.userRepository.findWithMemberships(id)
      
      if (!userWithMemberships) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Transform to include additional computed fields
      const enrichedUser = {
        ...userWithMemberships,
        fullName: this.buildFullName(userWithMemberships.firstName, userWithMemberships.lastName),
        membershipCount: userWithMemberships.memberships.length,
        isActive: !userWithMemberships.preferences?.deactivated,
        activeOrganizations: userWithMemberships.memberships
          .filter(m => m.status === 'active')
          .map(m => m.organization)
      }

      return { data: enrichedUser }
    } catch (error) {
      console.error('Error getting user with memberships:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to get user with memberships',
        code: 'GET_USER_MEMBERSHIPS_ERROR'
      }
    }
  }

  /**
   * Sync user from Clerk (create or update) with validation
   */
  async syncUserFromClerk(clerkUser: any): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate Clerk user data
      if (!clerkUser || !clerkUser.id) {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid Clerk user data is required')
      }

      const syncResult = await userSyncService.syncUser(clerkUser)
      
      if (syncResult.error) {
        throw new DatabaseError(ErrorCode.DATABASE_ERROR, syncResult.error)
      }

      // Log the sync event with audit service
      await auditService.logEvent({
        userId: syncResult.user.id,
        action: 'user.synced_from_clerk',
        resourceType: 'user',
        resourceId: syncResult.user.id,
        severity: 'low',
        metadata: {
          clerkUserId: clerkUser.id,
          syncType: syncResult.created ? 'created' : 'updated'
        }
      })

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...syncResult.user,
        fullName: this.buildFullName(syncResult.user.firstName, syncResult.user.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: !syncResult.user.preferences?.deactivated
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error syncing user from Clerk:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof DatabaseError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to sync user from Clerk',
        code: 'USER_SYNC_ERROR'
      }
    }
  }

  /**
   * Deactivate user account (soft delete) with validation
   */
  async deactivateUser(id: string): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Check if user exists
      const existingUser = await this.userRepository.findById(id)
      if (!existingUser) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Use repository deactivate method
      const updatedUser = await this.userRepository.deactivate(id)

      // Log the deactivation with audit service
      await auditService.logEvent({
        userId: id,
        action: 'user.account.deactivated',
        resourceType: 'user',
        resourceId: id,
        severity: 'medium',
        metadata: {
          deactivatedAt: new Date().toISOString(),
          previousStatus: existingUser.preferences?.accountStatus || 'active'
        }
      })

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...updatedUser,
        fullName: this.buildFullName(updatedUser.firstName, updatedUser.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: false // User is now deactivated
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error deactivating user:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to deactivate user',
        code: 'DEACTIVATE_USER_ERROR'
      }
    }
  }

  /**
   * Reactivate user account with validation
   */
  async reactivateUser(id: string): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Check if user exists
      const existingUser = await this.userRepository.findById(id)
      if (!existingUser) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Use repository reactivate method
      const updatedUser = await this.userRepository.reactivate(id)

      // Log the reactivation with audit service
      await auditService.logEvent({
        userId: id,
        action: 'user.account.reactivated',
        resourceType: 'user',
        resourceId: id,
        severity: 'medium',
        metadata: {
          reactivatedAt: new Date().toISOString(),
          previousStatus: 'deactivated'
        }
      })

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...updatedUser,
        fullName: this.buildFullName(updatedUser.firstName, updatedUser.lastName),
        membershipCount: 0, // Will be populated by separate query if needed
        isActive: true // User is now active
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error reactivating user:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to reactivate user',
        code: 'REACTIVATE_USER_ERROR'
      }
    }
  }

  /**
   * Check if user account is active with validation
   */
  async isUserActive(id: string): Promise<UserServiceResult<boolean>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      const user = await this.userRepository.findById(id)
      
      if (!user) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      const isActive = !user.preferences?.deactivated
      return { data: isActive }
    } catch (error) {
      console.error('Error checking user status:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to check user status',
        code: 'CHECK_USER_STATUS_ERROR'
      }
    }
  }

  /**
   * Create a new user with comprehensive validation
   */
  async createUser(userData: CreateUser): Promise<UserServiceResult<UserApiResponse>> {
    try {
      // Validate user data using Zod schema
      const validatedData = validateCreateUser(userData)

      // Create user using repository
      const newUser = await this.userRepository.create(validatedData)

      // Log the user creation with audit service
      await auditService.logEvent({
        userId: newUser.id,
        action: 'user.created',
        resourceType: 'user',
        resourceId: newUser.id,
        severity: 'low',
        metadata: {
          email: newUser.email,
          clerkUserId: newUser.clerkUserId,
          createdAt: newUser.createdAt
        }
      })

      // Transform to API response format
      const userResponse: UserApiResponse = {
        ...newUser,
        fullName: this.buildFullName(newUser.firstName, newUser.lastName),
        membershipCount: 0,
        isActive: true
      }

      return { data: userResponse }
    } catch (error) {
      console.error('Error creating user:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to create user',
        code: 'CREATE_USER_ERROR'
      }
    }
  }

  /**
   * Delete user permanently (hard delete) - use with caution
   */
  async deleteUser(id: string): Promise<UserServiceResult<boolean>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      // Check if user exists
      const existingUser = await this.userRepository.findById(id)
      if (!existingUser) {
        throw new NotFoundError(ErrorCode.USER_NOT_FOUND, 'User not found')
      }

      // Log the deletion before removing the user
      await auditService.logEvent({
        userId: id,
        action: 'user.deleted',
        resourceType: 'user',
        resourceId: id,
        severity: 'high',
        metadata: {
          email: existingUser.email,
          clerkUserId: existingUser.clerkUserId,
          deletedAt: new Date().toISOString()
        }
      })

      // Delete user using repository
      await this.userRepository.delete(id)

      return { data: true }
    } catch (error) {
      console.error('Error deleting user:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to delete user',
        code: 'DELETE_USER_ERROR'
      }
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(id: string): Promise<UserServiceResult<any>> {
    try {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new ValidationError(ErrorCode.VALIDATION_ERROR, 'Valid user ID is required')
      }

      const stats = await this.userRepository.getUserStats(id)
      return { data: stats }
    } catch (error) {
      console.error('Error getting user stats:', error)
      
      if (error instanceof ValidationError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      if (error instanceof NotFoundError) {
        return {
          error: error.message,
          code: error.code
        }
      }

      return {
        error: error instanceof Error ? error.message : 'Failed to get user stats',
        code: 'GET_USER_STATS_ERROR'
      }
    }
  }

  /**
   * Helper method to build full name from first and last name
   */
  private buildFullName(firstName: string | null, lastName: string | null): string | null {
    if (!firstName && !lastName) return null
    if (!firstName) return lastName
    if (!lastName) return firstName
    return `${firstName} ${lastName}`.trim()
  }
}

// Export singleton instance
export const userService = new UserService()