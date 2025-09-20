/**
 * Schema Validation Utility
 * 
 * This file provides utilities to validate that the Drizzle schemas are correctly defined
 * and can be used for type generation and database operations.
 */

import { schema } from './index'
import type { Schema } from './index'

/**
 * Validate that all required tables are present in the schema
 */
export function validateSchemaStructure(): {
  isValid: boolean
  missingTables: string[]
  presentTables: string[]
  errors: string[]
} {
  const requiredTables = [
    'users',
    'organizations',
    'organizationMemberships',
    'roles',
    'permissions',
    'onboardingPaths',
    'onboardingSteps',
    'onboardingSessions',
    'userProgress',
    'onboardingContent',
    'organizationOnboardingConfigs',
    'invitations',
    'teamInvitations',
    'onboardingMilestones',
    'userAchievements',
    'auditLogs',
    'onboardingAnalytics',
    'systemMetrics',
    'errorLogs'
  ]

  const presentTables: string[] = []
  const missingTables: string[] = []
  const errors: string[] = []

  // Check each required table
  for (const tableName of requiredTables) {
    if (tableName in schema) {
      presentTables.push(tableName)
      
      // Basic validation that the table has expected properties
      const table = (schema as any)[tableName]
      if (!table || typeof table !== 'object') {
        errors.push(`Table ${tableName} is not properly defined`)
      }
    } else {
      missingTables.push(tableName)
    }
  }

  return {
    isValid: missingTables.length === 0 && errors.length === 0,
    missingTables,
    presentTables,
    errors
  }
}

/**
 * Get schema information for debugging
 */
export function getSchemaInfo(): {
  tableCount: number
  relationCount: number
  tableNames: string[]
} {
  const schemaKeys = Object.keys(schema)
  const tableNames = schemaKeys.filter(key => !key.includes('Relations'))
  const relationNames = schemaKeys.filter(key => key.includes('Relations'))

  return {
    tableCount: tableNames.length,
    relationCount: relationNames.length,
    tableNames
  }
}

/**
 * Type-level validation that schema exports are correct
 */
export type SchemaValidation = {
  // Core entities
  users: Schema['users']
  organizations: Schema['organizations']
  organizationMemberships: Schema['organizationMemberships']
  roles: Schema['roles']
  permissions: Schema['permissions']
  
  // Content and onboarding
  onboardingPaths: Schema['onboardingPaths']
  onboardingSteps: Schema['onboardingSteps']
  onboardingSessions: Schema['onboardingSessions']
  userProgress: Schema['userProgress']
  onboardingContent: Schema['onboardingContent']
  organizationOnboardingConfigs: Schema['organizationOnboardingConfigs']
  
  // Invitations and achievements
  invitations: Schema['invitations']
  teamInvitations: Schema['teamInvitations']
  onboardingMilestones: Schema['onboardingMilestones']
  userAchievements: Schema['userAchievements']
  
  // Audit and analytics
  auditLogs: Schema['auditLogs']
  onboardingAnalytics: Schema['onboardingAnalytics']
  systemMetrics: Schema['systemMetrics']
  errorLogs: Schema['errorLogs']
}

// Export validation function for use in tests
export const validateSchema = () => validateSchemaStructure()