/**
 * Valid Test Data Fixtures
 * Provides UUID-compliant and schema-valid test data
 * Addresses validation failures in service and integration tests
 */

/**
 * Generate valid UUIDs for test data
 * Fixes "Invalid UUID" validation errors
 */
export function createTestUUIDs() {
  return {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    orgId: '550e8400-e29b-41d4-a716-446655440001',
    roleId: '550e8400-e29b-41d4-a716-446655440002',
    sessionId: '550e8400-e29b-41d4-a716-446655440003',
    stepId: '550e8400-e29b-41d4-a716-446655440004',
    pathId: '550e8400-e29b-41d4-a716-446655440005',
    invitationId: '550e8400-e29b-41d4-a716-446655440006',
    membershipId: '550e8400-e29b-41d4-a716-446655440007'
  }
}

/**
 * Generate additional UUIDs when needed
 */
export function generateTestUUID(): string {
  return `550e8400-e29b-41d4-a716-${Math.random().toString(16).substr(2, 12)}`
}

/**
 * Create valid user test data
 * Includes all required fields for schema validation
 */
export function createTestUser(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: uuids.userId,
    clerk_user_id: `clerk_${uuids.userId}`,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    avatar_url: 'https://example.com/avatar.jpg',
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create valid organization test data
 * Includes all required fields (slug, metadata, settings)
 */
export function createTestOrganization(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  const name = 'Test Organization'
  
  return {
    id: uuids.orgId,
    name,
    slug: 'test-organization',
    description: 'A test organization',
    avatar_url: 'https://example.com/org-avatar.jpg',
    metadata: {},
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create valid role test data
 * Includes required isSystemRole field
 */
export function createTestRole(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: uuids.roleId,
    name: 'Test Role',
    description: 'A test role for testing purposes',
    permissions: ['user.read', 'user.write'],
    isSystemRole: false,
    organization_id: uuids.orgId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create valid membership test data
 */
export function createTestMembership(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: uuids.membershipId,
    user_id: uuids.userId,
    organization_id: uuids.orgId,
    role_id: uuids.roleId,
    status: 'active',
    joined_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create valid invitation test data
 */
export function createTestInvitation(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: uuids.invitationId,
    organization_id: uuids.orgId,
    role_id: uuids.roleId,
    email: 'invite@example.com',
    invited_by: uuids.userId,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create valid onboarding session test data
 */
export function createTestOnboardingSession(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: uuids.sessionId,
    user_id: uuids.userId,
    organization_id: uuids.orgId,
    path_id: uuids.pathId,
    session_type: 'individual',
    status: 'active',
    current_step_id: uuids.stepId,
    current_step_index: 0,
    progress_percentage: 0,
    time_spent: 0,
    started_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    completed_at: null,
    paused_at: null,
    session_metadata: {},
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create valid onboarding path test data
 */
export function createTestOnboardingPath(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: uuids.pathId,
    name: 'Test Onboarding Path',
    description: 'A test onboarding path',
    target_role: 'developer',
    subscription_tier: 'pro',
    estimated_duration: 60,
    is_active: true,
    prerequisites: [],
    learning_objectives: ['Learn the basics'],
    success_criteria: { completion_rate: 0.8 },
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    steps: [createTestOnboardingStep()],
    ...overrides
  }
}

/**
 * Create valid onboarding step test data
 */
export function createTestOnboardingStep(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: uuids.stepId,
    path_id: uuids.pathId,
    title: 'Test Step',
    description: 'A test onboarding step',
    step_type: 'tutorial',
    step_order: 0,
    estimated_time: 15,
    is_required: true,
    dependencies: [],
    content: { type: 'text', data: 'Test content' },
    interactive_elements: {},
    success_criteria: {},
    validation_rules: {},
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create valid user progress test data
 */
export function createTestUserProgress(overrides: Partial<any> = {}) {
  const uuids = createTestUUIDs()
  
  return {
    id: generateTestUUID(),
    session_id: uuids.sessionId,
    step_id: uuids.stepId,
    user_id: uuids.userId,
    status: 'not_started',
    started_at: null,
    completed_at: null,
    time_spent: 0,
    attempts: 0,
    score: null,
    feedback: {},
    user_actions: {},
    step_result: {},
    errors: {},
    achievements: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Create complete test dataset for complex scenarios
 */
export function createCompleteTestDataset() {
  const uuids = createTestUUIDs()
  
  const user = createTestUser({ id: uuids.userId })
  const organization = createTestOrganization({ id: uuids.orgId })
  const role = createTestRole({ id: uuids.roleId, organization_id: uuids.orgId })
  const membership = createTestMembership({
    id: uuids.membershipId,
    user_id: uuids.userId,
    organization_id: uuids.orgId,
    role_id: uuids.roleId
  })
  const path = createTestOnboardingPath({ id: uuids.pathId })
  const session = createTestOnboardingSession({
    id: uuids.sessionId,
    user_id: uuids.userId,
    organization_id: uuids.orgId,
    path_id: uuids.pathId
  })
  
  return {
    uuids,
    user,
    organization,
    role,
    membership,
    path,
    session
  }
}

/**
 * Create service response helpers
 */
export function createSuccessResponse<T>(data: T) {
  return {
    data,
    error: undefined,
    success: true
  }
}

export function createErrorResponse(error: string, code?: string) {
  return {
    data: undefined,
    error,
    code,
    success: false
  }
}

/**
 * Create mock database responses
 */
export function createMockDatabaseResponse<T>(data: T) {
  return {
    data,
    error: null
  }
}

export function createMockDatabaseError(message: string, code?: string) {
  return {
    data: null,
    error: {
      message,
      code: code || 'DATABASE_ERROR'
    }
  }
}