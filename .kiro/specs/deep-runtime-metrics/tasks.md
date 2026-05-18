# Implementation Plan

- [ ] 1. Set up database schema and migrations
  - Create Drizzle ORM schema for metrics tables
  - Generate migration files following existing patterns
  - Run migrations against test database
  - Verify schema creation and indexes
  - _Requirements: All data model requirements_

- [ ] 1.1 Create metrics database schema
  - Create `apps/web/lib/db/schema/metrics.ts` with Drizzle schema definitions
  - Define metricEvents, aggregatedMetrics, performanceMetrics, userSessions tables
  - Include proper indexes and constraints
  - _Requirements: Data Models section_

- [ ] 1.2 Generate and apply database migrations
  - Run `pnpm db:generate` to create migration files
  - Review generated SQL migrations
  - Apply migrations to test database using `pnpm db:migrate`
  - Verify tables and indexes created correctly
  - _Requirements: Data Models section_

- [ ] 1.3 Write property test for database schema
  - **Property 1: Event capture completeness**
  - **Validates: Requirements 1.1, 1.2**

- [ ] 2. Implement client-side event collection
  - Create Event Collector singleton
  - Implement Privacy Filter for PII removal
  - Create local queue with IndexedDB storage
  - Implement automatic batching and flushing
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3_

- [ ] 2.1 Create Event Collector service
  - Create `apps/web/lib/services/metrics/event-collector.ts`
  - Implement singleton pattern with global access
  - Add track(), trackPageView(), trackPerformance() methods
  - Implement automatic batching (50 events or 5 seconds)
  - Add beforeunload event handler for flush
  - _Requirements: 1.1, 1.2_

- [ ] 2.2 Implement Privacy Filter
  - Create `apps/web/lib/services/metrics/privacy-filter.ts`
  - Implement PII detection and removal
  - Add SHA-256 hashing for user ID anonymization
  - Implement consent-based collection rules
  - Add URL parameter sanitization
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2.3 Write property test for Privacy Filter
  - **Property 4: Privacy filter completeness**
  - **Validates: Requirements 2.1, 2.3**

- [ ] 2.4 Create local event queue
  - Implement IndexedDB storage for offline support
  - Add queue operations (enqueue, dequeue, clear)
  - Implement capacity limits (1000 events max)
  - Add queue persistence and recovery
  - _Requirements: 1.3, 8.1, 8.2_

- [ ] 2.5 Write property test for event queuing
  - **Property 2: Non-blocking event queuing**
  - **Property 3: Event validation before queuing**
  - **Validates: Requirements 1.3, 1.5**

- [ ] 2.6 Write property test for offline persistence
  - **Property 19: Offline event persistence**
  - **Validates: Requirements 8.1, 8.2**

- [ ] 3. Create event ingestion API (Edge Function)
  - Create API route at `/api/metrics/ingest`
  - Implement Zod validation schemas
  - Add rate limiting per client
  - Integrate with Upstash Redis queue
  - _Requirements: 1.1, 1.5, 8.1_

- [ ] 3.1 Create ingestion API route
  - Create `apps/web/app/api/metrics/ingest/route.ts`
  - Implement POST handler with Zod validation
  - Add request size limit (1MB)
  - Configure CORS using existing Vercel headers
  - Return IngestResponse with accepted/rejected counts
  - _Requirements: 1.1, 1.5_

- [ ] 3.2 Implement rate limiting
  - Add per-client rate limiting (1000 req/min)
  - Use Upstash Redis for rate limit tracking
  - Return 429 status when rate limit exceeded
  - _Requirements: 7.5, 10.1_

- [ ] 3.3 Integrate with Redis queue
  - Install bullmq package
  - Create BullMQ queue with Upstash Redis connection
  - Enqueue validated events to Redis
  - Configure queue options (retry, backoff)
  - _Requirements: 8.1, 8.3_

- [ ] 3.4 Write integration test for ingestion API
  - Test with real Upstash Redis
  - Create unique test events with timestamps
  - Verify events queued correctly
  - Cleanup test data after completion
  - _Requirements: 1.1, 1.5, 8.1_

- [ ] 4. Implement server-side processing service
  - Create Processing Service for event enrichment
  - Implement BullMQ queue consumer
  - Add event validation and enrichment
  - Configure worker pool and retry logic
  - _Requirements: 1.5, 8.3, 8.4_

- [ ] 4.1 Create Processing Service
  - Create `apps/web/lib/services/metrics/processing-service.ts`
  - Implement processEvent() method
  - Add event enrichment (geolocation, device info)
  - Implement validation logic
  - _Requirements: 1.5_

- [ ] 4.2 Create BullMQ queue consumer
  - Create worker to consume events from Redis queue
  - Configure worker pool (4 workers)
  - Implement event processing pipeline
  - Add dead letter queue for failed events
  - _Requirements: 8.3, 8.4_

- [ ] 4.3 Write property test for event processing
  - **Property 7: Error handling resilience**
  - **Property 8: Custom metadata preservation**
  - **Validates: Requirements 3.3, 3.5**

- [ ] 4.4 Write property test for retry logic
  - **Property 20: Exponential backoff retry**
  - **Property 21: Event ordering preservation**
  - **Validates: Requirements 8.3, 8.4**

- [ ] 5. Implement aggregation service
  - Create Aggregation Service for metric calculations
  - Implement time-window aggregation
  - Add percentile calculation using t-digest
  - Configure Redis caching for aggregates
  - _Requirements: 4.5, 5.2, 5.3_

- [ ] 5.1 Create Aggregation Service
  - Create `apps/web/lib/services/metrics/aggregation-service.ts`
  - Implement aggregate() method
  - Add computePercentiles() using t-digest library
  - Implement updateTimeSeries() method
  - Configure time windows (1m, 5m, 1h, 1d)
  - _Requirements: 4.5_

- [ ] 5.2 Implement time-window aggregation
  - Add sliding window calculations
  - Implement batch updates to Supabase (every 30s)
  - Store aggregates in aggregated_metrics table
  - _Requirements: 5.2_

- [ ] 5.3 Add Redis caching for aggregates
  - Cache frequently accessed aggregates (TTL: 5 min)
  - Implement cache invalidation on updates
  - Use existing Upstash Redis connection
  - _Requirements: 5.3_

- [ ] 5.4 Write property test for aggregation
  - **Property 10: Percentile calculation accuracy**
  - **Validates: Requirements 4.5**

- [ ] 5.5 Write integration test for aggregation service
  - Test with real Supabase database
  - Create unique test metrics with timestamps
  - Verify aggregations calculated correctly
  - Cleanup test data after completion
  - _Requirements: 4.5, 5.2_

- [ ] 6. Create query service and API
  - Create Query Service for metrics retrieval
  - Implement API routes for querying
  - Add Clerk authentication
  - Implement query filtering and pagination
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6.1 Create Query Service
  - Create `apps/web/lib/services/metrics/query-service.ts`
  - Implement query parsing and validation
  - Add filtering logic (date range, event type, user segment)
  - Implement pagination support
  - _Requirements: 5.2, 5.4_

- [ ] 6.2 Create query API routes
  - Create `apps/web/app/api/metrics/query/route.ts`
  - Create `apps/web/app/api/metrics/events/route.ts` (admin only)
  - Create `apps/web/app/api/metrics/performance/route.ts`
  - Create `apps/web/app/api/metrics/users/route.ts`
  - Implement GET handlers with Clerk auth
  - _Requirements: 5.1, 5.5_

- [ ] 6.3 Implement authentication and authorization
  - Use existing Clerk auth() from @clerk/nextjs/server
  - Implement RBAC for admin-only endpoints
  - Add permission validation
  - _Requirements: 5.5_

- [ ] 6.4 Write property test for query filtering
  - **Property 11: Query filtering correctness**
  - **Validates: Requirements 5.2**

- [ ] 6.5 Write property test for query performance
  - **Property 12: Query performance SLA**
  - **Validates: Requirements 5.3**

- [ ] 6.6 Write property test for authentication
  - **Property 13: Authentication enforcement**
  - **Validates: Requirements 5.5**

- [ ] 6.7 Write integration test for query API
  - Test with real Clerk authentication
  - Create test user with unique email
  - Seed test metrics data
  - Verify query results and filtering
  - Cleanup test user and data
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 7. Implement Google Analytics integration
  - Create GA Provider for event forwarding
  - Implement event mapping to GA4 format
  - Add batch sending with rate limiting
  - Configure retry queue for failed sends
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ] 7.1 Create Google Analytics Provider
  - Create `apps/web/lib/services/metrics/ga-provider.ts`
  - Install @google-analytics/data package
  - Implement sendEvent() and sendPageView() methods
  - Add event mapping from internal to GA4 format
  - _Requirements: 7.1, 7.2_

- [ ] 7.2 Implement batch sending and rate limiting
  - Batch events (max 25 per request)
  - Implement rate limiting (60 req/min)
  - Add request queuing and throttling
  - _Requirements: 7.5_

- [ ] 7.3 Add retry queue for GA failures
  - Queue failed GA requests in Redis
  - Implement retry with exponential backoff
  - Ensure no data loss on GA unavailability
  - _Requirements: 7.3_

- [ ] 7.4 Write property test for GA integration
  - **Property 16: Google Analytics event forwarding**
  - **Property 17: Google Analytics fault tolerance**
  - **Property 18: Google Analytics rate limiting**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [ ] 8. Create dashboard service and UI
  - Create dashboard React components
  - Implement real-time updates with SSE
  - Add visualization components using Recharts
  - Implement export functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 8.1 Create dashboard page and layout
  - Create `apps/web/app/dashboard/metrics/page.tsx`
  - Add dashboard layout with navigation
  - Implement responsive design
  - _Requirements: 6.2_

- [ ] 8.2 Implement real-time event stream
  - Create SSE endpoint for real-time updates
  - Implement WebSocket fallback
  - Add client-side SSE connection handling
  - _Requirements: 6.1, 6.3_

- [ ] 8.3 Create visualization components
  - Create performance metrics charts (LCP, FID, CLS)
  - Add event timeline visualization
  - Create user behavior funnels
  - Use existing Recharts library
  - _Requirements: 6.2_

- [ ] 8.4 Implement export functionality
  - Add CSV export for metrics data
  - Add JSON export for raw data
  - Implement download handling
  - _Requirements: 6.5_

- [ ] 8.5 Write property test for dashboard updates
  - **Property 14: Dashboard latency SLA**
  - **Property 15: Automatic dashboard refresh**
  - **Validates: Requirements 6.1, 6.3**

- [ ] 9. Implement performance monitoring
  - Add Core Web Vitals tracking
  - Implement performance threshold alerting
  - Create performance metrics collection
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9.1 Create performance metrics collector
  - Use browser Performance API
  - Collect LCP, FID, CLS, TTFB, FCP
  - Add custom performance metrics support
  - Store in performance_metrics table
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 9.2 Implement threshold alerting
  - Define performance thresholds
  - Monitor metrics against thresholds
  - Trigger alerts when exceeded
  - _Requirements: 4.2_

- [ ] 9.3 Write property test for performance monitoring
  - **Property 9: Performance threshold alerting**
  - **Validates: Requirements 4.2**

- [ ] 10. Add data retention and cleanup
  - Implement data retention policies
  - Create cleanup jobs for expired data
  - Add user data deletion support
  - _Requirements: 2.4, 2.5_

- [ ] 10.1 Implement data retention policies
  - Create retention policy configuration
  - Add automatic cleanup for expired events
  - Configure retention periods (90 days default)
  - _Requirements: 2.4_

- [ ] 10.2 Create cleanup jobs
  - Create scheduled job for data cleanup
  - Implement batch deletion for performance
  - Add logging for cleanup operations
  - _Requirements: 2.4_

- [ ] 10.3 Implement user data deletion
  - Create API endpoint for deletion requests
  - Implement cascading deletion for user data
  - Add deletion confirmation and logging
  - _Requirements: 2.5_

- [ ] 10.4 Write property test for data retention
  - **Property 6: Data retention enforcement**
  - **Validates: Requirements 2.4**

- [ ] 11. Implement security and compliance
  - Add input validation with Zod
  - Implement log sanitization
  - Configure HTTPS and SSL validation
  - Add encryption for sensitive config
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11.1 Create validation schemas
  - Define Zod schemas for all API inputs
  - Add validation to all API routes
  - Implement error handling for validation failures
  - _Requirements: 10.1_

- [ ] 11.2 Implement log sanitization
  - Create sanitization utility
  - Remove PII from all log entries
  - Sanitize error messages
  - _Requirements: 10.5_

- [ ] 11.3 Write property test for log sanitization
  - **Property 22: Log sanitization**
  - **Validates: Requirements 10.5**

- [ ] 12. Write comprehensive integration tests
  - Test full event pipeline with real services
  - Test database operations with real Supabase
  - Test Redis queue operations
  - Test Clerk authentication flow
  - _Requirements: All integration requirements_

- [ ] 12.1 Write database integration tests
  - Follow existing pattern from real-database-integration.test.ts
  - Test metric_events CRUD operations
  - Test aggregated_metrics operations
  - Test performance_metrics operations
  - Test user_sessions operations
  - Use unique identifiers (timestamps, UUIDs)
  - Cleanup all test data in afterAll()
  - _Requirements: All data model requirements_

- [ ] 12.2 Write Redis integration tests
  - Test BullMQ queue operations with real Upstash Redis
  - Test event queuing and processing
  - Test retry logic and dead letter queue
  - Use unique queue names per test
  - Cleanup queues after tests
  - _Requirements: 8.1, 8.3, 8.4_

- [ ] 12.3 Write Clerk integration tests
  - Follow existing pattern from real-clerk-integration.test.ts
  - Test user authentication for metrics API
  - Create test users with unique emails
  - Test RBAC for admin endpoints
  - Cleanup test users in afterAll()
  - _Requirements: 5.5_

- [ ] 12.4 Write end-to-end pipeline integration test
  - Test complete flow: capture → ingest → process → aggregate → query
  - Use real services (Supabase, Redis, Clerk)
  - Create unique test data with timestamps
  - Verify data at each pipeline stage
  - Cleanup all test data
  - _Requirements: All pipeline requirements_

- [ ] 13. Write E2E tests with Playwright
  - Test user event capture journey
  - Test dashboard visualization
  - Test admin query functionality
  - Test offline handling
  - _Requirements: All E2E requirements_

- [ ] 13.1 Write event capture E2E test
  - Use @clerk/testing/playwright for auth
  - Create test user with unique email
  - Trigger events in browser
  - Verify events in dashboard
  - Cleanup test user and events
  - _Requirements: 1.1, 6.1_

- [ ] 13.2 Write dashboard visualization E2E test
  - Create test user and seed performance data
  - Navigate to dashboard
  - Verify metrics displayed correctly
  - Test chart interactions
  - Cleanup test data
  - _Requirements: 6.2, 6.3_

- [ ] 13.3 Write admin query E2E test
  - Create admin test user
  - Seed test metrics data
  - Test query filtering and pagination
  - Verify results accuracy
  - Cleanup admin user and data
  - _Requirements: 5.2, 5.4, 5.5_

- [ ] 13.4 Write offline handling E2E test
  - Create test user
  - Simulate offline state
  - Trigger events
  - Verify local queuing
  - Restore connectivity
  - Verify event transmission
  - Cleanup test data
  - _Requirements: 8.1, 8.2_

- [ ] 14. Configure Phase.dev environment variables
  - Add metrics-specific environment variables
  - Configure Google Analytics credentials
  - Set up Redis queue configuration
  - Document environment setup
  - _Requirements: All deployment requirements_

- [ ] 14.1 Add environment variables to Phase.dev
  - Add GOOGLE_ANALYTICS_MEASUREMENT_ID
  - Add GOOGLE_ANALYTICS_API_SECRET
  - Add METRICS_RETENTION_DAYS
  - Add METRICS_BATCH_SIZE
  - Configure for all environments (dev, staging, prod)
  - _Requirements: 7.1, 7.2_

- [ ] 14.2 Update Vercel configuration
  - Add metrics environment variables to vercel.json
  - Configure edge function settings for ingestion API
  - Update Turborepo configuration if needed
  - _Requirements: Deployment requirements_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Run full test suite: `NODE_OPTIONS="--max-old-space-size=8192" pnpm test`
  - Run integration tests with real services
  - Run E2E tests with Playwright
  - Verify 100% test success rate
  - Run typecheck: `pnpm typecheck`
  - Run lint: `pnpm lint`
  - Run build: `pnpm build`
  - Verify coverage thresholds met
  - Confirm no orphaned test data in datastores
  - _Requirements: ALL requirements must be validated_
