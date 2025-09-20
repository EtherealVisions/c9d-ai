/**
 * User Schema Definition for Drizzle ORM
 * 
 * This file defines the users table schema and related types for the Account Management system.
 * It includes proper relationships and constraints for user data management.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
// Note: These imports will be available after all schemas are created
// import { organizationMemberships } from './organizations'
// import { invitations } from './invitations'
// import { auditLogs } from './audit'

/**
 * Users table schema
 * Stores individual platform user information with Clerk integration
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  preferences: jsonb('preferences').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  clerkUserIdIdx: index('users_clerk_user_id_idx').on(table.clerkUserId),
  emailIdx: index('users_email_idx').on(table.email),
  createdAtIdx: index('users_created_at_idx').on(table.createdAt)
}))

/**
 * User relations definition
 * Defines relationships between users and other entities
 * Note: Relations will be defined after all schemas are created to avoid circular dependencies
 */
// export const usersRelations = relations(users, ({ many }) => ({
//   // User can have multiple organization memberships
//   memberships: many(organizationMemberships),
//   
//   // User can send multiple invitations
//   sentInvitations: many(invitations, {
//     relationName: 'inviter'
//   }),
//   
//   // User can have multiple audit log entries
//   auditLogs: many(auditLogs)
// }))

/**
 * Type definitions derived from schema
 */
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserUpdate = Partial<Omit<NewUser, 'id' | 'clerkUserId' | 'createdAt' | 'updatedAt'>>

/**
 * Extended user type with populated relations
 */
export type UserWithMemberships = User & {
  memberships: Array<{
    id: string
    roleId: string
    status: string
    joinedAt: Date
    organization: {
      id: string
      name: string
      slug: string
    }
    role: {
      id: string
      name: string
      permissions: string[]
    }
  }>
}