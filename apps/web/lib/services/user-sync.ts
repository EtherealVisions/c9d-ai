import { createSupabaseClient } from '../database'
import type { User, UserRow } from '../models/types'
import { transformUserRow } from '../models/transformers'
import type { User as ClerkUser } from '@clerk/nextjs/server'
import type { UserResource } from '@clerk/types'

export interface UserSyncResult {
  user: User
  isNew: boolean
  error?: string
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
  private supabase = createSupabaseClient()

  /**
   * Synchronizes a Clerk user with the local database
   * Creates a new user if they don't exist, updates if they do
   */
  async syncUser(clerkUser: ClerkUser | UserResource, metadata?: Record<string, any>): Promise<UserSyncResult> {
    try {
      // Check if user already exists
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUser.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        throw new Error(`Failed to fetch user: ${fetchError.message}`)
      }

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
        const { data: updatedUser, error: updateError } = await this.supabase
          .from('users')
          .update(userData)
          .eq('id', existingUser.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Failed to update user: ${updateError.message}`)
        }

        // Log user update event
        await this.logAuthEvent(existingUser.id, AuthEventType.USER_UPDATED, {
          ...metadata,
          updatedFields: Object.keys(userData),
          clerkUserId: clerkUser.id
        })

        return {
          user: transformUserRow(updatedUser),
          isNew: false
        }
      } else {
        // Create new user
        const { data: newUser, error: createError } = await this.supabase
          .from('users')
          .insert(userData)
          .select()
          .single()

        if (createError) {
          throw new Error(`Failed to create user: ${createError.message}`)
        }

        // Log user creation events
        await this.logUserActivity(newUser.id, 'user.created', 'user', newUser.id)
        await this.logAuthEvent(newUser.id, AuthEventType.USER_CREATED, {
          ...metadata,
          clerkUserId: clerkUser.id,
          email: userData.email,
          signUpMethod: (isUserResource 
            ? (clerkUser as UserResource).externalAccounts?.length > 0 
            : (clerkUser as ClerkUser).externalAccounts?.length > 0) ? 'social' : 'email'
        })

        return {
          user: transformUserRow(newUser),
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
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // User not found
        }
        throw new Error(`Failed to fetch user: ${error.message}`)
      }

      return transformUserRow(user)
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
      const { data, error } = await this.supabase
        .from('users')
        .select(`
          *,
          organization_memberships (
            *,
            organization:organizations (*),
            role:roles (*)
          )
        `)
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch user with memberships: ${error.message}`)
      }

      return data
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

      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('clerk_user_id', clerkUserId)

      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`)
      }

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
      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: eventType,
          resource_type: 'authentication',
          resource_id: userId,
          metadata: {
            ...metadata,
            eventType,
            timestamp: new Date().toISOString()
          },
          ip_address: ipAddress,
          user_agent: userAgent
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
      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata
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
   * Updates user's last sign-in timestamp
   */
  async updateLastSignIn(clerkUserId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          preferences: this.supabase.raw(`
            COALESCE(preferences, '{}'::jsonb) || 
            '{"lastSignInAt": "${new Date().toISOString()}"}'::jsonb
          `)
        })
        .eq('clerk_user_id', clerkUserId)

      if (error) {
        console.error('Failed to update last sign-in:', error)
      }
    } catch (error) {
      console.error('Failed to update last sign-in:', error)
    }
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService()