# Design Document

## Overview

The Onboarding & User Activation system is a comprehensive solution for guiding new users through their initial platform experience, tracking their progress toward activation, and providing analytics for continuous optimization. The system is built on Next.js 15+ with React 19+, TypeScript, Supabase for data persistence, and integrates with Clerk for authentication state.

The core design philosophy centers on:
- **User-First Experience**: Minimize friction while maximizing value realization
- **Data-Driven Optimization**: Built-in analytics and A/B testing capabilities
- **Progressive Disclosure**: Gradually reveal complexity as users demonstrate proficiency
- **Resilient State Management**: Handle network issues, multi-device usage, and interruptions
- **Flexible Configuration**: Support different user segments and business requirements

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Next.js 15+)               │
│                    Deployed on Vercel Edge                   │
├─────────────────────────────────────────────────────────────┤
│  Onboarding UI    │  Progress Tracker  │  Trial Dashboard   │
│  Campaign Wizard  │  Help System       │  Analytics Views   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  OnboardingService │ ActivationService │ AnalyticsService   │
│  ConfigService     │ ProgressService   │ CampaignService    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│              (Drizzle ORM + Zod Validation)                  │
├─────────────────────────────────────────────────────────────┤
│  OnboardingRepo    │ ActivationRepo    │ AnalyticsRepo      │
│  ConfigRepo        │ UserProgressRepo  │ CampaignRepo       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Layer (Supabase PostgreSQL)                │
│                    with Row Level Security                   │
├─────────────────────────────────────────────────────────────┤
│  onboarding_configs │ user_progress    │ activation_events  │
│  onboarding_steps   │ analytics_events │ campaign_data      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
├─────────────────────────────────────────────────────────────┤
│  Clerk (Auth)      │  Redis (Cache)   │  Phase.dev (Env)   │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture (Vercel)

The system is deployed on Vercel with the following configuration:

- **Edge Functions**: Onboarding flow and progress tracking for low latency
- **Serverless Functions**: Analytics and reporting with extended timeouts (30s)
- **Static Generation**: Marketing and help content pages
- **Incremental Static Regeneration**: Configuration and template pages

```typescript
// vercel.json configuration
{
  "functions": {
    "app/api/onboarding/**/*.ts": {
      "maxDuration": 10,
      "memory": 1024
    },
    "app/api/analytics/**/*.ts": {
      "maxDuration": 30,
      "memory": 3008
    }
  },
  "crons": [
    {
      "path": "/api/analytics/aggregate",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Component Interaction Flow

```
User Authentication (Clerk)
         │
         ▼
Check Onboarding Status
         │
         ├─── Not Started ──────► Start Onboarding Flow
         │                              │
         ├─── In Progress ──────► Resume at Last Step
         │                              │
         └─── Completed ────────► Show Trial Dashboard
                                        │
                                        ▼
                                 Track Progress
                                        │
                                        ▼
                                 Check Activation
                                        │
                                        ├─── Not Activated ──► Show Guidance
                                        │
                                        └─── Activated ──────► Full Platform Access
```

### Integration with Existing Platform Services

#### Clerk Authentication Integration
- Use existing Clerk configuration from `@clerk/nextjs`
- Leverage Clerk webhooks for user lifecycle events
- Integrate with existing user management system
- Use Clerk's organization features for multi-tenant onboarding

#### Supabase Database Integration
- Extend existing database schema with new onboarding tables
- Use existing connection pooling and client configuration
- Leverage existing Row Level Security (RLS) policies
- Integrate with existing user and organization tables via foreign keys

```typescript
// lib/db/client.ts - Use existing Supabase client
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/config/env'

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)
```

#### Redis Caching Integration
- Use existing Redis client for caching onboarding configurations
- Cache user progress for fast retrieval
- Implement cache invalidation on progress updates
- Use existing cache key patterns and TTL strategies

```typescript
// lib/cache/onboarding-cache.ts
import { redis } from '@/lib/cache/redis-client'

export class OnboardingCache {
  private static readonly TTL = 3600 // 1 hour
  
  static async getCachedProgress(userId: string) {
    const key = `onboarding:progress:${userId}`
    return await redis.get(key)
  }
  
  static async setCachedProgress(userId: string, progress: any) {
    const key = `onboarding:progress:${userId}`
    await redis.setex(key, this.TTL, JSON.stringify(progress))
  }
}
```

#### Phase.dev Environment Variables
- All environment variables managed through Phase.dev
- Use existing Phase.dev contexts (AI.C9d.Web)
- No `.env` files in repository
- Environment-specific configurations for dev/staging/production

```bash
# Environment variables managed via Phase.dev
phase secrets set ONBOARDING_DEFAULT_CONFIG_ID "uuid-here" --context AI.C9d.Web
phase secrets set ONBOARDING_ACTIVATION_THRESHOLD "1" --context AI.C9d.Web
```


## Components and Interfaces

### Core Components

#### 1. OnboardingFlow Component
```typescript
interface OnboardingFlowProps {
  userId: string
  onComplete: () => void
  onStepComplete: (stepId: string) => void
}

// Manages the overall onboarding experience
// - Renders current step based on progress
// - Handles navigation between steps
// - Persists progress automatically
// - Provides skip functionality for optional steps
```

#### 2. ProgressTracker Component
```typescript
interface ProgressTrackerProps {
  steps: OnboardingStep[]
  currentStep: string
  completedSteps: string[]
  totalSteps: number
}

// Visual progress indicator
// - Shows completion percentage
// - Highlights current step
// - Indicates required vs optional steps
// - Allows navigation to completed steps
```

#### 3. TrialDashboard Component
```typescript
interface TrialDashboardProps {
  userId: string
  trialEndDate: Date
  activationStatus: ActivationStatus
  onboardingProgress: number
}

// Specialized dashboard for trial users
// - Displays remaining trial days
// - Shows activation progress
// - Provides quick actions for next steps
// - Celebrates activation milestones
```

#### 4. CampaignWizard Component
```typescript
interface CampaignWizardProps {
  userId: string
  isFirstCampaign: boolean
  onComplete: (campaign: Campaign) => void
  templates: CampaignTemplate[]
}

// Guided campaign creation for first-time users
// - Simplified interface for beginners
// - Suggests optimal defaults
// - Provides templates and examples
// - Validates and guides through required fields
```

#### 5. HelpSystem Component
```typescript
interface HelpSystemProps {
  currentStep: string
  userContext: UserContext
  onHelpRequest: (topic: string) => void
}

// Context-aware help and guidance
// - Provides tooltips and inline documentation
// - Offers step-specific help resources
// - Detects when users are stuck
// - Suggests skip options when appropriate
```

### Service Layer Interfaces

#### OnboardingService
```typescript
interface OnboardingService {
  // Start onboarding for a new user
  startOnboarding(userId: string): Promise<OnboardingSession>
  
  // Get current onboarding status
  getProgress(userId: string): Promise<OnboardingProgress>
  
  // Complete a specific step
  completeStep(userId: string, stepId: string): Promise<void>
  
  // Skip an optional step
  skipStep(userId: string, stepId: string): Promise<void>
  
  // Resume onboarding from last position
  resumeOnboarding(userId: string): Promise<OnboardingSession>
  
  // Mark onboarding as complete
  completeOnboarding(userId: string): Promise<void>
}
```

#### ActivationService
```typescript
interface ActivationService {
  // Check if user meets activation criteria
  checkActivation(userId: string): Promise<ActivationStatus>
  
  // Record activation event
  recordActivation(userId: string, event: ActivationEvent): Promise<void>
  
  // Get time to activation
  getTimeToActivation(userId: string): Promise<number | null>
  
  // Calculate activation score
  calculateActivationScore(userId: string): Promise<number>
}
```

#### AnalyticsService
```typescript
interface AnalyticsService {
  // Track onboarding event
  trackEvent(event: OnboardingEvent): Promise<void>
  
  // Get funnel metrics
  getFunnelMetrics(cohort?: CohortFilter): Promise<FunnelMetrics>
  
  // Get drop-off analysis
  getDropOffAnalysis(): Promise<DropOffAnalysis>
  
  // Get cohort comparison
  compareCohorts(cohorts: CohortFilter[]): Promise<CohortComparison>
  
  // Get A/B test results
  getABTestResults(testId: string): Promise<ABTestResults>
}
```

#### ConfigService
```typescript
interface ConfigService {
  // Get active onboarding configuration
  getActiveConfig(): Promise<OnboardingConfig>
  
  // Update onboarding configuration
  updateConfig(config: OnboardingConfig): Promise<void>
  
  // Get configuration for specific user segment
  getConfigForSegment(segment: UserSegment): Promise<OnboardingConfig>
  
  // Create A/B test variant
  createVariant(variant: ConfigVariant): Promise<string>
  
  // Assign user to variant
  assignToVariant(userId: string, testId: string): Promise<string>
}
```


## Data Models

### Schema Integration with Existing Database

The onboarding system integrates with the existing C9D AI platform schema, leveraging:

- **Existing `users` table**: Links to Clerk user IDs via `clerk_user_id`
- **Existing `organizations` table**: For organization-level onboarding configurations
- **Existing `campaigns` table**: For tracking first campaign creation (activation event)
- **New onboarding tables**: Extend the schema without modifying existing tables

### Drizzle ORM Schema Definitions

All database models use Drizzle ORM with Zod validation for type safety:

```typescript
// lib/db/schema/onboarding.ts
import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Drizzle table definitions with Zod schemas
export const onboardingConfigs = pgTable('onboarding_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  targetSegment: text('target_segment'),
  steps: jsonb('steps').notNull(),
  activationCriteria: jsonb('activation_criteria').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// Zod schemas for validation
export const insertOnboardingConfigSchema = createInsertSchema(onboardingConfigs)
export const selectOnboardingConfigSchema = createSelectSchema(onboardingConfigs)
```

### Database Schema

#### onboarding_configs
```typescript
interface OnboardingConfig {
  id: string
  name: string
  version: number
  is_active: boolean
  target_segment: UserSegment | null
  steps: OnboardingStepConfig[]
  activation_criteria: ActivationCriteria
  created_at: Date
  updated_at: Date
}

interface OnboardingStepConfig {
  id: string
  order: number
  title: string
  description: string
  is_required: boolean
  component_type: string
  config: Record<string, unknown>
  help_resources: HelpResource[]
}
```

#### user_onboarding_progress
```typescript
interface UserOnboardingProgress {
  id: string
  user_id: string
  config_id: string
  started_at: Date
  completed_at: Date | null
  current_step: string | null
  completed_steps: string[]
  skipped_steps: string[]
  is_completed: boolean
  metadata: Record<string, unknown>
}
```

#### onboarding_step_completions
```typescript
interface StepCompletion {
  id: string
  user_id: string
  progress_id: string
  step_id: string
  started_at: Date
  completed_at: Date | null
  skipped_at: Date | null
  time_spent_seconds: number
  interactions: InteractionEvent[]
  metadata: Record<string, unknown>
}
```

#### activation_events
```typescript
interface ActivationEvent {
  id: string
  user_id: string
  event_type: ActivationEventType
  occurred_at: Date
  time_to_activation_seconds: number | null
  metadata: Record<string, unknown>
}

enum ActivationEventType {
  FIRST_CAMPAIGN_CREATED = 'first_campaign_created',
  ONBOARDING_COMPLETED = 'onboarding_completed',
  CUSTOM_ACTIVATION = 'custom_activation'
}
```

#### analytics_events
```typescript
interface AnalyticsEvent {
  id: string
  user_id: string
  session_id: string
  event_type: string
  event_data: Record<string, unknown>
  occurred_at: Date
  context: EventContext
}

interface EventContext {
  step_id: string | null
  variant_id: string | null
  device_type: string
  user_agent: string
}
```

#### trial_status
```typescript
interface TrialStatus {
  id: string
  user_id: string
  trial_start_date: Date
  trial_end_date: Date
  is_active: boolean
  activation_status: ActivationStatus
  conversion_date: Date | null
  metadata: Record<string, unknown>
}

enum ActivationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ACTIVATED = 'activated',
  CHURNED = 'churned'
}
```

#### ab_test_assignments
```typescript
interface ABTestAssignment {
  id: string
  user_id: string
  test_id: string
  variant_id: string
  assigned_at: Date
  config_snapshot: OnboardingConfig
}
```

### TypeScript Types

```typescript
// Onboarding session state
interface OnboardingSession {
  userId: string
  configId: string
  currentStep: OnboardingStep
  progress: OnboardingProgress
  canSkipCurrent: boolean
  nextStep: OnboardingStep | null
}

// Progress tracking
interface OnboardingProgress {
  totalSteps: number
  completedSteps: number
  skippedSteps: number
  percentComplete: number
  estimatedTimeRemaining: number
  isComplete: boolean
}

// Step definition
interface OnboardingStep {
  id: string
  title: string
  description: string
  isRequired: boolean
  componentType: StepComponentType
  config: StepConfig
  helpResources: HelpResource[]
}

enum StepComponentType {
  PROFILE_SETUP = 'profile_setup',
  ORGANIZATION_SETUP = 'organization_setup',
  CAMPAIGN_WIZARD = 'campaign_wizard',
  FEATURE_TOUR = 'feature_tour',
  INTEGRATION_SETUP = 'integration_setup'
}

// Activation criteria
interface ActivationCriteria {
  requiredEvents: ActivationEventType[]
  minimumStepsCompleted: number
  customCriteria: CustomCriterion[]
}

interface CustomCriterion {
  id: string
  name: string
  evaluator: (user: User) => Promise<boolean>
}

// Analytics types
interface FunnelMetrics {
  totalUsers: number
  stepMetrics: StepMetrics[]
  overallConversionRate: number
  averageTimeToActivation: number
}

interface StepMetrics {
  stepId: string
  stepName: string
  usersStarted: number
  usersCompleted: number
  usersSkipped: number
  usersDroppedOff: number
  completionRate: number
  averageTimeSpent: number
}

interface DropOffAnalysis {
  problematicSteps: ProblematicStep[]
  recommendations: string[]
}

interface ProblematicStep {
  stepId: string
  stepName: string
  dropOffRate: number
  averageTimeSpent: number
  commonExitPoints: string[]
}

// Cohort analysis
interface CohortFilter {
  name: string
  startDate: Date
  endDate: Date
  segment: UserSegment | null
  variantId: string | null
}

interface CohortComparison {
  cohorts: CohortMetrics[]
  significantDifferences: Difference[]
}

interface CohortMetrics {
  cohortName: string
  userCount: number
  activationRate: number
  averageTimeToActivation: number
  stepCompletionRates: Record<string, number>
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Authentication redirect to onboarding
*For any* newly authenticated user who has not started onboarding, accessing the platform should result in a redirect to the onboarding flow URL.
**Validates: Requirements 1.1**

### Property 2: Progress tracker completeness
*For any* onboarding configuration with N defined steps, the rendered progress tracker should contain exactly N step indicators.
**Validates: Requirements 1.2**

### Property 3: Step completion persistence
*For any* onboarding step completion, querying the database immediately after should return the completed status for that step.
**Validates: Requirements 1.3**

### Property 4: Onboarding resume consistency
*For any* user with partial onboarding progress, logging out and logging back in should restore them to the exact same step position.
**Validates: Requirements 1.4**

### Property 5: Activation on completion
*For any* user completing all required onboarding steps, their activation status should be set to 'activated' and they should be redirected to the main dashboard.
**Validates: Requirements 1.5**

### Property 6: Trial days calculation
*For any* trial user with trial end date T and current date C where C < T, the displayed remaining days should equal ceil((T - C) / 86400000).
**Validates: Requirements 2.1**

### Property 7: Progress percentage accuracy
*For any* user with M completed steps out of N total steps, the displayed progress percentage should equal (M / N) * 100.
**Validates: Requirements 2.2**

### Property 8: Incomplete onboarding CTA presence
*For any* trial user where onboarding completion is less than 100%, the dashboard should render a continue-onboarding call-to-action element.
**Validates: Requirements 2.3**

### Property 9: First campaign activation trigger
*For any* user creating their first campaign, the activation status should transition to 'activated' and a celebration UI should be displayed.
**Validates: Requirements 2.4**

### Property 10: Trial expiration prompt
*For any* user where current date is greater than or equal to trial end date, an upgrade prompt should be present in the rendered UI.
**Validates: Requirements 2.5**

### Property 11: Onboarding start recording
*For any* user starting onboarding, the database should contain a record with their user ID and a start timestamp within 1 second of the start action.
**Validates: Requirements 3.1**

### Property 12: Step completion recording
*For any* step completion event, the database should contain a corresponding record with the step ID and completion timestamp.
**Validates: Requirements 3.2**

### Property 13: Activation timestamp recording
*For any* user reaching activation, the database should contain an activation event with timestamp and calculated time-to-activation in seconds.
**Validates: Requirements 3.3**

### Property 14: Completion rate aggregation accuracy
*For any* set of users and step S, the calculated completion rate should equal (users who completed S / users who started S) * 100.
**Validates: Requirements 3.4**

### Property 15: Cohort segmentation correctness
*For any* cohort filter criteria, all users in the returned segment should satisfy the filter conditions.
**Validates: Requirements 3.5**

### Property 16: Step instructions presence
*For any* rendered onboarding step, the DOM should contain both instruction text and expected outcome description elements.
**Validates: Requirements 4.1**

### Property 17: Error message completeness
*For any* error during onboarding, the error message should contain both a description string and at least one recovery action string.
**Validates: Requirements 4.2**

### Property 18: Stuck user help offering
*For any* user spending more than threshold T seconds on a step, help resources or skip options should be offered in the UI.
**Validates: Requirements 4.3**

### Property 19: Complex feature documentation
*For any* complex feature element marked as such, tooltip and inline documentation elements should be present in the DOM.
**Validates: Requirements 4.4**

### Property 20: Context-aware help filtering
*For any* help request from step S, all returned help resources should have context matching step S.
**Validates: Requirements 4.5**

### Property 21: Configuration persistence
*For any* valid onboarding configuration submitted by an administrator, querying the database should return the exact configuration with all steps and sequence preserved.
**Validates: Requirements 5.1**

### Property 22: Multiple activation criteria evaluation
*For any* user action and set of activation criteria C, the activation check should evaluate the action against all criteria in C.
**Validates: Requirements 5.2**

### Property 23: Configuration version isolation
*For any* configuration update at time T, users who started onboarding before T should continue with the old configuration while users starting after T should use the new configuration.
**Validates: Requirements 5.3**

### Property 24: A/B test variant assignment
*For any* A/B test with variants V1 and V2, users should be randomly assigned such that over a large sample, approximately 50% receive each variant.
**Validates: Requirements 5.4**

### Property 25: Variant metrics comparison
*For any* A/B test with variants V1 and V2, the metrics report should include separate aggregated metrics for each variant.
**Validates: Requirements 5.5**

### Property 26: First campaign simplified flow
*For any* user creating their first campaign (campaign count = 0), the rendered UI should be the simplified wizard rather than the advanced interface.
**Validates: Requirements 6.1**

### Property 27: Profile-based defaults
*For any* user profile with attributes A, the suggested campaign defaults should be calculated as a function of A.
**Validates: Requirements 6.2**

### Property 28: Template availability
*For any* campaign creation session, at least one template should be available in the templates list.
**Validates: Requirements 6.3**

### Property 29: Campaign validation completeness
*For any* campaign submission, validation should check all required fields and return feedback for any missing or invalid fields.
**Validates: Requirements 6.4**

### Property 30: First campaign activation
*For any* successful first campaign creation, the user's activation status should be set to 'activated' and a success celebration UI should render.
**Validates: Requirements 6.5**

### Property 31: Essential features for new users
*For any* user with zero prior sessions, the rendered navigation should contain only features marked as 'essential' in the configuration.
**Validates: Requirements 7.1**

### Property 32: Progressive feature revelation
*For any* user completing N basic steps, features with unlock_level <= N should be visible in the UI.
**Validates: Requirements 7.2**

### Property 33: Advanced feature introduction
*For any* advanced feature display, the UI should contain both introduction text and value proposition text elements.
**Validates: Requirements 7.3**

### Property 34: Proficiency-based unlocking
*For any* user meeting proficiency criteria P, all capabilities with required_proficiency <= P should be enabled.
**Validates: Requirements 7.4**

### Property 35: Feature engagement tracking
*For any* feature interaction, a tracking record should be created with feature ID, user ID, and timestamp.
**Validates: Requirements 7.5**

### Property 36: Immediate step persistence
*For any* step completion, querying the database within 100ms should return the completed status.
**Validates: Requirements 8.1**

### Property 37: Position restoration on return
*For any* user with progress at step S, logging out and logging back in should restore them to step S.
**Validates: Requirements 8.2**

### Property 38: Offline progress queuing
*For any* progress update during offline state, the update should be present in the sync queue and applied when connectivity is restored.
**Validates: Requirements 8.3**

### Property 39: Cross-device synchronization
*For any* progress update on device D1, device D2 should reflect the same progress after synchronization completes.
**Validates: Requirements 8.4**

### Property 40: Metadata persistence
*For any* persisted onboarding record, the record should contain non-null timestamp and metadata fields.
**Validates: Requirements 8.5**

### Property 41: Drop-off rate calculation
*For any* consecutive steps S1 and S2, the drop-off rate should equal (users_at_S1 - users_at_S2) / users_at_S1 * 100.
**Validates: Requirements 9.1**

### Property 42: Problematic step identification
*For any* set of steps with abandonment rates R, steps where R > average(R) should be flagged as problematic.
**Validates: Requirements 9.2**

### Property 43: Behavior tracking completeness
*For any* user session visiting steps S1, S2, ..., Sn, time and interaction records should exist for each step.
**Validates: Requirements 9.3**

### Property 44: Abandonment recording
*For any* user abandoning onboarding at step S, the database should contain a record with last_completed_step = S.
**Validates: Requirements 9.4**

### Property 45: Cohort segmentation in reports
*For any* cohort definition C, the generated report should correctly segment users matching C and provide separate metrics.
**Validates: Requirements 9.5**

### Property 46: Required vs optional indication
*For any* step displayed in the UI, a visual indicator should clearly show whether the step is required or optional.
**Validates: Requirements 10.1**

### Property 47: Optional step skip progression
*For any* optional step S, invoking skip should advance the user to the next step without requiring S to be completed.
**Validates: Requirements 10.2**

### Property 48: Skip event recording
*For any* skip action on step S, an analytics event with type 'step_skipped' and step_id = S should be created.
**Validates: Requirements 10.3**

### Property 49: Required steps enforcement
*For any* sequence of skip actions, the system should still prevent activation until all required steps are completed.
**Validates: Requirements 10.4**

### Property 50: Skip value explanation
*For any* optional step with skip option, the UI should contain text explaining the value of completing the step.
**Validates: Requirements 10.5**


## Error Handling

### Error Types

```typescript
// Base onboarding error
class OnboardingError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true
}

// Configuration errors
class InvalidConfigurationError extends OnboardingError {
  constructor(message: string, public configId: string) {
    super(message)
  }
}

class ConfigurationNotFoundError extends OnboardingError {
  readonly statusCode = 404
  constructor(public configId: string) {
    super(`Onboarding configuration not found: ${configId}`)
  }
}

// Progress errors
class ProgressNotFoundError extends OnboardingError {
  readonly statusCode = 404
  constructor(public userId: string) {
    super(`Onboarding progress not found for user: ${userId}`)
  }
}

class InvalidStepTransitionError extends OnboardingError {
  constructor(
    public fromStep: string,
    public toStep: string,
    public reason: string
  ) {
    super(`Invalid step transition from ${fromStep} to ${toStep}: ${reason}`)
  }
}

// Activation errors
class ActivationCriteriaNotMetError extends OnboardingError {
  constructor(
    public userId: string,
    public missingCriteria: string[]
  ) {
    super(`Activation criteria not met: ${missingCriteria.join(', ')}`)
  }
}

// Analytics errors
class AnalyticsTrackingError extends OnboardingError {
  readonly statusCode = 500
  constructor(message: string, public eventData: unknown) {
    super(message)
  }
}
```

### Error Handling Strategies

#### 1. Progress Persistence Failures
```typescript
// Retry strategy for database operations
async function persistProgressWithRetry(
  progress: UserOnboardingProgress,
  maxRetries = 3
): Promise<void> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await progressRepository.save(progress)
      return
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        await delay(Math.pow(2, attempt) * 1000) // Exponential backoff
      }
    }
  }
  
  // Queue for later sync if all retries fail
  await queueForSync(progress)
  throw new ProgressPersistenceError(
    'Failed to persist progress after retries',
    lastError
  )
}
```

#### 2. Network Connectivity Issues
```typescript
// Offline queue management
class OfflineProgressQueue {
  private queue: ProgressUpdate[] = []
  
  async enqueue(update: ProgressUpdate): Promise<void> {
    this.queue.push(update)
    await this.persistQueueToLocalStorage()
  }
  
  async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) return
    
    const updates = [...this.queue]
    this.queue = []
    
    for (const update of updates) {
      try {
        await this.syncUpdate(update)
      } catch (error) {
        // Re-queue failed updates
        this.queue.push(update)
      }
    }
    
    await this.persistQueueToLocalStorage()
  }
}
```

#### 3. Configuration Version Conflicts
```typescript
// Handle configuration changes mid-onboarding
async function getConfigForUser(userId: string): Promise<OnboardingConfig> {
  const progress = await progressRepository.findByUserId(userId)
  
  if (progress && progress.config_id) {
    // User has started onboarding - use their locked config
    return await configRepository.findById(progress.config_id)
  }
  
  // New user - get active config
  return await configRepository.getActive()
}
```

#### 4. Activation Criteria Evaluation Failures
```typescript
// Graceful degradation for activation checks
async function checkActivationSafely(
  userId: string
): Promise<ActivationStatus> {
  try {
    const criteria = await getActivationCriteria()
    const userEvents = await getActivationEvents(userId)
    
    return evaluateActivation(criteria, userEvents)
  } catch (error) {
    // Log error but don't block user experience
    logger.error('Activation check failed', { userId, error })
    
    // Return conservative status
    return ActivationStatus.IN_PROGRESS
  }
}
```

#### 5. Analytics Tracking Failures
```typescript
// Non-blocking analytics
async function trackEventSafely(event: AnalyticsEvent): Promise<void> {
  try {
    await analyticsService.track(event)
  } catch (error) {
    // Never block user flow for analytics failures
    logger.warn('Analytics tracking failed', { event, error })
    
    // Queue for retry
    await analyticsQueue.enqueue(event)
  }
}
```

### User-Facing Error Messages

```typescript
const ERROR_MESSAGES = {
  PROGRESS_SAVE_FAILED: {
    title: 'Progress Not Saved',
    message: 'We couldn\'t save your progress. Your changes will be saved when you\'re back online.',
    action: 'Continue',
    severity: 'warning'
  },
  
  STEP_LOAD_FAILED: {
    title: 'Step Unavailable',
    message: 'We couldn\'t load this step. Please try refreshing the page.',
    action: 'Refresh',
    severity: 'error'
  },
  
  ACTIVATION_CHECK_FAILED: {
    title: 'Status Check Delayed',
    message: 'We\'re having trouble checking your activation status. This won\'t affect your progress.',
    action: 'Dismiss',
    severity: 'info'
  },
  
  NETWORK_ERROR: {
    title: 'Connection Lost',
    message: 'You\'re offline. Your progress will sync when you reconnect.',
    action: 'OK',
    severity: 'warning'
  }
}
```

### Recovery Actions

```typescript
interface RecoveryAction {
  label: string
  handler: () => Promise<void>
  isPrimary: boolean
}

function getRecoveryActions(error: OnboardingError): RecoveryAction[] {
  if (error instanceof ProgressNotFoundError) {
    return [
      {
        label: 'Start Over',
        handler: async () => await startFreshOnboarding(error.userId),
        isPrimary: true
      },
      {
        label: 'Contact Support',
        handler: async () => await openSupportChat(),
        isPrimary: false
      }
    ]
  }
  
  if (error instanceof InvalidStepTransitionError) {
    return [
      {
        label: 'Go Back',
        handler: async () => await navigateToPreviousStep(),
        isPrimary: true
      },
      {
        label: 'Skip Step',
        handler: async () => await skipCurrentStep(),
        isPrimary: false
      }
    ]
  }
  
  // Default recovery
  return [
    {
      label: 'Retry',
      handler: async () => await retryLastAction(),
      isPrimary: true
    }
  ]
}
```


## Testing Strategy

### Dual Testing Approach

The Onboarding & User Activation system requires both unit testing and property-based testing to ensure comprehensive coverage and correctness.

**CRITICAL REQUIREMENT**: All tests must pass with 100% success rate for tasks to be considered complete.

#### Unit Testing Focus
- Specific onboarding flow scenarios (new user, returning user, completed user)
- Error handling for network failures and data inconsistencies
- UI component rendering with various progress states
- Integration between services and repositories
- Analytics event tracking and aggregation

#### Integration Testing Requirements (MANDATORY)

**Real Service Integration**: All integration tests MUST use real services (Supabase, Redis, Clerk) rather than mocks.

**Test Data Lifecycle Management**:
- Each test manages its own test data from creation to cleanup
- Test data is isolated using unique identifiers (UUIDs with test prefixes)
- All test data is cleaned up after test completion
- No test data pollution in shared datastores

**Idempotency and Parallel Execution**:
- Tests must be idempotent (can run multiple times with same result)
- Tests must support parallel execution without conflicts
- Use database transactions for test isolation where possible
- Implement proper cleanup in `afterEach` and `afterAll` hooks

```typescript
// Example: Integration test with real Supabase
describe('OnboardingService Integration', () => {
  let testUserId: string
  let testConfigId: string
  
  beforeEach(async () => {
    // Create isolated test data
    testUserId = `test_user_${crypto.randomUUID()}`
    testConfigId = `test_config_${crypto.randomUUID()}`
    
    await createTestUser(testUserId)
    await createTestConfig(testConfigId)
  })
  
  afterEach(async () => {
    // Clean up test data
    await deleteTestUser(testUserId)
    await deleteTestConfig(testConfigId)
  })
  
  it('should start onboarding with real Supabase', async () => {
    // Test uses real Supabase client
    const session = await OnboardingService.startOnboarding(testUserId)
    
    expect(session.userId).toBe(testUserId)
    expect(session.configId).toBe(testConfigId)
  })
})
```

#### E2E Testing Requirements (MANDATORY)

**Clerk Authentication**: All E2E tests MUST follow official Clerk testing guidelines using @clerk/testing utilities.

**Test Data Management**:
- Each E2E test manages its own seed data
- Tests create and clean up their own users, organizations, and campaigns
- Idempotent execution across multiple runs
- No shared test accounts or data

```typescript
// Example: E2E test with Clerk authentication
import { test, expect } from '@playwright/test'
import { setupClerkTestingToken } from '@clerk/testing/playwright'

test.describe('Onboarding E2E Flow', () => {
  let testUserEmail: string
  
  test.beforeEach(async ({ page }) => {
    // Create unique test user
    testUserEmail = `test_${Date.now()}@example.com`
    
    // Setup Clerk testing token
    await setupClerkTestingToken({ page })
    
    // Create test user via Clerk API
    await createClerkTestUser(testUserEmail)
  })
  
  test.afterEach(async () => {
    // Clean up test user
    await deleteClerkTestUser(testUserEmail)
  })
  
  test('should complete onboarding flow', async ({ page }) => {
    // Authenticate as test user
    await page.goto('/sign-in')
    await page.fill('[data-testid="email"]', testUserEmail)
    await page.fill('[data-testid="password"]', 'TestPassword123!')
    await page.click('[data-testid="sign-in-button"]')
    
    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/)
    
    // Complete onboarding steps
    await completeOnboardingSteps(page)
    
    // Verify activation
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
```

#### Property-Based Testing Focus
- Universal properties that hold across all user journeys
- Progress persistence and restoration across sessions
- Activation criteria evaluation with various user actions
- Funnel metrics calculation with different cohort sizes
- Configuration version isolation during updates

### Property-Based Testing Library

**Selected Library**: `fast-check` for TypeScript/JavaScript
- Mature library with excellent TypeScript support
- Integrates seamlessly with Vitest
- Provides rich set of arbitraries for complex data generation
- Supports async property testing for database operations

### Property-Based Test Configuration

```typescript
// vitest.config.ts additions
export default defineConfig({
  test: {
    // ... existing config
    
    // Property-based tests should run more iterations
    globals: {
      'property-test-runs': 100
    }
  }
})
```

### Property-Based Test Examples

#### Property 1: Authentication redirect to onboarding
```typescript
/**
 * Feature: onboarding-user-activation, Property 1: Authentication redirect to onboarding
 * For any newly authenticated user who has not started onboarding, 
 * accessing the platform should result in a redirect to the onboarding flow URL.
 */
import { test } from 'vitest'
import * as fc from 'fast-check'

test('Property 1: New users redirect to onboarding', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        email: fc.emailAddress(),
        hasStartedOnboarding: fc.constant(false)
      }),
      async (user) => {
        // Create user without onboarding progress
        await createTestUser(user)
        
        // Simulate authentication and platform access
        const response = await authenticateAndAccess(user.userId)
        
        // Should redirect to onboarding
        expect(response.redirectUrl).toMatch(/\/onboarding/)
      }
    ),
    { numRuns: 100 }
  )
})
```

#### Property 7: Progress percentage accuracy
```typescript
/**
 * Feature: onboarding-user-activation, Property 7: Progress percentage accuracy
 * For any user with M completed steps out of N total steps, 
 * the displayed progress percentage should equal (M / N) * 100.
 */
test('Property 7: Progress percentage calculation', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        totalSteps: fc.integer({ min: 3, max: 10 }),
        completedSteps: fc.integer({ min: 0, max: 10 })
      }).filter(({ completedSteps, totalSteps }) => completedSteps <= totalSteps),
      async ({ userId, totalSteps, completedSteps }) => {
        // Setup user with specific progress
        await setupUserProgress(userId, totalSteps, completedSteps)
        
        // Get displayed progress
        const progress = await getOnboardingProgress(userId)
        
        // Calculate expected percentage
        const expectedPercentage = (completedSteps / totalSteps) * 100
        
        // Should match exactly
        expect(progress.percentComplete).toBe(expectedPercentage)
      }
    ),
    { numRuns: 100 }
  )
})
```

#### Property 36: Immediate step persistence
```typescript
/**
 * Feature: onboarding-user-activation, Property 36: Immediate step persistence
 * For any step completion, querying the database within 100ms 
 * should return the completed status.
 */
test('Property 36: Step completion persists immediately', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        userId: fc.uuid(),
        stepId: fc.string({ minLength: 1, maxLength: 50 })
      }),
      async ({ userId, stepId }) => {
        // Setup user in onboarding
        await setupUserInOnboarding(userId)
        
        // Complete step
        const completionTime = Date.now()
        await completeStep(userId, stepId)
        
        // Query immediately (within 100ms)
        const queryTime = Date.now()
        const progress = await getStepCompletion(userId, stepId)
        
        // Should be persisted
        expect(queryTime - completionTime).toBeLessThan(100)
        expect(progress.completed).toBe(true)
      }
    ),
    { numRuns: 100 }
  )
})
```

#### Property 41: Drop-off rate calculation
```typescript
/**
 * Feature: onboarding-user-activation, Property 41: Drop-off rate calculation
 * For any consecutive steps S1 and S2, the drop-off rate should equal 
 * (users_at_S1 - users_at_S2) / users_at_S1 * 100.
 */
test('Property 41: Drop-off rate calculation accuracy', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        step1Id: fc.constant('step1'),
        step2Id: fc.constant('step2'),
        usersAtStep1: fc.integer({ min: 10, max: 100 }),
        usersAtStep2: fc.integer({ min: 0, max: 100 })
      }).filter(({ usersAtStep1, usersAtStep2 }) => usersAtStep2 <= usersAtStep1),
      async ({ step1Id, step2Id, usersAtStep1, usersAtStep2 }) => {
        // Setup test cohort
        await setupTestCohort(step1Id, usersAtStep1, step2Id, usersAtStep2)
        
        // Calculate drop-off
        const analysis = await getDropOffAnalysis()
        const dropOffRate = analysis.getDropOffBetween(step1Id, step2Id)
        
        // Calculate expected
        const expectedRate = ((usersAtStep1 - usersAtStep2) / usersAtStep1) * 100
        
        // Should match
        expect(dropOffRate).toBeCloseTo(expectedRate, 2)
      }
    ),
    { numRuns: 100 }
  )
})
```

### Unit Test Examples

#### Onboarding Flow Component
```typescript
describe('OnboardingFlow Component', () => {
  it('should render current step based on progress', async () => {
    const user = await createTestUser()
    await setProgress(user.id, { currentStep: 'profile_setup' })
    
    render(<OnboardingFlow userId={user.id} />)
    
    expect(screen.getByTestId('step-profile_setup')).toBeInTheDocument()
  })
  
  it('should handle step completion', async () => {
    const user = await createTestUser()
    const onStepComplete = vi.fn()
    
    render(
      <OnboardingFlow 
        userId={user.id} 
        onStepComplete={onStepComplete}
      />
    )
    
    await userEvent.click(screen.getByTestId('complete-step-button'))
    
    expect(onStepComplete).toHaveBeenCalledWith('profile_setup')
  })
  
  it('should show skip option for optional steps', async () => {
    const user = await createTestUser()
    await setCurrentStep(user.id, 'optional_integration')
    
    render(<OnboardingFlow userId={user.id} />)
    
    expect(screen.getByTestId('skip-step-button')).toBeInTheDocument()
  })
})
```

#### ActivationService
```typescript
describe('ActivationService', () => {
  it('should detect activation on first campaign creation', async () => {
    const user = await createTestUser()
    
    await ActivationService.recordActivation(user.id, {
      event_type: ActivationEventType.FIRST_CAMPAIGN_CREATED,
      occurred_at: new Date()
    })
    
    const status = await ActivationService.checkActivation(user.id)
    
    expect(status).toBe(ActivationStatus.ACTIVATED)
  })
  
  it('should calculate time to activation correctly', async () => {
    const user = await createTestUser()
    const startTime = new Date('2024-01-01T00:00:00Z')
    const activationTime = new Date('2024-01-01T01:30:00Z')
    
    await setOnboardingStart(user.id, startTime)
    await recordActivation(user.id, activationTime)
    
    const timeToActivation = await ActivationService.getTimeToActivation(user.id)
    
    expect(timeToActivation).toBe(5400) // 90 minutes in seconds
  })
})
```

#### AnalyticsService
```typescript
describe('AnalyticsService', () => {
  it('should calculate funnel metrics correctly', async () => {
    // Setup test cohort with known metrics
    await setupTestCohort({
      totalUsers: 100,
      step1Completions: 90,
      step2Completions: 75,
      step3Completions: 60
    })
    
    const metrics = await AnalyticsService.getFunnelMetrics()
    
    expect(metrics.totalUsers).toBe(100)
    expect(metrics.stepMetrics[0].completionRate).toBe(90)
    expect(metrics.stepMetrics[1].completionRate).toBeCloseTo(83.33, 2)
    expect(metrics.overallConversionRate).toBe(60)
  })
  
  it('should identify problematic steps', async () => {
    await setupTestCohort({
      step1: { started: 100, completed: 95 }, // 5% drop-off
      step2: { started: 95, completed: 60 },  // 37% drop-off (problematic)
      step3: { started: 60, completed: 55 }   // 8% drop-off
    })
    
    const analysis = await AnalyticsService.getDropOffAnalysis()
    
    expect(analysis.problematicSteps).toHaveLength(1)
    expect(analysis.problematicSteps[0].stepId).toBe('step2')
    expect(analysis.problematicSteps[0].dropOffRate).toBeCloseTo(36.84, 2)
  })
})
```

### Integration Tests

```typescript
describe('Onboarding Integration', () => {
  it('should complete full onboarding flow', async () => {
    const user = await createTestUser()
    
    // Start onboarding
    const session = await OnboardingService.startOnboarding(user.id)
    expect(session.currentStep.id).toBe('profile_setup')
    
    // Complete each step
    await OnboardingService.completeStep(user.id, 'profile_setup')
    await OnboardingService.completeStep(user.id, 'organization_setup')
    await OnboardingService.completeStep(user.id, 'campaign_wizard')
    
    // Should be activated
    const status = await ActivationService.checkActivation(user.id)
    expect(status).toBe(ActivationStatus.ACTIVATED)
    
    // Analytics should be recorded
    const events = await getAnalyticsEvents(user.id)
    expect(events).toHaveLength(3) // One per step
  })
  
  it('should handle offline progress sync', async () => {
    const user = await createTestUser()
    
    // Simulate offline completion
    await simulateOffline()
    await OnboardingService.completeStep(user.id, 'profile_setup')
    
    // Should be queued
    const queue = await getOfflineQueue()
    expect(queue).toHaveLength(1)
    
    // Restore connectivity and sync
    await simulateOnline()
    await syncOfflineQueue()
    
    // Should be persisted
    const progress = await OnboardingService.getProgress(user.id)
    expect(progress.completedSteps).toContain('profile_setup')
  })
})
```

### Test Coverage Requirements

Following the tiered coverage standards:

- **Services (`lib/services/onboarding-*.ts`)**: 100% coverage (critical business logic)
- **Repositories (`lib/repositories/onboarding-*.ts`)**: 95% coverage (data layer)
- **API Routes (`app/api/onboarding/**`)**: 90% coverage (external interfaces)
- **Components (`components/onboarding/**`)**: 85% coverage (UI layer)

**MANDATORY**: All tests must pass with 100% success rate. No failing or skipped tests are acceptable.

### Test Execution

```bash
# Run all tests (must pass 100%)
NODE_OPTIONS="--max-old-space-size=8192" pnpm test

# Run property-based tests only
NODE_OPTIONS="--max-old-space-size=8192" pnpm test --grep "Property"

# Run with coverage (must meet thresholds)
NODE_OPTIONS="--max-old-space-size=16384" pnpm test --coverage

# Run integration tests with real services
NODE_OPTIONS="--max-old-space-size=8192" pnpm test:integration

# Run E2E tests with Clerk authentication
pnpm test:e2e

# Run tests in parallel (idempotent tests only)
NODE_OPTIONS="--max-old-space-size=8192" pnpm test --parallel
```

### Test Data Management Utilities

```typescript
// __tests__/setup/test-data-manager.ts
export class TestDataManager {
  private createdResources: Map<string, () => Promise<void>> = new Map()
  
  async createTestUser(prefix: string = 'test'): Promise<string> {
    const userId = `${prefix}_user_${crypto.randomUUID()}`
    
    await supabase.from('users').insert({
      id: userId,
      clerk_user_id: `clerk_${userId}`,
      email: `${userId}@test.example.com`
    })
    
    // Register cleanup
    this.createdResources.set(userId, async () => {
      await supabase.from('users').delete().eq('id', userId)
    })
    
    return userId
  }
  
  async cleanup(): Promise<void> {
    // Clean up all created resources in reverse order
    const cleanupPromises = Array.from(this.createdResources.values()).reverse()
    await Promise.all(cleanupPromises.map(fn => fn()))
    this.createdResources.clear()
  }
}

// Usage in tests
describe('Integration Test', () => {
  const dataManager = new TestDataManager()
  
  afterEach(async () => {
    await dataManager.cleanup()
  })
  
  it('should test with isolated data', async () => {
    const userId = await dataManager.createTestUser()
    // Test logic...
  })
})
```

### Parallel Test Execution Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Enable parallel execution for idempotent tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution
        isolate: true
      }
    },
    
    // Ensure test isolation
    isolate: true,
    
    // Timeout for integration tests with real services
    testTimeout: 30000,
    hookTimeout: 10000
  }
})
```

