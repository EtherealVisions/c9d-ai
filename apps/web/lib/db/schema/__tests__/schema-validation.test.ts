/**
 * Schema Validation Tests
 * 
 * Tests to verify that all Drizzle schemas are correctly defined and exported.
 */

import { describe, it, expect } from 'vitest'
import { validateSchemaStructure, getSchemaInfo } from '../schema-validation'
import { schema } from '../index'

describe('Drizzle Schema Validation', () => {
  it('should have all required tables defined', () => {
    const validation = validateSchemaStructure()
    
    expect(validation.isValid).toBe(true)
    expect(validation.missingTables).toEqual([])
    expect(validation.errors).toEqual([])
    expect(validation.presentTables.length).toBeGreaterThan(0)
  })

  it('should export schema object with correct structure', () => {
    expect(schema).toBeDefined()
    expect(typeof schema).toBe('object')
    
    // Check that core tables are present
    expect(schema.users).toBeDefined()
    expect(schema.organizations).toBeDefined()
    expect(schema.organizationMemberships).toBeDefined()
    expect(schema.roles).toBeDefined()
    expect(schema.permissions).toBeDefined()
  })

  it('should have content and onboarding tables', () => {
    expect(schema.onboardingPaths).toBeDefined()
    expect(schema.onboardingSteps).toBeDefined()
    expect(schema.onboardingSessions).toBeDefined()
    expect(schema.userProgress).toBeDefined()
    expect(schema.onboardingContent).toBeDefined()
    expect(schema.organizationOnboardingConfigs).toBeDefined()
  })

  it('should have invitation and achievement tables', () => {
    expect(schema.invitations).toBeDefined()
    expect(schema.teamInvitations).toBeDefined()
    expect(schema.onboardingMilestones).toBeDefined()
    expect(schema.userAchievements).toBeDefined()
  })

  it('should have audit and analytics tables', () => {
    expect(schema.auditLogs).toBeDefined()
    expect(schema.onboardingAnalytics).toBeDefined()
    expect(schema.systemMetrics).toBeDefined()
    expect(schema.errorLogs).toBeDefined()
  })

  it('should provide schema information', () => {
    const info = getSchemaInfo()
    
    expect(info.tableCount).toBeGreaterThan(15)
    expect(info.relationCount).toBeGreaterThan(0)
    expect(info.tableNames).toContain('users')
    expect(info.tableNames).toContain('organizations')
    expect(info.tableNames).toContain('roles')
  })

  it('should have proper table structure for users', () => {
    const usersTable = schema.users
    expect(usersTable).toBeDefined()
    
    // Check that the table has the expected structure
    // Note: This is a basic check since Drizzle table objects have complex internal structure
    expect(typeof usersTable).toBe('object')
  })

  it('should have proper table structure for organizations', () => {
    const organizationsTable = schema.organizations
    expect(organizationsTable).toBeDefined()
    expect(typeof organizationsTable).toBe('object')
  })

  it('should include relations in schema', () => {
    // Check that relations are included in the schema export
    expect(schema.usersRelations).toBeDefined()
    expect(schema.organizationsRelations).toBeDefined()
    expect(schema.organizationMembershipsRelations).toBeDefined()
  })
})