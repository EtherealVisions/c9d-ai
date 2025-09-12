import { createSupabaseClient, type User } from '../database'
import type { User as ClerkUser } from '@clerk/nextjs/server'

export interface UserSyncResult {
  user: User
  isNew: boolean
  error?: string
}

export class UserSyncService {
  private supabase = createSupabaseClient()

  /**
   * Synchronizes a Clerk user with the local database
   * Creates a new user if they don't exist, updates if they do
   */
  async syncUser(clerkUser: ClerkUser): Promise<UserSyncResult> {
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

      const userData = {
        clerk_user_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        first_name: clerkUser.firstName || null,
        last_name: clerkUser.lastName || null,
        avatar_url: clerkUser.imageUrl || null,
        preferences: existingUser?.preferences || {}
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

        return {
          user: updatedUser,
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

        // Log user creation
        await this.logUserActivity(newUser.id, 'user.created', 'user', newUser.id)

        return {
          user: newUser,
          isNew: true
        }
      }
    } catch (error) {
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

      return user
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
}

// Export singleton instance
export const userSyncService = new UserSyncService()