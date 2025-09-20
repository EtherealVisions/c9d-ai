/**
 * Organization Schema Definition for Drizzle ORM
 * 
 * This file defines the organizations and organization_memberships table schemas
 * for the Account Management system with proper relationships and constraints.
 */

import { pgTable, uuid, varchar, timestamp, jsonb, index, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { roles } from './roles'
import { invitations } from './invitations'
import { auditLogs } from './audit'

/**
 * Organizations table schema
 * Stores tenant organization information
 */
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 1000 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  metadata: jsonb('metadata').notNull().default({}),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance optimization
  slugIdx: index('organizations_slug_idx').on(table.slug),
  nameIdx: index('organizations_name_idx').on(table.name),
  createdAtIdx: index('organizations_created_at_idx').on(table.createdAt)
}))

/**
 * Organization memberships table schema
 * Links users to organizations with roles and status
 */
export const organizationMemberships = pgTable('organization_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'inactive', 'pending'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Composite primary key alternative (if needed)
  // userOrgPk: primaryKey(table.userId, table.organizationId),
  
  // Indexes for performance optimization
  userIdIdx: index('org_memberships_user_id_idx').on(table.userId),
  organizationIdIdx: index('org_memberships_organization_id_idx').on(table.organizationId),
  roleIdIdx: index('org_memberships_role_id_idx').on(table.roleId),
  statusIdx: index('org_memberships_status_idx').on(table.status),
  userOrgIdx: index('org_memberships_user_org_idx').on(table.userId, table.organizationId)
}))

/**
 * Organization relations definition
 */
export const organizationsRelations = relations(organizations, ({ many }) => ({
  // Organization can have multiple memberships
  memberships: many(organizationMemberships),
  
  // Organization can have multiple roles
  roles: many(roles),
  
  // Organization can have multiple invitations
  invitations: many(invitations),
  
  // Organization can have multiple audit log entries
  auditLogs: many(auditLogs)
}))

/**
 * Organization membership relations definition
 */
export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  // Membership belongs to one user
  user: one(users, {
    fields: [organizationMemberships.userId],
    references: [users.id]
  }),
  
  // Membership belongs to one organization
  organization: one(organizations, {
    fields: [organizationMemberships.organizationId],
    references: [organizations.id]
  }),
  
  // Membership has one role
  role: one(roles, {
    fields: [organizationMemberships.roleId],
    references: [roles.id]
  })
}))

/**
 * Type definitions derived from schema
 */
export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type OrganizationUpdate = Partial<Omit<NewOrganization, 'id' | 'slug' | 'createdAt' | 'updatedAt'>>

export type OrganizationMembership = typeof organizationMemberships.$inferSelect
export type NewOrganizationMembership = typeof organizationMemberships.$inferInsert
export type OrganizationMembershipUpdate = Partial<Omit<NewOrganizationMembership, 'id' | 'createdAt' | 'updatedAt'>>

/**
 * Extended organization type with populated relations
 */
export type OrganizationWithMembers = Organization & {
  memberships: Array<{
    id: string
    status: string
    joinedAt: Date
    user: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      avatarUrl: string | null
    }
    role: {
      id: string
      name: string
      permissions: string[]
    }
  }>
}

/**
 * Extended membership type with populated relations
 */
export type MembershipWithRelations = OrganizationMembership & {
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
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
}