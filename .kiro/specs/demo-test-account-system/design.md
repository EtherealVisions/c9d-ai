# Design Document

## Overview

The Demo and Test Account System provides a comprehensive infrastructure for managing demonstration accounts, test accounts, and system administration capabilities. This system enables sales demonstrations, automated testing, product evaluation, and platform administration through pre-configured accounts with realistic sample data.

The system consists of four primary components:
1. **Account Provisioning Service**: Automated creation and configuration of demo and test accounts
2. **Sample Data Management**: Generation and maintenance of realistic content and configurations
3. **Account Lifecycle Manager**: Reset, maintenance, and deletion operations
4. **System Administrator Framework**: Unrestricted platform access for admin@c9d.ai

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Provisioning │  │   Account    │  │    Admin     │      │
│  │     API      │  │ Lifecycle API│  │     API      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Provisioning │  │  Sample Data │  │   Lifecycle  │      │
│  │   Service    │  │   Generator  │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Admin     │  │   Analytics  │  │  Compliance  │      │
│  │   Service    │  │   Tracker    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Account    │  │  Sample Data │  │    Audit     │      │
│  │  Repository  │  │  Repository  │  │     Log      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Account Provisioning Flow**:
   - API receives provisioning request with persona and tier
   - Provisioning Service validates request and creates account
   - Sample Data Generator populates account with realistic data
   - Account Repository persists account and data
   - Audit Log records provisioning operation

2. **Demo Session Flow**:
   - User accesses demo account
   - Analytics Tracker records usage and interactions
   - Account Lifecycle Manager schedules reset operation
   - Reset operation restores account to baseline state

3. **Admin Access Flow**:
   - admin@c9d.ai authenticates
   - Admin Service bypasses standard authorization checks
   - All operations are logged to Audit Log
   - Full platform access is granted

## Integration with Existing Architecture

### Existing Infrastructure Utilization

**TypedSupabaseClient Integration**:
```typescript
// Extend existing TypedSupabaseClient from lib/models/database.ts
import { TypedSupabaseClient, createTypedSupabaseClient } from '@/lib/models/database'

export class DemoAccountService {
  private db: TypedSupabaseClient
  
  constructor() {
    this.db = createTypedSupabaseClient()
  }
  
  async provisionDemoAccount(config: DemoAccountConfig): Promise<User> {
    // Use existing user creation methods
    const user = await this.db.createUser({
      clerkUserId: config.clerkUserId,
      email: config.email,
      firstName: config.firstName,
      lastName: config.lastName,
      preferences: {
        accountType: 'demo',
        persona: config.persona,
        tier: config.tier
      }
    })
    
    return user
  }
}
```

**Clerk Integration Pattern**:
```typescript
// Use existing Clerk patterns from authentication system
import { clerkClient } from '@clerk/nextjs/server'
import { auth } from '@clerk/nextjs/server'

export async function createDemoClerkUser(config: DemoAccountConfig) {
  // Create user in Clerk
  const clerkUser = await clerkClient.users.createUser({
    emailAddress: [config.email],
    firstName: config.firstName,
    lastName: config.lastName,
    password: generateSecurePassword(),
    publicMetadata: {
      accountType: 'demo',
      persona: config.persona,
      tier: config.tier
    }
  })
  
  return clerkUser
}
```

**Redis Caching Integration**:
```typescript
// Use existing Redis connection for caching
import { Redis } from 'ioredis'

export class SampleDataCache {
  private redis: Redis
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!)
  }
  
  async cacheSampleDataSet(persona: string, tier: string, data: SampleDataSet) {
    const key = `sample-data:${persona}:${tier}`
    await this.redis.setex(key, 3600, JSON.stringify(data))
  }
  
  async getSampleDataSet(persona: string, tier: string): Promise<SampleDataSet | null> {
    const key = `sample-data:${persona}:${tier}`
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }
}
```

**Audit Logging Integration**:
```typescript
// Use existing audit_logs table
export async function logAdminOperation(
  userId: string,
  organizationId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata: Record<string, any>
) {
  const db = createTypedSupabaseClient()
  
  await db.createAuditLog({
    userId,
    organizationId,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress: null, // Set from request context
    userAgent: null  // Set from request context
  })
}
```

## Components and Interfaces

### 1. Account Provisioning Service

**Purpose**: Automates creation and configuration of demo and test accounts

**Interface**:
```typescript
interface AccountProvisioningService {
  provisionDemoAccount(config: DemoAccountConfig): Promise<DemoAccount>
  provisionTestAccount(config: TestAccountConfig): Promise<TestAccount>
  bulkProvision(configs: AccountConfig[]): Promise<ProvisioningResult[]>
  validateConfiguration(config: AccountConfig): ValidationResult
}
```

**Key Responsibilities**:
- Validate provisioning configurations
- Create accounts with Clerk integration (using existing patterns)
- Assign appropriate roles and permissions (using existing roles table)
- Trigger sample data generation
- Handle provisioning failures with rollback (using database transactions)

### 2. Sample Data Generator

**Purpose**: Creates realistic, representative content and configurations

**Interface**:
```typescript
interface SampleDataGenerator {
  generateForPersona(persona: PersonaType, tier: SubscriptionTier): SampleDataSet
  generateContent(contentType: ContentType, count: number): Content[]
  generateOrganization(config: OrgConfig): Organization
  generateTeamMembers(count: number, roles: Role[]): TeamMember[]
  generateAnalytics(timeRange: DateRange): AnalyticsData
}
```

**Key Responsibilities**:
- Generate persona-specific content
- Create realistic organizational structures
- Populate team member data
- Generate usage analytics and metrics
- Ensure data quality and consistency

### 3. Account Lifecycle Manager

**Purpose**: Manages account maintenance, reset, and deletion operations

**Interface**:
```typescript
interface AccountLifecycleManager {
  resetAccount(accountId: string): Promise<void>
  scheduleReset(accountId: string, delay: Duration): Promise<void>
  deleteAccount(accountId: string): Promise<void>
  updateSampleData(accountId: string, data: Partial<SampleDataSet>): Promise<void>
  getAccountState(accountId: string): Promise<AccountState>
}
```

**Key Responsibilities**:
- Schedule and execute account resets
- Restore accounts to baseline state
- Delete accounts and associated data
- Update sample data periodically
- Track account state and history

### 4. System Administrator Service

**Purpose**: Provides unrestricted platform access for admin@c9d.ai

**Interface**:
```typescript
interface SystemAdministratorService {
  isSystemAdmin(userId: string): boolean
  bypassAuthorizationCheck(userId: string, resource: Resource): boolean
  accessOrganization(adminId: string, orgId: string): Promise<Organization>
  viewUserData(adminId: string, userId: string): Promise<CompleteUserData>
  executeSystemOperation(adminId: string, operation: SystemOperation): Promise<void>
}
```

**Key Responsibilities**:
- Identify system administrator
- Bypass standard authorization checks
- Grant unrestricted data access
- Log all administrative operations
- Enforce admin-only system operations

### 5. Analytics Tracker

**Purpose**: Monitors demo account usage and collects feedback

**Interface**:
```typescript
interface AnalyticsTracker {
  trackFeatureUsage(accountId: string, feature: string): Promise<void>
  trackNavigation(accountId: string, path: string): Promise<void>
  trackInteraction(accountId: string, interaction: Interaction): Promise<void>
  recordFeedback(accountId: string, feedback: Feedback): Promise<void>
  generateReport(criteria: ReportCriteria): Promise<AnalyticsReport>
}
```

**Key Responsibilities**:
- Track feature usage patterns
- Record navigation and interactions
- Collect user feedback
- Generate usage reports
- Provide conversion analytics

### 6. Compliance Service

**Purpose**: Ensures regulatory compliance for demo and test accounts

**Interface**:
```typescript
interface ComplianceService {
  validateSyntheticData(data: any): ValidationResult
  anonymizeData(data: any): AnonymizedData
  scheduleDataPurge(accountId: string, retentionPeriod: Duration): Promise<void>
  excludeFromDataSubjectQuery(query: DataSubjectQuery): FilteredQuery
  generateComplianceReport(): Promise<ComplianceReport>
}
```

**Key Responsibilities**:
- Validate synthetic data compliance
- Anonymize personal information
- Schedule data retention purges
- Filter demo/test data from queries
- Generate compliance reports

## Data Models

### Account Models

```typescript
interface DemoAccount {
  id: string
  type: 'demo'
  persona: PersonaType
  tier: SubscriptionTier
  clerkUserId: string
  email: string
  organizationId: string
  sampleDataId: string
  baselineStateId: string
  createdAt: Date
  lastResetAt: Date
  nextResetAt: Date
  tags: string[]
}

interface TestAccount {
  id: string
  type: 'test'
  purpose: TestPurpose
  clerkUserId: string
  email: string
  isolationLevel: IsolationLevel
  baselineStateId: string
  createdAt: Date
  tags: string[]
}

interface SystemAdministrator {
  id: string
  clerkUserId: string
  email: 'admin@c9d.ai'
  permissions: 'unrestricted'
  createdAt: Date
}
```

### Sample Data Models

```typescript
interface SampleDataSet {
  id: string
  persona: PersonaType
  tier: SubscriptionTier
  content: Content[]
  organization: Organization
  teamMembers: TeamMember[]
  analytics: AnalyticsData
  workflows: Workflow[]
  collaborations: Collaboration[]
  createdAt: Date
  version: string
}

interface Content {
  id: string
  type: ContentType
  title: string
  body: string
  status: ContentStatus
  authorId: string
  createdAt: Date
  publishedAt?: Date
  tags: string[]
  metadata: Record<string, any>
}

interface Organization {
  id: string
  name: string
  industry: string
  size: OrganizationSize
  settings: OrganizationSettings
  branding: BrandingConfig
  members: OrganizationMember[]
}
```

### Configuration Models

```typescript
interface DemoAccountConfig {
  persona: PersonaType
  tier: SubscriptionTier
  industry?: string
  customizations?: Partial<SampleDataSet>
  resetSchedule?: ResetSchedule
}

interface TestAccountConfig {
  purpose: TestPurpose
  isolationLevel: IsolationLevel
  baselineState: BaselineState
  autoCleanup: boolean
}

interface ProvisioningResult {
  success: boolean
  accountId?: string
  error?: ProvisioningError
  rollbackPerformed: boolean
}
```

### Analytics Models

```typescript
interface AnalyticsEvent {
  id: string
  accountId: string
  accountType: 'demo' | 'test'
  eventType: EventType
  feature?: string
  path?: string
  interaction?: Interaction
  timestamp: Date
  sessionId: string
  metadata: Record<string, any>
}

interface AnalyticsReport {
  accountId: string
  timeRange: DateRange
  featureUsage: FeatureUsageMetrics
  navigationPatterns: NavigationMetrics
  engagementMetrics: EngagementMetrics
  conversionData?: ConversionMetrics
  feedback: Feedback[]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Complete Persona Coverage
*For any* demo account provisioning request, the system should provide access to accounts representing all supported personas (Content Creator, Marketing Manager, Team Lead, Enterprise Admin)
**Validates: Requirements 1.1**

### Property 2: Complete Sample Data Presence
*For any* demo account, the account should contain all required data types: content, organizations, team members, and usage analytics
**Validates: Requirements 1.2**

### Property 3: Tier Feature Access Consistency
*For any* subscription tier and feature combination, the system should correctly enforce feature availability according to tier definitions
**Validates: Requirements 1.3**

### Property 4: Account Reset Restoration
*For any* demo account modifications, the reset operation should restore the account to its original baseline state
**Validates: Requirements 1.4**

### Property 5: Test Account Isolation
*For any* test account operation, the operation should not affect production data or other test accounts
**Validates: Requirements 2.1**

### Property 6: Test Account Baseline State
*For any* test account at test suite start, the account should match the expected baseline state
**Validates: Requirements 2.2**

### Property 7: Test Cleanup Restoration
*For any* test account after test completion, the account should be restored to baseline state with all test data removed
**Validates: Requirements 2.3**

### Property 8: Concurrent Test Isolation
*For any* set of concurrent test operations on different test accounts, the operations should not interfere with each other
**Validates: Requirements 2.4**

### Property 9: Test Account Usage Tracking
*For any* test account activity, the system should record corresponding usage tracking events
**Validates: Requirements 2.5**

### Property 10: Admin Unrestricted Access
*For any* permission check for admin@c9d.ai, the system should grant access without restrictions
**Validates: Requirements 3.2**

### Property 11: Admin Operation Audit Logging
*For any* administrative operation performed by admin@c9d.ai, the system should create a corresponding audit log entry
**Validates: Requirements 3.3**

### Property 12: Admin Complete Data Access
*For any* user data request by admin@c9d.ai, the system should return all fields including sensitive information
**Validates: Requirements 3.4**

### Property 13: System Operation Authorization
*For any* system-level operation request by a non-admin user, the system should reject the request
**Validates: Requirements 3.5**

### Property 14: Provisioning Configuration Match
*For any* provisioning request, the created account should match the specified persona, tier, and sample data configuration
**Validates: Requirements 4.1**

### Property 15: Provisioning Validation Enforcement
*For any* invalid provisioning configuration, the system should reject the request before account creation
**Validates: Requirements 4.2**

### Property 16: Provisioning Rollback Completeness
*For any* failed provisioning operation, the system should remove all partial data and leave no artifacts
**Validates: Requirements 4.3**

### Property 17: Credential Security Requirements
*For any* provisioned account, the generated credentials should meet security requirements (minimum length, complexity, encryption)
**Validates: Requirements 4.4**

### Property 18: Provisioning API Authorization
*For any* provisioning API request without proper authentication, the system should reject the request
**Validates: Requirements 4.5**

### Property 19: Complete Workflow Data Presence
*For any* demo account, the account should contain complete workflow data covering all stages from creation to publication and analytics
**Validates: Requirements 5.2**

### Property 20: Collaboration Data Completeness
*For any* demo account showcasing collaboration, the account should contain all collaboration data types: team interactions, comments, and approval workflows
**Validates: Requirements 5.3**

### Property 21: Bulk Provisioning Correctness
*For any* bulk provisioning operation with multiple account configurations, all accounts should be created correctly according to their specifications
**Validates: Requirements 6.1**

### Property 22: Reset Identity Preservation
*For any* account reset operation, the account ID and core identity should remain unchanged while all data is restored to baseline
**Validates: Requirements 6.3**

### Property 23: Deletion Completeness
*For any* account deletion operation, all associated data and credentials should be removed and inaccessible
**Validates: Requirements 6.4**

### Property 24: Account Operation Authorization and Audit
*For any* account lifecycle operation, the system should enforce proper authorization and create audit log entries
**Validates: Requirements 6.5**

### Property 25: Account Type Tagging
*For any* demo or test account creation, the account should be tagged with appropriate type identifiers
**Validates: Requirements 7.1**

### Property 26: Traffic Classification
*For any* demo or test account activity, the monitoring system should classify the traffic as non-production
**Validates: Requirements 7.2**

### Property 27: Production Data Access Prevention
*For any* demo or test account data access request, the system should prevent access to production data
**Validates: Requirements 7.3**

### Property 28: Audit Log Separation
*For any* demo or test account activity, the audit log should categorize the activity separately from production
**Validates: Requirements 7.4**

### Property 29: Export Data Filtering
*For any* production data export request, the export should exclude all demo and test account data
**Validates: Requirements 7.5**

### Property 30: Demo Usage Analytics Capture
*For any* demo account activity, the system should record corresponding analytics events for feature usage, navigation, and session duration
**Validates: Requirements 8.1**

### Property 31: Engagement Metrics Recording
*For any* demo content interaction, the system should record corresponding engagement metrics
**Validates: Requirements 8.2**

### Property 32: Feedback Mechanism Availability
*For any* demo session completion, the system should provide a feedback collection mechanism
**Validates: Requirements 8.3**

### Property 33: Analytics Report Completeness
*For any* demo effectiveness analysis request, the generated report should contain conversion rates and feature interest metrics
**Validates: Requirements 8.4**

### Property 34: Synthetic Data Compliance
*For any* demo account data, the data should be marked as synthetic and not contain real PII patterns
**Validates: Requirements 9.1**

### Property 35: Test Data Source Validation
*For any* test account creation, the account should not contain any production user data
**Validates: Requirements 9.2**

### Property 36: Data Retention Purge
*For any* demo or test account data older than the retention period, the data should be automatically purged
**Validates: Requirements 9.3**

### Property 37: Data Subject Query Filtering
*For any* data subject request query, the results should exclude all demo and test accounts
**Validates: Requirements 9.4**

## Error Handling

### Error Types

```typescript
enum ProvisioningErrorType {
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  CLERK_INTEGRATION_FAILURE = 'CLERK_INTEGRATION_FAILURE',
  SAMPLE_DATA_GENERATION_FAILURE = 'SAMPLE_DATA_GENERATION_FAILURE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  ROLLBACK_FAILURE = 'ROLLBACK_FAILURE'
}

enum LifecycleErrorType {
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  RESET_FAILURE = 'RESET_FAILURE',
  DELETION_FAILURE = 'DELETION_FAILURE',
  INVALID_STATE = 'INVALID_STATE'
}

enum AuthorizationErrorType {
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_ADMIN_CREDENTIALS = 'INVALID_ADMIN_CREDENTIALS',
  UNAUTHORIZED_SYSTEM_OPERATION = 'UNAUTHORIZED_SYSTEM_OPERATION'
}
```

### Error Handling Strategies

**Provisioning Errors**:
- Validate all configurations before starting provisioning
- Use database transactions for atomic operations
- Implement automatic rollback on failure
- Log detailed error information for debugging
- Return clear error messages to API consumers

**Lifecycle Errors**:
- Verify account existence before operations
- Use idempotent operations where possible
- Implement retry logic for transient failures
- Maintain operation history for troubleshooting
- Provide detailed error context

**Authorization Errors**:
- Fail fast on authorization checks
- Log all authorization failures for security monitoring
- Return consistent error responses
- Never expose sensitive information in errors
- Implement rate limiting for repeated failures

**Data Integrity Errors**:
- Validate data before persistence
- Use database constraints and foreign keys
- Implement data validation at multiple layers
- Perform integrity checks after operations
- Maintain audit trail for data changes

## Testing Strategy

### Testing Infrastructure Requirements

**CRITICAL**: All tests must pass 100% successfully for tasks to be considered complete.

**Test Configuration**:
```typescript
// vitest.config.ts - Memory-optimized configuration
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Prevent memory leaks
        isolate: true
      }
    },
    testTimeout: 60000,
    hookTimeout: 30000
  }
})

// Memory management for all test commands
"test": "NODE_OPTIONS=\"--max-old-space-size=8192\" vitest run"
"test:coverage": "NODE_OPTIONS=\"--max-old-space-size=16384\" vitest run --coverage"
```

### Unit Testing

**Official Testing Utilities** (MANDATORY):
- Use `@clerk/testing` for Clerk authentication mocking
- Never create custom Clerk mocks
- Use official Supabase client for database operations
- Follow existing patterns from `__tests__/setup/clerk-testing-setup.ts`

**Service Layer Testing**:
```typescript
// ✅ CORRECT: Service testing with proper mocks
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountProvisioningService } from '@/lib/services/account-provisioning'
import { createMockSupabaseClient } from '../setup/common-mocks'

vi.mock('@/lib/models/database', () => ({
  createTypedSupabaseClient: () => createMockSupabaseClient()
}))

describe('AccountProvisioningService', () => {
  beforeEach(() => {
    vi.clearAllMocks() // Safe for service-level mocks
  })
  
  it('should provision demo account with persona', async () => {
    const config = { persona: 'ContentCreator', tier: 'Professional' }
    const account = await AccountProvisioningService.provision(config)
    
    expect(account.persona).toBe('ContentCreator')
    expect(account.tier).toBe('Professional')
  })
})
```

**Coverage Requirements** (Tiered):
- **Services (`lib/services/**`)**: 100% coverage (critical business logic)
- **Models (`lib/models/**`)**: 95% coverage (data layer)
- **API Routes (`app/api/**`)**: 90% coverage (external interfaces)
- **Global Minimum**: 85% coverage (all other code)

### Integration Testing

**CRITICAL**: Integration tests MUST leverage real services (Supabase, Clerk, Redis) as a priority.

**Real Service Integration**:
```typescript
// ✅ CORRECT: Real Supabase integration test
describe('Account Provisioning Integration', () => {
  let testUserId: string
  let testOrgId: string
  
  beforeAll(async () => {
    // Create test data in real database
    const user = await createTestUser()
    testUserId = user.id
    
    const org = await createTestOrganization()
    testOrgId = org.id
  })
  
  afterAll(async () => {
    // Clean up test data
    await deleteTestUser(testUserId)
    await deleteTestOrganization(testOrgId)
  })
  
  it('should provision account with real database', async () => {
    const account = await provisionDemoAccount({
      persona: 'ContentCreator',
      tier: 'Professional'
    })
    
    // Verify in real database
    const dbAccount = await supabase
      .from('users')
      .select('*')
      .eq('id', account.id)
      .single()
    
    expect(dbAccount.data).toBeDefined()
    expect(dbAccount.data.account_type).toBe('demo')
  })
})
```

**Test Data Lifecycle Management**:
- Tests MUST manage their own seed data
- Tests MUST clean up all created data
- Tests MUST NOT taint the datastores
- Tests MUST be idempotent and support parallel execution

**Idempotency Pattern**:
```typescript
// ✅ CORRECT: Idempotent test with cleanup
describe('Demo Account Reset', () => {
  const testAccountId = `test-${Date.now()}-${Math.random()}`
  
  beforeEach(async () => {
    // Ensure clean state
    await cleanupTestAccount(testAccountId)
    await createTestAccount(testAccountId)
  })
  
  afterEach(async () => {
    // Always cleanup
    await cleanupTestAccount(testAccountId)
  })
  
  it('should reset account to baseline', async () => {
    // Test logic
  })
})
```

### E2E Testing with Playwright

**CRITICAL**: All E2E tests MUST follow Clerk authentication guidelines.

**Clerk Authentication in E2E**:
```typescript
// ✅ CORRECT: E2E test with Clerk authentication
import { test, expect } from '@playwright/test'
import { clerkSetup } from '@clerk/testing/playwright'

test.describe('Demo Account Provisioning E2E', () => {
  test.use({ ...clerkSetup() })
  
  test('should provision demo account through UI', async ({ page }) => {
    // Authenticate with Clerk
    await page.goto('/sign-in')
    await page.fill('[data-testid="email"]', 'admin@c9d.ai')
    await page.fill('[data-testid="password"]', process.env.ADMIN_PASSWORD!)
    await page.click('[data-testid="sign-in-button"]')
    
    // Wait for authentication
    await expect(page).toHaveURL('/dashboard')
    
    // Provision demo account
    await page.goto('/admin/accounts/provision')
    await page.selectOption('[data-testid="persona"]', 'ContentCreator')
    await page.selectOption('[data-testid="tier"]', 'Professional')
    await page.click('[data-testid="provision-button"]')
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Account provisioned successfully')
  })
})
```

**E2E Test Data Management**:
```typescript
// ✅ CORRECT: E2E test with seed data management
test.describe('Demo Session Flow', () => {
  let testAccountEmail: string
  
  test.beforeEach(async ({ page }) => {
    // Create unique test account
    testAccountEmail = `test-${Date.now()}@example.com`
    
    // Seed test data via API
    await fetch('/api/test/seed', {
      method: 'POST',
      body: JSON.stringify({
        email: testAccountEmail,
        persona: 'ContentCreator'
      })
    })
  })
  
  test.afterEach(async () => {
    // Cleanup test data
    await fetch('/api/test/cleanup', {
      method: 'POST',
      body: JSON.stringify({ email: testAccountEmail })
    })
  })
  
  test('should complete demo session', async ({ page }) => {
    // Test logic with clean, isolated data
  })
})
```

**Parallel Execution Support**:
- Use unique identifiers for test data (timestamps, UUIDs)
- Avoid shared state between tests
- Clean up in both beforeEach and afterEach
- Use database transactions where possible

### Property-Based Testing

The testing framework will use **fast-check** for JavaScript/TypeScript property-based testing. Each property-based test should run a minimum of 100 iterations.

**Property Test Examples**:

```typescript
// Property 1: Complete Persona Coverage
test('demo account provisioning provides all personas', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        requestId: fc.uuid(),
        requester: fc.string()
      }),
      async (request) => {
        const accounts = await provisioningService.getDemoAccounts(request)
        const personas = accounts.map(a => a.persona)
        
        expect(personas).toContain('ContentCreator')
        expect(personas).toContain('MarketingManager')
        expect(personas).toContain('TeamLead')
        expect(personas).toContain('EnterpriseAdmin')
      }
    ),
    { numRuns: 100 }
  )
})

// Property 5: Test Account Isolation
test('test account operations do not affect production', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        testAccountId: fc.uuid(),
        operation: fc.constantFrom('create', 'update', 'delete'),
        data: fc.object()
      }),
      async (testOp) => {
        const productionStateBefore = await getProductionDataSnapshot()
        
        await executeTestAccountOperation(testOp)
        
        const productionStateAfter = await getProductionDataSnapshot()
        expect(productionStateAfter).toEqual(productionStateBefore)
      }
    ),
    { numRuns: 100 }
  )
})
```

### Performance Testing

**Provisioning Performance**:
- Single account provisioning: <5 seconds (Vercel function timeout: 30s)
- Bulk provisioning (10 accounts): <30 seconds
- Sample data generation: <2 seconds per account
- Database operations: <500ms

**Reset Performance**:
- Account reset: <10 seconds
- Scheduled resets: within 1 minute of scheduled time
- Concurrent resets: no degradation
- State restoration: atomic and consistent

**Analytics Performance**:
- Event tracking: <100ms (non-blocking)
- Report generation: <5 seconds
- Analytics queries: <2 seconds
- Concurrent operations: linear scaling

## Security Considerations

### Authentication and Authorization

**Account Access Control**:
- Demo accounts use standard Clerk authentication
- Test accounts are isolated from production authentication
- Admin account (admin@c9d.ai) has special authorization rules
- All account access is logged for audit purposes

**API Security**:
- Provisioning APIs require admin-level authentication
- Lifecycle APIs require appropriate permissions
- Admin APIs require system administrator credentials
- All APIs use rate limiting and request validation

### Data Security

**Credential Management**:
- Account credentials are generated using cryptographically secure methods
- Credentials are encrypted at rest
- Credentials are never logged or exposed in responses
- Credential rotation is supported for long-lived accounts

**Data Isolation**:
- Demo and test accounts are tagged for identification
- Production data is never accessible from demo/test accounts
- Database queries enforce isolation through row-level security
- Export operations filter demo/test data automatically

### Compliance and Privacy

**Synthetic Data**:
- All demo account data is synthetic and GDPR/CCPA compliant
- No real personal information is used in demo accounts
- Data is clearly marked as synthetic in database
- Synthetic data generation follows privacy best practices

**Data Retention**:
- Demo account data is retained for 90 days by default
- Test account data is purged after test completion
- Audit logs are retained for 1 year
- Retention policies are enforced automatically

## Deployment Considerations

### Vercel Deployment Architecture

**Platform**: Vercel with Next.js 15+ App Router
**Region**: iad1 (US East)
**Function Configuration**:
- API routes: 30s max duration, 1024MB memory
- Edge functions for geographically distributed logic where applicable

**Build Configuration**:
```json
{
  "buildCommand": "vercel-phase-prebuild && pnpm turbo build --filter=@c9d/web",
  "framework": "nextjs",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

### Database Schema Integration

**Existing Schema Alignment**:
The system integrates with the existing Supabase PostgreSQL schema:

**Extend Existing Tables**:
- `users` table: Add `account_type` ENUM ('production', 'demo', 'test', 'admin')
- `users` table: Add `account_tags` TEXT[] for categorization
- `users` table: Add `baseline_state_id` UUID for reset operations
- `users` table: Add `last_reset_at` TIMESTAMP
- `users` table: Add `next_reset_at` TIMESTAMP

**New Tables**:
```sql
-- Sample data sets for demo accounts
CREATE TABLE sample_data_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona TEXT NOT NULL CHECK (persona IN ('ContentCreator', 'MarketingManager', 'TeamLead', 'EnterpriseAdmin')),
  tier TEXT NOT NULL CHECK (tier IN ('Free', 'Professional', 'Enterprise')),
  version TEXT NOT NULL,
  content_data JSONB DEFAULT '{}',
  organization_data JSONB DEFAULT '{}',
  team_data JSONB DEFAULT '{}',
  analytics_data JSONB DEFAULT '{}',
  workflow_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account baseline states for reset operations
CREATE TABLE account_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo analytics events
CREATE TABLE demo_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  feature TEXT,
  path TEXT,
  interaction_data JSONB DEFAULT '{}',
  session_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_account_tags ON users USING GIN(account_tags);
CREATE INDEX idx_sample_data_sets_persona_tier ON sample_data_sets(persona, tier);
CREATE INDEX idx_account_baselines_user_id ON account_baselines(user_id);
CREATE INDEX idx_demo_analytics_events_user_id ON demo_analytics_events(user_id);
CREATE INDEX idx_demo_analytics_events_session_id ON demo_analytics_events(session_id);
CREATE INDEX idx_demo_analytics_events_created_at ON demo_analytics_events(created_at);
```

**RLS Policies Extension**:
```sql
-- Admin bypass policy for admin@c9d.ai
CREATE POLICY "System admin has unrestricted access" ON users
  FOR ALL USING (
    auth.user_id()::TEXT = (SELECT clerk_user_id FROM users WHERE email = 'admin@c9d.ai')
  );

-- Demo/test account isolation
CREATE POLICY "Demo accounts isolated from production" ON users
  FOR SELECT USING (
    account_type = 'production' OR
    clerk_user_id = auth.user_id()::TEXT OR
    auth.user_id()::TEXT = (SELECT clerk_user_id FROM users WHERE email = 'admin@c9d.ai')
  );
```

### Environment Configuration via Phase.dev

**All environment variables managed through Phase.dev**:
```typescript
// Required Phase.dev contexts:
// - AI.C9d.Web (production)
// - AI.C9d.Web.Staging (staging)
// - AI.C9d.Web.Test (testing)

// Demo/Test Account Configuration
DEMO_ACCOUNT_RESET_INTERVAL=24h
TEST_ACCOUNT_AUTO_CLEANUP=true
SYSTEM_ADMIN_EMAIL=admin@c9d.ai
SAMPLE_DATA_VERSION=1.0.0
ANALYTICS_RETENTION_DAYS=90

// Existing Infrastructure (already configured)
NEXT_PUBLIC_SUPABASE_URL=<from-phase>
SUPABASE_SERVICE_ROLE_KEY=<from-phase>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from-phase>
CLERK_SECRET_KEY=<from-phase>
REDIS_URL=<from-phase>
REDIS_TOKEN=<from-phase>
DATABASE_URL=<from-phase>
```

### Integration with Existing Services

**Clerk Authentication**:
- Use existing Clerk integration for all account types
- Demo/test accounts created through Clerk API
- Admin account (admin@c9d.ai) uses standard Clerk authentication
- Authorization bypass implemented at application layer

**Supabase Database**:
- Use existing TypedSupabaseClient from `lib/models/database.ts`
- Extend with demo/test account specific methods
- Leverage existing RLS policies with admin bypass
- Use existing audit_logs table for all operations

**Redis Caching**:
- Cache sample data sets for fast provisioning
- Cache baseline states for quick resets
- Use existing Redis connection from infrastructure

**Vercel Edge Functions**:
- Provisioning APIs deployed as serverless functions
- 30s timeout sufficient for account creation
- 1024MB memory adequate for sample data generation

### Monitoring and Observability

**Vercel Analytics Integration**:
- Track API endpoint performance
- Monitor function execution times
- Alert on error rates and timeouts

**Supabase Monitoring**:
- Database query performance
- Connection pool utilization
- RLS policy execution time

**Custom Metrics** (via existing audit_logs):
- Demo account provisioning success rate
- Average provisioning time (target: <5s)
- Reset operation success rate (target: >99%)
- Admin operation frequency
- Analytics event volume
- Compliance check results

**Alerts to Configure** (Vercel + Supabase):
- Provisioning failure rate > 5%
- Reset operation failures
- Unauthorized admin access attempts
- Data isolation violations
- Function timeout rate > 1%
- Database connection pool exhaustion

## Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-2)
- Implement Account Provisioning Service
- Create database schema and migrations
- Implement basic Sample Data Generator
- Set up audit logging infrastructure

### Phase 2: Account Lifecycle (Weeks 3-4)
- Implement Account Lifecycle Manager
- Build reset and deletion operations
- Create scheduled reset functionality
- Implement state tracking

### Phase 3: System Administration (Week 5)
- Implement System Administrator Service
- Configure authorization bypass logic
- Set up admin audit logging
- Test unrestricted access

### Phase 4: Analytics and Compliance (Week 6)
- Implement Analytics Tracker
- Build Compliance Service
- Create reporting functionality
- Implement data retention policies

### Phase 5: Testing and Documentation (Week 7)
- Write comprehensive unit tests
- Implement property-based tests
- Create integration tests
- Write API documentation

### Phase 6: Deployment and Monitoring (Week 8)
- Deploy to staging environment
- Configure monitoring and alerts
- Perform load testing
- Deploy to production

## Success Metrics

**Provisioning Success**:
- 99% provisioning success rate
- < 5 second average provisioning time
- Zero data integrity issues
- Complete audit trail for all operations

**Demo Experience**:
- High-quality sample data across all personas
- Successful reset operations within 24 hours
- Positive feedback from sales team
- Increased demo-to-trial conversion rate

**Testing Reliability**:
- 100% test account isolation
- Zero production data contamination
- Consistent test account states
- Reliable automated test execution

**System Administration**:
- Complete platform access for admin@c9d.ai
- 100% audit logging coverage
- Zero unauthorized access incidents
- Efficient troubleshooting and support

**Compliance**:
- 100% synthetic data compliance
- Automated retention policy enforcement
- Zero real PII in demo/test accounts
- Successful regulatory audits
