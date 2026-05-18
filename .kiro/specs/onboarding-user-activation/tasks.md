# Implementation Plan

- [ ] 1. Set up database schema and migrations
  - Create database tables for onboarding configurations, user progress, step completions, activation events, analytics events, trial status, and A/B test assignments
  - Define Drizzle ORM schemas with proper types and relations using existing schema patterns
  - Integrate with existing users, organizations, and campaigns tables via foreign keys
  - Create initial migration with all required tables and indexes
  - Set up Row Level Security (RLS) policies for data access control
  - Ensure compatibility with existing Supabase connection pooling and client configuration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.5, 9.1, 9.3, 9.4_

- [ ] 2. Implement repository layer for data access
  - [ ] 2.1 Create OnboardingConfigRepository with CRUD operations
    - Implement methods for creating, reading, updating, and deleting onboarding configurations
    - Add methods for retrieving active configurations and configurations by segment
    - _Requirements: 5.1, 5.3_

  - [ ] 2.2 Write property test for configuration persistence
    - **Property 21: Configuration persistence**
    - **Validates: Requirements 5.1**

  - [ ] 2.3 Create UserProgressRepository for tracking onboarding progress
    - Implement methods for creating, updating, and querying user progress
    - Add methods for resuming onboarding and checking completion status
    - _Requirements: 1.3, 1.4, 8.1, 8.2, 8.5_

  - [ ] 2.4 Write property test for progress persistence
    - **Property 3: Step completion persistence**
    - **Validates: Requirements 1.3**

  - [ ] 2.5 Write property test for position restoration
    - **Property 37: Position restoration on return**
    - **Validates: Requirements 8.2**

  - [ ] 2.6 Create StepCompletionRepository for detailed step tracking
    - Implement methods for recording step starts, completions, and skips
    - Add methods for calculating time spent and tracking interactions
    - _Requirements: 3.2, 9.3_

  - [ ] 2.7 Create ActivationEventRepository for activation tracking
    - Implement methods for recording activation events
    - Add methods for querying activation status and calculating time-to-activation
    - _Requirements: 3.3, 2.4, 6.5_

  - [ ] 2.8 Write property test for activation recording
    - **Property 13: Activation timestamp recording**
    - **Validates: Requirements 3.3**

  - [ ] 2.9 Create AnalyticsEventRepository for event tracking
    - Implement methods for recording analytics events
    - Add methods for querying events by user, session, and type
    - _Requirements: 3.1, 3.2, 7.5, 9.3, 10.3_

  - [ ] 2.10 Create TestDataManager utility for test isolation
    - Implement test data lifecycle management with unique identifiers
    - Add automatic cleanup registration for created resources
    - Support parallel test execution with isolated data
    - Ensure idempotent test data creation and cleanup
    - _Requirements: All data persistence requirements_

  - [ ] 2.11 Write integration tests for repository operations with real Supabase
    - Test CRUD operations using real Supabase client (no mocks)
    - Test error handling for database failures with real scenarios
    - Test query performance with real database
    - Use TestDataManager for isolated test data
    - Ensure 100% test pass rate with proper cleanup
    - _Requirements: All data persistence requirements_

- [ ] 3. Implement core service layer
  - [ ] 3.1 Create OnboardingService for flow management
    - Implement startOnboarding method to initialize user onboarding
    - Implement getProgress method to retrieve current progress
    - Implement completeStep method with validation and persistence
    - Implement skipStep method for optional steps
    - Implement resumeOnboarding method to restore user position
    - Implement completeOnboarding method to finalize the process
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 10.1, 10.2_

  - [ ] 3.2 Write property test for step completion and persistence
    - **Property 36: Immediate step persistence**
    - **Validates: Requirements 8.1**

  - [ ] 3.3 Write property test for onboarding resume
    - **Property 4: Onboarding resume consistency**
    - **Validates: Requirements 1.4**

  - [ ] 3.4 Write property test for optional step skipping
    - **Property 47: Optional step skip progression**
    - **Validates: Requirements 10.2**

  - [ ] 3.5 Create ActivationService for activation logic
    - Implement checkActivation method to evaluate activation criteria
    - Implement recordActivation method to persist activation events
    - Implement getTimeToActivation method for metrics
    - Implement calculateActivationScore method for user scoring
    - _Requirements: 2.4, 3.3, 6.5_

  - [ ] 3.6 Write property test for activation detection
    - **Property 9: First campaign activation trigger**
    - **Validates: Requirements 2.4**

  - [ ] 3.7 Write property test for activation on completion
    - **Property 5: Activation on completion**
    - **Validates: Requirements 1.5**

  - [ ] 3.8 Create AnalyticsService for metrics and reporting
    - Implement trackEvent method for event recording
    - Implement getFunnelMetrics method for funnel analysis
    - Implement getDropOffAnalysis method to identify problematic steps
    - Implement compareCohorts method for cohort analysis
    - Implement getABTestResults method for A/B test reporting
    - _Requirements: 3.4, 3.5, 9.1, 9.2, 9.4, 9.5_

  - [ ] 3.9 Write property test for drop-off rate calculation
    - **Property 41: Drop-off rate calculation**
    - **Validates: Requirements 9.1**

  - [ ] 3.10 Write property test for completion rate aggregation
    - **Property 14: Completion rate aggregation accuracy**
    - **Validates: Requirements 3.4**

  - [ ] 3.11 Write property test for cohort segmentation
    - **Property 15: Cohort segmentation correctness**
    - **Validates: Requirements 3.5**

  - [ ] 3.12 Create ConfigService for configuration management
    - Implement getActiveConfig method to retrieve current configuration
    - Implement updateConfig method with version control
    - Implement getConfigForSegment method for targeted configurations
    - Implement createVariant method for A/B testing
    - Implement assignToVariant method for user assignment
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 3.13 Write property test for configuration version isolation
    - **Property 23: Configuration version isolation**
    - **Validates: Requirements 5.3**

  - [ ] 3.14 Write property test for A/B test assignment
    - **Property 24: A/B test variant assignment**
    - **Validates: Requirements 5.4**

  - [ ] 3.15 Write integration tests for service layer with real services
    - Test service methods with real Supabase and Redis
    - Test error handling and edge cases with real failure scenarios
    - Test integration between services using real datastores
    - Use TestDataManager for isolated test data
    - Ensure idempotent tests supporting parallel execution
    - Verify 100% test pass rate
    - _Requirements: All service-related requirements_

- [ ] 4. Checkpoint - Ensure all tests pass with 100% success rate
  - Verify all tests pass with 100% success rate (no failures or skips)
  - Confirm test data cleanup is working properly
  - Verify tests are idempotent and support parallel execution
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement UI components for onboarding flow
  - [ ] 5.1 Create OnboardingFlow component
    - Implement step rendering based on current progress
    - Add navigation controls for moving between steps
    - Implement automatic progress saving
    - Add skip functionality for optional steps
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.2_

  - [ ] 5.2 Write property test for progress tracker completeness
    - **Property 2: Progress tracker completeness**
    - **Validates: Requirements 1.2**

  - [ ] 5.3 Create ProgressTracker component
    - Implement visual progress indicator with percentage
    - Show current step highlighting
    - Display required vs optional step indicators
    - Allow navigation to completed steps
    - _Requirements: 1.2, 2.2, 10.1_

  - [ ] 5.4 Write property test for progress percentage
    - **Property 7: Progress percentage accuracy**
    - **Validates: Requirements 2.2**

  - [ ] 5.5 Create TrialDashboard component
    - Display remaining trial days prominently
    - Show activation progress with visual indicators
    - Provide continue-onboarding call-to-action
    - Implement celebration UI for activation milestones
    - Show upgrade prompt when trial expires
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 5.6 Write property test for trial days calculation
    - **Property 6: Trial days calculation**
    - **Validates: Requirements 2.1**

  - [ ] 5.7 Write property test for incomplete onboarding CTA
    - **Property 8: Incomplete onboarding CTA presence**
    - **Validates: Requirements 2.3**

  - [ ] 5.8 Write property test for trial expiration prompt
    - **Property 10: Trial expiration prompt**
    - **Validates: Requirements 2.5**

  - [ ] 5.9 Create CampaignWizard component
    - Implement simplified campaign creation flow for first-time users
    - Add template selection and preview
    - Implement smart defaults based on user profile
    - Add validation and helpful error messages
    - Show success celebration on completion
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 5.10 Write property test for first campaign flow
    - **Property 26: First campaign simplified flow**
    - **Validates: Requirements 6.1**

  - [ ] 5.11 Write property test for campaign validation
    - **Property 29: Campaign validation completeness**
    - **Validates: Requirements 6.4**

  - [ ] 5.12 Create HelpSystem component
    - Implement context-aware tooltips and inline documentation
    - Add help resource display based on current step
    - Implement stuck user detection and help offering
    - Provide skip options with value explanations
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.5_

  - [ ] 5.13 Write property test for step instructions presence
    - **Property 16: Step instructions presence**
    - **Validates: Requirements 4.1**

  - [ ] 5.14 Write property test for error message completeness
    - **Property 17: Error message completeness**
    - **Validates: Requirements 4.2**

  - [ ] 5.15 Write unit tests for UI components
    - Test component rendering with various props
    - Test user interactions and event handlers
    - Test accessibility compliance
    - _Requirements: All UI-related requirements_

- [ ] 6. Implement progressive disclosure system
  - [ ] 6.1 Create FeatureGate component for conditional feature display
    - Implement feature visibility logic based on user progress
    - Add smooth transitions for feature revelation
    - Provide contextual introductions for new features
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 6.2 Write property test for essential features display
    - **Property 31: Essential features for new users**
    - **Validates: Requirements 7.1**

  - [ ] 6.3 Write property test for progressive revelation
    - **Property 32: Progressive feature revelation**
    - **Validates: Requirements 7.2**

  - [ ] 6.4 Create FeatureDiscoveryService for tracking feature engagement
    - Implement feature interaction tracking
    - Add proficiency calculation logic
    - Implement feature unlocking based on proficiency
    - _Requirements: 7.4, 7.5_

  - [ ] 6.5 Write property test for feature engagement tracking
    - **Property 35: Feature engagement tracking**
    - **Validates: Requirements 7.5**

  - [ ] 6.6 Write unit tests for progressive disclosure
    - Test feature gating logic
    - Test proficiency calculations
    - Test feature unlocking scenarios
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7. Implement offline support and synchronization
  - [ ] 7.1 Create OfflineProgressQueue for queuing updates
    - Implement queue management with local storage persistence
    - Add automatic sync when connectivity is restored
    - Implement conflict resolution for concurrent updates
    - _Requirements: 8.3, 8.4_

  - [ ] 7.2 Write property test for offline progress queuing
    - **Property 38: Offline progress queuing**
    - **Validates: Requirements 8.3**

  - [ ] 7.3 Create SyncService for cross-device synchronization
    - Implement progress synchronization across devices
    - Add conflict detection and resolution
    - Implement optimistic UI updates
    - _Requirements: 8.4_

  - [ ] 7.4 Write property test for cross-device sync
    - **Property 39: Cross-device synchronization**
    - **Validates: Requirements 8.4**

  - [ ] 7.5 Write integration tests for offline support with real services
    - Test offline queue behavior with real local storage
    - Test sync after reconnection with real Supabase
    - Test conflict resolution with real concurrent updates
    - Use TestDataManager for isolated test data
    - Ensure idempotent execution
    - _Requirements: 8.3, 8.4_

- [ ] 8. Implement API routes for onboarding
  - [ ] 8.1 Create POST /api/onboarding/start endpoint
    - Validate user authentication
    - Initialize onboarding session
    - Return current configuration and first step
    - _Requirements: 1.1, 3.1_

  - [ ] 8.2 Write property test for onboarding start recording
    - **Property 11: Onboarding start recording**
    - **Validates: Requirements 3.1**

  - [ ] 8.3 Create GET /api/onboarding/progress endpoint
    - Validate user authentication
    - Retrieve current progress
    - Return progress data with completion percentage
    - _Requirements: 1.4, 2.2, 8.2_

  - [ ] 8.4 Create POST /api/onboarding/step/complete endpoint
    - Validate user authentication and step ID
    - Record step completion with timestamp
    - Update progress and check for activation
    - Return updated progress
    - _Requirements: 1.3, 3.2, 8.1_

  - [ ] 8.5 Write property test for step completion recording
    - **Property 12: Step completion recording**
    - **Validates: Requirements 3.2**

  - [ ] 8.6 Create POST /api/onboarding/step/skip endpoint
    - Validate user authentication and step ID
    - Verify step is optional
    - Record skip event
    - Return updated progress
    - _Requirements: 10.2, 10.3_

  - [ ] 8.7 Write property test for skip event recording
    - **Property 48: Skip event recording**
    - **Validates: Requirements 10.3**

  - [ ] 8.8 Create GET /api/onboarding/activation endpoint
    - Validate user authentication
    - Check activation status
    - Return activation data and time-to-activation
    - _Requirements: 2.4, 3.3_

  - [ ] 8.9 Create GET /api/analytics/funnel endpoint
    - Validate admin authentication
    - Calculate funnel metrics
    - Return aggregated data with drop-off analysis
    - _Requirements: 3.4, 9.1, 9.2_

  - [ ] 8.10 Create GET /api/analytics/cohorts endpoint
    - Validate admin authentication
    - Segment users by cohort criteria
    - Return comparative metrics
    - _Requirements: 3.5, 9.5_

  - [ ] 8.11 Write integration tests for API routes with real services
    - Test authentication and authorization with real Clerk
    - Test request validation with real data
    - Test response formatting with real database queries
    - Test error handling with real failure scenarios
    - Use TestDataManager for isolated test data
    - Ensure 100% test pass rate
    - _Requirements: All API-related requirements_

- [ ] 9. Checkpoint - Ensure all tests pass with 100% success rate
  - Verify all tests pass with 100% success rate (no failures or skips)
  - Confirm integration tests use real services (Supabase, Redis, Clerk)
  - Verify test data cleanup is working across all test suites
  - Ensure tests support parallel execution
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement authentication integration
  - [ ] 10.1 Create onboarding redirect middleware
    - Check user onboarding status after authentication
    - Redirect new users to onboarding flow
    - Allow returning users to resume or access dashboard
    - _Requirements: 1.1_

  - [ ] 10.2 Write property test for authentication redirect
    - **Property 1: Authentication redirect to onboarding**
    - **Validates: Requirements 1.1**

  - [ ] 10.3 Create Clerk webhook handler for user creation
    - Listen for user.created events
    - Initialize trial status
    - Create onboarding progress record
    - _Requirements: 2.1, 3.1_

  - [ ] 10.4 Write integration tests for authentication flow with real Clerk
    - Test new user redirect with real Clerk authentication
    - Test returning user access with real session management
    - Test webhook handling with real Clerk webhook events
    - Use TestDataManager for isolated test users
    - Ensure idempotent execution
    - _Requirements: 1.1, 2.1, 3.1_

- [ ] 11. Implement admin configuration interface
  - [ ] 11.1 Create ConfigurationEditor component
    - Implement UI for defining onboarding steps
    - Add step ordering and configuration
    - Implement activation criteria editor
    - Add configuration preview
    - _Requirements: 5.1, 5.2_

  - [ ] 11.2 Create ABTestManager component
    - Implement variant creation and management
    - Add user assignment controls
    - Display test results and metrics
    - _Requirements: 5.4, 5.5_

  - [ ] 11.3 Write property test for variant metrics comparison
    - **Property 25: Variant metrics comparison**
    - **Validates: Requirements 5.5**

  - [ ] 11.4 Write unit tests for admin interface
    - Test configuration editing
    - Test A/B test management
    - Test metrics display
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 12. Implement analytics dashboard
  - [ ] 12.1 Create FunnelVisualization component
    - Display funnel metrics with visual charts
    - Highlight drop-off points
    - Show completion rates by step
    - _Requirements: 3.4, 9.1, 9.2_

  - [ ] 12.2 Write property test for problematic step identification
    - **Property 42: Problematic step identification**
    - **Validates: Requirements 9.2**

  - [ ] 12.3 Create CohortComparison component
    - Display cohort metrics side-by-side
    - Highlight significant differences
    - Show time-to-activation distributions
    - _Requirements: 3.5, 9.5_

  - [ ] 12.4 Create UserJourneyTimeline component
    - Display individual user onboarding journeys
    - Show time spent on each step
    - Highlight abandonment points
    - _Requirements: 9.3, 9.4_

  - [ ] 12.5 Write property test for behavior tracking completeness
    - **Property 43: Behavior tracking completeness**
    - **Validates: Requirements 9.3**

  - [ ] 12.6 Write unit tests for analytics dashboard
    - Test chart rendering
    - Test data aggregation
    - Test filtering and segmentation
    - _Requirements: 3.4, 3.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13. Implement error handling and recovery
  - [ ] 13.1 Create error handling utilities
    - Implement retry logic with exponential backoff
    - Add error classification and user-friendly messages
    - Implement recovery action suggestions
    - _Requirements: 4.2_

  - [ ] 13.2 Create ErrorBoundary component for onboarding
    - Catch and handle React errors gracefully
    - Display helpful error messages
    - Provide recovery actions
    - _Requirements: 4.2_

  - [ ] 13.3 Write unit tests for error handling
    - Test retry logic
    - Test error message formatting
    - Test recovery actions
    - _Requirements: 4.2_

- [ ] 14. Implement E2E tests with Clerk authentication
  - [ ] 14.1 Setup E2E testing infrastructure with @clerk/testing
    - Install and configure @clerk/testing for Playwright
    - Create E2E test data management utilities
    - Setup test user creation and cleanup via Clerk API
    - _Requirements: All E2E requirements_

  - [ ] 14.2 Write E2E test for complete onboarding flow
    - Create unique test user with Clerk authentication
    - Test full onboarding journey from sign-in to activation
    - Verify all steps complete successfully
    - Clean up test user and data after test
    - Ensure idempotent execution across multiple runs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 14.3 Write E2E test for trial dashboard and activation
    - Test trial status display and countdown
    - Test first campaign creation flow
    - Verify activation celebration and status update
    - Manage test data lifecycle completely
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 14.4 Write E2E test for progressive disclosure
    - Test feature gating for new users
    - Test feature revelation as user progresses
    - Verify contextual introductions display
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 14.5 Write E2E test for skip functionality
    - Test optional step skip flow
    - Verify skip events are recorded
    - Ensure activation still requires required steps
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15. Final checkpoint - Comprehensive testing with 100% success
  - Verify ALL tests pass with 100% success rate (unit, integration, property, E2E)
  - Confirm all integration tests use real services (no mocks)
  - Verify all E2E tests follow Clerk authentication guidelines
  - Confirm test data management is working across all test types
  - Verify tests are idempotent and support parallel execution
  - Validate coverage thresholds are met (100% services, 95% models, 90% APIs, 85% global)
  - Ensure all tests pass, ask the user if questions arise.
