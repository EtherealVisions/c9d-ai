/**
 * User synchronization service for keeping Clerk and database users in sync
 */

import { createSupabaseClient } from '../database'
import type { UserRow, UserInsert } from '../models'

export interface SyncResult {
  success: boolean
  user?: UserRow
  error?: string
  isNew?: boolean
}

export class UserSyncService {
  private static supabase = createSupabaseClient()

  /**
   * Sync a Clerk user with the database
   */
  static async syncUser(clerkUser: {
    id: string
    emailAddresses: Array<{ emailAddress: string }>
    firstName?: string | null
    lastName?: string | null
    imageUrl?: string | null
  }): Promise<SyncResult> {
    try {
      const email = clerkUser.emailAddresses[0]?.emailAddress
      if (!email) {
        return { success: false, error: 'No email address found' }
      }

      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUser.id)
        .single()

      if (existingUser) {
        // Update existing user
        const { data: updatedUser, error } = await this.supabase
          .from('users')
          .update({
            email,
            first_name: clerkUser.firstName,
            last_name: clerkUser.lastName,
            avatar_url: clerkUser.imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('clerk_user_id', clerkUser.id)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, user: updatedUser, isNew: false }
      } else {
        // Create new user
        const userData: UserInsert = {
          clerk_user_id: clerkUser.id,
          email,
          first_name: clerkUser.firstName ?? null,
          last_name: clerkUser.lastName ?? null,
          avatar_url: clerkUser.imageUrl ?? null,
          preferences: {}
        }

        const { data: newUser, error } = await this.supabase
          .from('users')
          .insert(userData)
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, user: newUser, isNew: true }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get user by Clerk ID
   */
  static async getUserByClerkId(clerkUserId: string): Promise<UserRow | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  /**
   * Delete user by Clerk ID
   */
  static async deleteUser(clerkUserId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('clerk_user_id', clerkUserId)

      if (error) {
        console.error('Error deleting user:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }
}

// Export a default instance for convenience
export const userSyncService = UserSyncService