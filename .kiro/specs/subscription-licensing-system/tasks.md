# Implementation Plan

## Phase 1: Foundation and Infrastructure

- [ ] 1. Install dependencies and configure Stripe SDK
  - Install Stripe SDK: `pnpm add stripe @stripe/stripe-js`
  - Install fast-check for property-based testing: `pnpm add -D fast-check`
  - Configure Stripe environment variables in Phase.dev (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET)
  - Create Stripe client utility in `lib/stripe/client.ts`
  - _Requirements: 3.1_

- [ ] 2. Create subscription database schema and migrations
  - Create migration file: `supabase/migrations/20240120000000_subscription_schema.sql`
  - Define subscription_plans table with tier, features, limits, and pricing
  - Define subscriptions table linking to users and organizations
  - Define usage_records table for tracking consumption
  - Define usage_quotas table for current period aggregates
  - Define billing_events table for Stripe webhook events
  - Define feature_flags table for subscription-based features
  - Define invoices table for billing records
  - Add proper indexes for performance (subscription_id, user_id, organization_id, recorded_at)
  - Create updated_at triggers following existing pattern
  - _Requirements: 1.1, 3.1, 5.1_

- [ ] 3. Create subscription data models and types
  - Create `lib/models/subscription-types.ts` with database row types (snake_case)
  - Define Plan, Subscription, UsageRecord, UsageQuota, Invoice interfaces (camelCase)
  - Create transformer functions in `lib/models/subscription-transformers.ts`
  - Extend TypedSupabaseClient in `lib/models/subscription-database.ts`
  - Add Zod validation schemas in `lib/validation/subscription-schemas.ts`
  - _Requirements: 1.1, 2.1_

- [ ]* 3.1 Write property test for data model transformations
  - **Property 1: Plan creation completeness** - Validates: Requirements 1.1
  - Test that all plan creation requests include feature gates, usage quotas, and pricing tiers
  - Use fast-check generators for plan data
  - _Requirements: 1.1_

## Phase 2: Core Subscription Services

- [ ] 4. Implement PlanService for subscription plan management
  - Create `lib/services/plan-service.ts` with CRUD operations
  - Implement getPlans(), getPlan(), createPlan(), updatePlan()
  - Add getFeatureFlags() for plan-based feature access
  - Implement validatePlanLimits() for usage validation
  - Add comparePlans() and calculatePricing() for pricing tools
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.2, 8.4_

- [ ]* 4.1 Write property tests for PlanService
  - **Property 2: Plan feature configuration** - Validates: Requirements 1.2
  - **Property 4: Plan detail completeness** - Validates: Requirements 1.4
  - Test plan CRUD operations with random valid data
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 5. Implement SubscriptionService for subscription lifecycle
  - Create `lib/services/subscription-service.ts` with Stripe integration
  - Implement createSubscription() with Stripe customer and subscription creation
  - Add updateSubscription() for plan changes
  - Implement upgradeSubscription() with immediate activation and prorated billing
  - Implement downgradeSubscription() with next-cycle scheduling
  - Add cancelSubscription() with end-of-period option
  - Implement reactivateSubscription() for canceled subscriptions
  - Add getSubscription(), getUserSubscriptions(), getOrganizationSubscription()
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [ ]* 5.1 Write property tests for SubscriptionService
  - **Property 6: Feature activation on subscription** - Validates: Requirements 2.5
  - **Property 7: Stripe record creation** - Validates: Requirements 3.1
  - **Property 11: Immediate upgrade activation** - Validates: Requirements 4.1
  - **Property 12: Downgrade scheduling** - Validates: Requirements 4.2
  - **Property 13: Cancellation access maintenance** - Validates: Requirements 4.3
  - **Property 14: Reactivation restoration** - Validates: Requirements 4.4
  - Test subscription lifecycle with Stripe test mode
  - _Requirements: 2.5, 3.1, 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Implement BillingService for Stripe payment processing
  - Create `lib/services/billing-service.ts` for Stripe operations
  - Implement createCustomer() for Stripe customer creation
  - Add createPaymentIntent() for payment processing
  - Implement processInvoice() for invoice generation
  - Add handlePaymentFailure() with retry logic
  - Implement getBillingHistory() for customer billing records
  - Add calculateProration() for plan changes
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 6.1 Write property tests for BillingService
  - **Property 8: Payment failure handling** - Validates: Requirements 3.3
  - **Property 9: Billing history completeness** - Validates: Requirements 3.4
  - Test payment processing and failure scenarios
  - _Requirements: 3.3, 3.4_

## Phase 3: Usage Tracking and Quota Enforcement

- [ ] 7. Set up Redis for usage tracking cache
  - Install Redis client: `pnpm add ioredis` (already installed)
  - Create `lib/cache/redis-client.ts` for Redis connection
  - Implement cache key patterns for quotas and usage
  - Add TTL management for billing period boundaries
  - _Requirements: 5.1, 5.2_

- [ ] 8. Implement UsageTrackingService for usage monitoring
  - Create `lib/services/usage-tracking-service.ts`
  - Implement recordUsage() for tracking consumption events
  - Add getCurrentUsage() for real-time usage retrieval
  - Implement checkQuota() with Redis caching for performance
  - Add getUsageHistory() for historical data
  - Implement getTeamUsage() for organization-level tracking
  - Add resetUsage() for billing period rollover
  - Implement sendUsageWarning() for threshold notifications
  - Add analyzeUsagePatterns() and recommendPlanUpgrade()
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3_

- [ ]* 8.1 Write property tests for UsageTrackingService
  - **Property 16: Usage event recording** - Validates: Requirements 5.1
  - **Property 17: Warning threshold triggers** - Validates: Requirements 5.2
  - **Property 18: Usage dashboard accuracy** - Validates: Requirements 5.3
  - **Property 19: Quota enforcement with availability** - Validates: Requirements 5.4
  - **Property 20: Usage-based recommendations** - Validates: Requirements 5.5
  - Test usage tracking and quota checks with random data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Implement usage middleware for quota enforcement
  - Create `lib/middleware/usage-middleware.ts`
  - Implement trackRequest() for automatic usage recording
  - Add enforceQuota() for real-time limit checking
  - Implement logUsageEvent() for async event logging
  - _Requirements: 5.4_

- [ ]* 9.1 Write property tests for usage middleware
  - **Property 5: Quota enforcement** - Validates: Requirements 1.5
  - Test middleware quota enforcement with various limits
  - _Requirements: 1.5, 5.4_

## Phase 4: Team Subscription Management

- [ ] 10. Extend SubscriptionService for team subscriptions
  - Add organization-based subscription creation
  - Implement seat allocation logic in subscription metadata
  - Add member assignment validation against seat limits
  - _Requirements: 6.1, 6.2_

- [ ] 11. Implement TeamManagementService for team operations
  - Create `lib/services/team-management-service.ts`
  - Implement allocateSeats() for seat management
  - Add assignMember() and removeMember() for member operations
  - Implement validateSeatLimit() for capacity checks
  - Add getTeamMembers() and getTeamUsageBreakdown()
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 11.1 Write property tests for TeamManagementService
  - **Property 21: Seat allocation and assignment** - Validates: Requirements 6.1
  - **Property 22: Seat limit validation** - Validates: Requirements 6.2
  - **Property 23: Team usage visibility** - Validates: Requirements 6.3
  - **Property 24: Billing consolidation** - Validates: Requirements 6.4
  - **Property 25: Team limit enforcement** - Validates: Requirements 6.5
  - Test team operations with random seat counts and members
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

## Phase 5: Stripe Webhook Integration

- [ ] 12. Implement Stripe webhook handler
  - Create `app/api/webhooks/stripe/route.ts`
  - Implement webhook signature verification
  - Add event handlers for subscription.created, subscription.updated, subscription.canceled
  - Implement invoice.payment_succeeded and invoice.payment_failed handlers
  - Add customer.subscription.deleted handler
  - Store webhook events in billing_events table
  - _Requirements: 3.2, 3.3_

- [ ]* 12.1 Write integration tests for webhook processing
  - **Property 10: Subscription expiration enforcement** - Validates: Requirements 3.5
  - Test webhook processing with Stripe test events
  - Verify signature validation and event handling
  - _Requirements: 3.2, 3.3, 3.5_

## Phase 6: API Endpoints

- [ ] 13. Create subscription management API endpoints
  - Create `app/api/subscriptions/route.ts` for subscription CRUD
  - Create `app/api/subscriptions/[id]/route.ts` for individual subscription operations
  - Create `app/api/subscriptions/[id]/upgrade/route.ts` for upgrades
  - Create `app/api/subscriptions/[id]/downgrade/route.ts` for downgrades
  - Create `app/api/subscriptions/[id]/cancel/route.ts` for cancellations
  - Add authentication and authorization checks
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 9.1_

- [ ]* 13.1 Write integration tests for subscription API
  - **Property 34: Subscription API completeness** - Validates: Requirements 9.1
  - Test all subscription endpoints with real Supabase and Stripe test mode
  - _Requirements: 9.1_

- [ ] 14. Create usage tracking API endpoints
  - Create `app/api/usage/current/route.ts` for current usage
  - Create `app/api/usage/history/route.ts` for historical data
  - Create `app/api/quotas/check/route.ts` for quota validation
  - Add subscription-based API authentication
  - _Requirements: 5.2, 5.3, 9.2, 9.3_

- [ ]* 14.1 Write integration tests for usage API
  - **Property 35: Usage API authentication** - Validates: Requirements 9.2
  - **Property 36: Quota API real-time accuracy** - Validates: Requirements 9.3
  - Test usage endpoints with authentication
  - _Requirements: 9.2, 9.3_

- [ ] 15. Create plan management API endpoints
  - Create `app/api/plans/route.ts` for plan listing
  - Create `app/api/plans/[id]/route.ts` for plan details
  - Create `app/api/plans/compare/route.ts` for plan comparison
  - Add admin-only endpoints for plan creation/updates
  - _Requirements: 1.1, 1.4, 8.1, 8.3_

- [ ]* 15.1 Write integration tests for plan API
  - **Property 3: Plan update propagation** - Validates: Requirements 1.3
  - Test plan endpoints with various scenarios
  - _Requirements: 1.3, 1.4_

## Phase 7: Analytics and Reporting

- [ ] 16. Implement AnalyticsService for subscription metrics
  - Create `lib/services/analytics-service.ts`
  - Implement generateSubscriptionReport() for revenue and churn
  - Add getRevenueMetrics(), getChurnMetrics(), getGrowthMetrics()
  - Implement analyzeUsagePatterns() for trend analysis
  - Add trackCustomerLifecycle() for customer journey tracking
  - Implement detectAnomalies() for fraud detection
  - Add exportAnalytics() for CSV/JSON export
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 16.1 Write property tests for AnalyticsService
  - **Property 26: Report metric completeness** - Validates: Requirements 7.1
  - **Property 27: Trend identification** - Validates: Requirements 7.2
  - **Property 28: Lifecycle tracking completeness** - Validates: Requirements 7.3
  - **Property 29: Export format support** - Validates: Requirements 7.4
  - **Property 30: Anomaly alerting** - Validates: Requirements 7.5
  - Test analytics calculations with random data
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

## Phase 8: Notification System

- [ ] 17. Implement NotificationService for subscription events
  - Create `lib/services/notification-service.ts`
  - Implement sendPaymentFailureNotification()
  - Add sendUsageWarningNotification() for quota thresholds
  - Implement sendPlanChangeNotification() for upgrades/downgrades
  - Add sendQuotaAdjustmentNotification() for limit changes
  - Implement sendAnomalyAlert() for admin notifications
  - Add configureNotificationPreferences() for user settings
  - _Requirements: 3.3, 4.5, 5.2_

- [ ]* 17.1 Write property tests for NotificationService
  - **Property 15: Quota adjustment notification** - Validates: Requirements 4.5
  - Test notification triggering with various events
  - _Requirements: 3.3, 4.5, 5.2_

## Phase 9: Subscription Middleware and Feature Gates

- [ ] 18. Implement subscription middleware
  - Create `lib/middleware/subscription-middleware.ts`
  - Implement requireActiveSubscription() for route protection
  - Add requireFeature() for feature-based access control
  - Implement checkPlanAccess() for tier-based restrictions
  - _Requirements: 1.4, 1.5, 2.5_

- [ ]* 18.1 Write property tests for subscription middleware
  - **Property 38: API permission enforcement** - Validates: Requirements 9.5
  - Test middleware with various subscription states
  - _Requirements: 1.4, 1.5, 9.5_

## Phase 10: User Interface Components

- [ ] 19. Create pricing and plan comparison components
  - Create `components/subscription/pricing-page.tsx`
  - Build `components/subscription/plan-comparison.tsx` with feature matrix
  - Implement `components/subscription/pricing-calculator.tsx`
  - Add `components/subscription/usage-estimator.tsx`
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 19.1 Write component tests for pricing UI
  - **Property 31: Cost calculation accuracy** - Validates: Requirements 8.2
  - **Property 32: Plan comparison completeness** - Validates: Requirements 8.3
  - **Property 33: Usage estimation accuracy** - Validates: Requirements 8.4
  - Test pricing components with various inputs
  - _Requirements: 8.2, 8.3, 8.4_

- [ ] 20. Create subscription management UI components
  - Create `components/subscription/subscription-dashboard.tsx`
  - Build `components/subscription/subscription-settings.tsx`
  - Implement `components/subscription/upgrade-flow.tsx` with Stripe Elements
  - Add `components/subscription/billing-history.tsx`
  - Create `components/subscription/invoice-download.tsx`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 20.1 Write component tests for subscription UI
  - Test subscription management workflows
  - Verify Stripe Elements integration
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 21. Create usage dashboard components
  - Create `components/subscription/usage-dashboard.tsx`
  - Build `components/subscription/usage-meter.tsx` for quota visualization
  - Implement `components/subscription/usage-chart.tsx` with Recharts
  - Add `components/subscription/usage-warnings.tsx` for threshold alerts
  - Create `components/subscription/team-usage-view.tsx` for organizations
  - _Requirements: 5.2, 5.3, 6.3, 7.1, 7.2_

- [ ]* 21.1 Write component tests for usage UI
  - Test usage visualization components
  - Verify warning threshold displays
  - _Requirements: 5.2, 5.3_

## Phase 11: Webhook Delivery System

- [ ] 22. Implement customer webhook system
  - Create `lib/services/webhook-delivery-service.ts`
  - Implement webhook configuration management
  - Add HMAC signature generation for webhook security
  - Implement retry logic with exponential backoff
  - Add webhook event queue for reliable delivery
  - _Requirements: 9.4_

- [ ]* 22.1 Write integration tests for webhook delivery
  - **Property 37: Webhook delivery** - Validates: Requirements 9.4
  - Test webhook delivery and retry logic
  - _Requirements: 9.4_

## Phase 12: Error Handling and Validation

- [ ] 23. Create subscription error classes
  - Create `lib/errors/subscription-errors.ts`
  - Define SubscriptionNotFound, InactiveSubscription, PlanNotAvailable
  - Add PaymentFailed, SubscriptionLimitExceeded errors
  - Define QuotaExceeded, InvalidMetric, UsageTrackingFailed
  - Add InvoiceGenerationFailed, WebhookProcessingFailed errors
  - Implement error response formatting
  - _Requirements: All requirements - error handling_

- [ ]* 23.1 Write error handling tests
  - Test error scenarios for all services
  - Verify error response formats
  - _Requirements: All requirements_

## Phase 13: Admin Tools

- [ ] 24. Create admin subscription management interface
  - Create `app/admin/subscriptions/page.tsx` for subscription overview
  - Build `components/admin/subscription-override.tsx` for support actions
  - Implement `components/admin/usage-monitoring.tsx` for anomaly detection
  - Add `components/admin/bulk-operations.tsx` for plan migrations
  - _Requirements: 7.1, 7.5_

- [ ]* 24.1 Write admin workflow tests
  - Test admin operations and overrides
  - Verify bulk operation functionality
  - _Requirements: 7.1, 7.5_

## Phase 14: Integration and E2E Testing

- [ ] 25. Write comprehensive integration tests
  - Create `__tests__/integration/subscription-lifecycle.integration.test.ts`
  - Test complete subscription flow with real Stripe test mode
  - Verify database consistency across operations
  - Test usage tracking with real Redis
  - _Requirements: All requirements_

- [ ] 26. Write end-to-end tests
  - Create `__tests__/e2e/subscription-flow.e2e.test.ts`
  - Test user subscription journey from signup to cancellation
  - Verify payment processing with Stripe test cards
  - Test usage enforcement and quota limits
  - Use official Clerk testing utilities for authentication
  - _Requirements: All requirements_

- [ ] 27. Write performance tests
  - Create `__tests__/performance/usage-tracking-performance.test.ts`
  - Test high-volume usage recording (1000+ events/second)
  - Verify quota check performance (<10ms average)
  - Test concurrent subscription operations
  - _Requirements: 5.1, 5.4_

## Phase 15: Documentation and Deployment

- [ ] 28. Create API documentation
  - Document all subscription API endpoints with request/response examples
  - Add usage API documentation with authentication details
  - Document webhook payload formats and signature verification
  - Create integration guide for programmatic access
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 29. Write user documentation
  - Create subscription management guide
  - Document plan comparison and pricing
  - Add usage monitoring and quota management guide
  - Write team subscription administration guide
  - _Requirements: All requirements_

- [ ] 30. Final validation and deployment preparation
  - Run full test suite: `pnpm test`
  - Verify coverage thresholds: `pnpm test:coverage`
  - Run type checking: `pnpm typecheck`
  - Run linting: `pnpm lint`
  - Verify build: `pnpm build`
  - Test Vercel deployment configuration
  - Validate Phase.dev environment variables
  - _Requirements: All requirements_