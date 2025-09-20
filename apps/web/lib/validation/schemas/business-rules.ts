/**
 * Business Rules Validation Schemas
 * 
 * This file contains complex business rule validation schemas that combine
 * multiple entities and enforce business logic constraints across the system.
 */

import { z } from 'zod'

// Complex business rule schemas
export const membershipRulesSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  
  // Business rule validations
  membershipConstraints: z.object({
    maxMembershipsPerUser: z.number().int().min(1).max(100).default(10),
    maxMembersPerOrganization: z.number().int().min(1).max(10000).default(1000),
    requiresApproval: z.boolean().default(false),
    allowDuplicateRoles: z.boolean().default(false),
    minimumRoleLevel: z.number().int().min(0).max(10).default(0)
  }).default({})
}).refine(
  async (data) => {
    // Custom business rule: User cannot have more than one admin role per organization
    // This would be implemented with actual database checks
    return true
  },
  'Business rule validation failed'
)

export const rolePermissionRulesSchema = z.object({
  roleId: z.string().uuid(),
  permissions: z.array(z.string()),
  organizationId: z.string().uuid(),
  
  // Business rule validations
  permissionConstraints: z.object({
    maxPermissionsPerRole: z.number().int().min(1).max(100).default(50),
    requiredPermissions: z.array(z.string()).default([]),
    forbiddenCombinations: z.array(z.array(z.string())).default([]),
    hierarchyRules: z.object({
      inheritFromParent: z.boolean().default(false),
      canDelegateToChildren: z.boolean().default(true),
      maxHierarchyDepth: z.number().int().min(1).max(10).default(5)
    }).default({})
  }).default({})
}).refine(
  (data) => {
    // Business rule: Certain permissions cannot be combined
    const { permissions, permissionConstraints } = data
    const { forbiddenCombinations } = permissionConstraints
    
    for (const forbiddenCombo of forbiddenCombinations) {
      const hasAllForbidden = forbiddenCombo.every(perm => permissions.includes(perm))
      if (hasAllForbidden) {
        return false
      }
    }
    return true
  },
  'Forbidden permission combination detected'
).refine(
  (data) => {
    // Business rule: Required permissions must be present
    const { permissions, permissionConstraints } = data
    const { requiredPermissions } = permissionConstraints
    
    return requiredPermissions.every(perm => permissions.includes(perm))
  },
  'Required permissions are missing'
)

export const invitationBusinessRulesSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid(),
  invitedBy: z.string().uuid(),
  
  // Business rule validations
  invitationConstraints: z.object({
    maxPendingInvitationsPerOrg: z.number().int().min(1).max(1000).default(100),
    maxInvitationsPerUser: z.number().int().min(1).max(50).default(10),
    allowExternalDomains: z.boolean().default(true),
    allowedDomains: z.array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).default([]),
    blockedDomains: z.array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).default([]),
    requireApprovalForExternalUsers: z.boolean().default(false),
    maxInvitationDuration: z.number().int().min(1).max(30).default(7) // days
  }).default({})
}).refine(
  (data) => {
    // Business rule: Check domain restrictions
    const { email, invitationConstraints } = data
    const { allowExternalDomains, allowedDomains, blockedDomains } = invitationConstraints
    
    const emailDomain = email.split('@')[1]
    
    // Check blocked domains
    if (blockedDomains.includes(emailDomain)) {
      return false
    }
    
    // Check allowed domains if specified
    if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
      return false
    }
    
    return true
  },
  'Email domain is not allowed'
)

export const onboardingBusinessRulesSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  pathId: z.string().uuid(),
  sessionType: z.enum(['individual', 'team_admin', 'team_member']),
  
  // Business rule validations
  onboardingConstraints: z.object({
    maxConcurrentSessions: z.number().int().min(1).max(10).default(3),
    maxSessionDuration: z.number().int().min(60).max(43200).default(14400), // minutes (max 30 days)
    allowSessionPause: z.boolean().default(true),
    maxPauseDuration: z.number().int().min(60).max(10080).default(1440), // minutes (max 1 week)
    requirePrerequisites: z.boolean().default(true),
    allowSkipSteps: z.boolean().default(false),
    maxSkippedSteps: z.number().int().min(0).max(10).default(2),
    requireCompletionCertificate: z.boolean().default(false)
  }).default({})
}).refine(
  async (data) => {
    // Business rule: Check if user meets prerequisites
    // This would involve database checks for user's current state
    return true
  },
  'User does not meet onboarding prerequisites'
)

export const contentAccessRulesSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  contentId: z.string().uuid(),
  contentType: z.enum(['text', 'html', 'markdown', 'video', 'image', 'interactive', 'template']),
  
  // Business rule validations
  accessConstraints: z.object({
    subscriptionTierRequired: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
    rolePermissionsRequired: z.array(z.string()).default([]),
    organizationFeaturesRequired: z.array(z.string()).default([]),
    userProgressRequired: z.object({
      minimumCompletedSteps: z.number().int().min(0).default(0),
      requiredAchievements: z.array(z.string().uuid()).default([]),
      minimumScore: z.number().min(0).max(100).optional()
    }).default({}),
    timeRestrictions: z.object({
      availableFrom: z.date().optional(),
      availableUntil: z.date().optional(),
      timezone: z.string().default('UTC')
    }).optional(),
    deviceRestrictions: z.object({
      allowedDevices: z.array(z.enum(['desktop', 'tablet', 'mobile'])).default(['desktop', 'tablet', 'mobile']),
      requireSecureConnection: z.boolean().default(false)
    }).default({})
  }).default({})
}).refine(
  (data) => {
    // Business rule: Check time restrictions
    const { accessConstraints } = data
    const { timeRestrictions } = accessConstraints
    
    if (timeRestrictions) {
      const now = new Date()
      if (timeRestrictions.availableFrom && now < timeRestrictions.availableFrom) {
        return false
      }
      if (timeRestrictions.availableUntil && now > timeRestrictions.availableUntil) {
        return false
      }
    }
    
    return true
  },
  'Content is not available at this time'
)

export const achievementEligibilityRulesSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  
  // Business rule validations
  eligibilityConstraints: z.object({
    minimumTimeSpent: z.number().int().min(0).default(0), // minutes
    maximumAttempts: z.number().int().min(1).max(10).default(3),
    requiredStepCompletion: z.number().min(0).max(100).default(100), // percentage
    requiredScore: z.number().min(0).max(100).optional(),
    prerequisiteAchievements: z.array(z.string().uuid()).default([]),
    cooldownPeriod: z.number().int().min(0).default(0), // minutes between attempts
    validityPeriod: z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }).optional()
  }).default({})
}).refine(
  (data) => {
    // Business rule: Check validity period
    const { eligibilityConstraints } = data
    const { validityPeriod } = eligibilityConstraints
    
    if (validityPeriod) {
      const now = new Date()
      if (validityPeriod.startDate && now < validityPeriod.startDate) {
        return false
      }
      if (validityPeriod.endDate && now > validityPeriod.endDate) {
        return false
      }
    }
    
    return true
  },
  'Achievement is not available during this period'
)

export const dataRetentionRulesSchema = z.object({
  entityType: z.enum(['user', 'organization', 'session', 'progress', 'invitation', 'content']),
  entityId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  
  // Business rule validations
  retentionConstraints: z.object({
    retentionPeriod: z.number().int().min(1).max(3650).default(365), // days
    archiveAfter: z.number().int().min(1).max(1825).default(90), // days
    anonymizeAfter: z.number().int().min(1).max(2555).default(730), // days
    hardDeleteAfter: z.number().int().min(365).max(3650).default(2555), // days
    requiresUserConsent: z.boolean().default(true),
    allowDataExport: z.boolean().default(true),
    encryptionRequired: z.boolean().default(true),
    auditTrailRequired: z.boolean().default(true)
  }).default({})
}).refine(
  (data) => {
    // Business rule: Ensure proper retention hierarchy
    const { retentionConstraints } = data
    const { archiveAfter, anonymizeAfter, hardDeleteAfter } = retentionConstraints
    
    return archiveAfter <= anonymizeAfter && anonymizeAfter <= hardDeleteAfter
  },
  'Invalid retention period hierarchy'
)

export const auditLogRulesSchema = z.object({
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  
  // Business rule validations
  auditConstraints: z.object({
    sensitivityLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    retentionPeriod: z.number().int().min(30).max(2555).default(365), // days
    requiresEncryption: z.boolean().default(true),
    requiresDigitalSignature: z.boolean().default(false),
    allowedViewers: z.array(z.enum(['user', 'admin', 'auditor', 'system'])).default(['admin', 'auditor']),
    complianceRequirements: z.array(z.enum(['gdpr', 'hipaa', 'sox', 'pci', 'iso27001'])).default([])
  }).default({})
}).refine(
  (data) => {
    // Business rule: High sensitivity actions require encryption
    const { auditConstraints } = data
    const { sensitivityLevel, requiresEncryption } = auditConstraints
    
    if (['high', 'critical'].includes(sensitivityLevel) && !requiresEncryption) {
      return false
    }
    
    return true
  },
  'High sensitivity actions must be encrypted'
)

// Composite business rule schema for complex operations
export const complexOperationRulesSchema = z.object({
  operationType: z.enum(['user_onboarding', 'role_assignment', 'content_access', 'data_export', 'account_deletion']),
  context: z.object({
    userId: z.string().uuid(),
    organizationId: z.string().uuid(),
    initiatedBy: z.string().uuid(),
    metadata: z.record(z.unknown()).default({})
  }),
  
  // Combined business rules
  operationConstraints: z.object({
    requiresApproval: z.boolean().default(false),
    approvalWorkflow: z.array(z.object({
      role: z.string(),
      required: z.boolean().default(true),
      timeout: z.number().int().min(1).max(168).default(24) // hours
    })).default([]),
    riskAssessment: z.object({
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
      mitigationRequired: z.boolean().default(false),
      additionalVerification: z.boolean().default(false)
    }).default({}),
    complianceChecks: z.array(z.object({
      regulation: z.string(),
      requirement: z.string(),
      status: z.enum(['pending', 'passed', 'failed']).default('pending')
    })).default([]),
    auditRequirements: z.object({
      logLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('basic'),
      notifyStakeholders: z.boolean().default(false),
      generateReport: z.boolean().default(false)
    }).default({})
  }).default({})
}).refine(
  (data) => {
    // Business rule: High-risk operations require approval
    const { operationConstraints } = data
    const { riskAssessment, requiresApproval } = operationConstraints
    
    if (['high', 'critical'].includes(riskAssessment.riskLevel) && !requiresApproval) {
      return false
    }
    
    return true
  },
  'High-risk operations require approval workflow'
)

// Type exports
export type MembershipRules = z.infer<typeof membershipRulesSchema>
export type RolePermissionRules = z.infer<typeof rolePermissionRulesSchema>
export type InvitationBusinessRules = z.infer<typeof invitationBusinessRulesSchema>
export type OnboardingBusinessRules = z.infer<typeof onboardingBusinessRulesSchema>
export type ContentAccessRules = z.infer<typeof contentAccessRulesSchema>
export type AchievementEligibilityRules = z.infer<typeof achievementEligibilityRulesSchema>
export type DataRetentionRules = z.infer<typeof dataRetentionRulesSchema>
export type AuditLogRules = z.infer<typeof auditLogRulesSchema>
export type ComplexOperationRules = z.infer<typeof complexOperationRulesSchema>

// Validation helper functions
export function validateMembershipRules(data: unknown): MembershipRules {
  return membershipRulesSchema.parse(data)
}

export function validateRolePermissionRules(data: unknown): RolePermissionRules {
  return rolePermissionRulesSchema.parse(data)
}

export function validateInvitationBusinessRules(data: unknown): InvitationBusinessRules {
  return invitationBusinessRulesSchema.parse(data)
}

export function validateOnboardingBusinessRules(data: unknown): OnboardingBusinessRules {
  return onboardingBusinessRulesSchema.parse(data)
}

export function validateContentAccessRules(data: unknown): ContentAccessRules {
  return contentAccessRulesSchema.parse(data)
}

export function validateAchievementEligibilityRules(data: unknown): AchievementEligibilityRules {
  return achievementEligibilityRulesSchema.parse(data)
}

export function validateDataRetentionRules(data: unknown): DataRetentionRules {
  return dataRetentionRulesSchema.parse(data)
}

export function validateAuditLogRules(data: unknown): AuditLogRules {
  return auditLogRulesSchema.parse(data)
}

export function validateComplexOperationRules(data: unknown): ComplexOperationRules {
  return complexOperationRulesSchema.parse(data)
}

// Safe parsing functions
export function safeValidateMembershipRules(data: unknown) {
  return membershipRulesSchema.safeParse(data)
}

export function safeValidateRolePermissionRules(data: unknown) {
  return rolePermissionRulesSchema.safeParse(data)
}

export function safeValidateInvitationBusinessRules(data: unknown) {
  return invitationBusinessRulesSchema.safeParse(data)
}

export function safeValidateOnboardingBusinessRules(data: unknown) {
  return onboardingBusinessRulesSchema.safeParse(data)
}

export function safeValidateContentAccessRules(data: unknown) {
  return contentAccessRulesSchema.safeParse(data)
}

export function safeValidateAchievementEligibilityRules(data: unknown) {
  return achievementEligibilityRulesSchema.safeParse(data)
}

export function safeValidateDataRetentionRules(data: unknown) {
  return dataRetentionRulesSchema.safeParse(data)
}

export function safeValidateAuditLogRules(data: unknown) {
  return auditLogRulesSchema.safeParse(data)
}

export function safeValidateComplexOperationRules(data: unknown) {
  return complexOperationRulesSchema.safeParse(data)
}