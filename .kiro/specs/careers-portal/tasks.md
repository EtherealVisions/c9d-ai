# Implementation Plan

- [ ] 1. Set up database schema and migrations
- [ ] 1.1 Create Drizzle schema for careers tables
  - Define job_posts table with all fields (id, slug, title, description, requirements, responsibilities, category, location, status, etc.)
  - Define applications table with applicant information and status tracking
  - Define portal_config table for configuration management
  - Define careers_analytics table for event tracking
  - Define relations between tables
  - _Requirements: 1.1, 4.1, 5.1, 9.1_

- [ ] 1.2 Create database migration file
  - Write SQL migration for creating all careers tables
  - Add indexes for performance (status+published_at, slug, job_post_id+status, email, event_type+created_at)
  - Include RLS policies for data security
  - _Requirements: 1.1, 4.1, 5.1_

- [ ] 1.3 Run migration and verify schema
  - Execute migration against development database
  - Verify all tables and indexes created correctly
  - Test RLS policies
  - _Requirements: 1.1, 4.1, 5.1_

- [ ] 2. Create validation schemas and types
- [ ] 2.1 Define Zod validation schemas
  - Create JobPostSchema for job posting validation
  - Create ApplicationSchema for application submission validation
  - Create ApplicationFilterSchema for filtering applications
  - Create PortalConfigSchema for configuration validation
  - Export all schemas from lib/validation/schemas/careers.ts
  - _Requirements: 3.3, 4.1, 5.4_

- [ ] 2.2 Write property test for validation schemas
  - **Property 8: Application validation completeness**
  - **Validates: Requirements 3.3**

- [ ] 2.3 Define TypeScript types from schemas
  - Create JobPost, JobPostInsert, JobPostUpdate types
  - Create Application, ApplicationInsert, ApplicationUpdate types
  - Create PortalConfig, AnalyticsEvent types
  - Export types from lib/models/careers.ts
  - _Requirements: 1.1, 3.1, 4.1_

- [ ] 3. Implement repository layer
- [ ] 3.1 Create JobPostRepository
  - Extend BaseRepository with job-specific methods
  - Implement findActive() for public job listings
  - Implement findBySlug() for job detail pages
  - Implement findByCategory(), findByLocation() for filtering
  - Implement search() for keyword search
  - Implement publish(), close() for status management
  - _Requirements: 1.1, 1.2, 4.2, 4.4_

- [ ] 3.2 Write property test for job repository
  - **Property 2: Job filtering correctness**
  - **Validates: Requirements 1.2**

- [ ] 3.3 Create ApplicationRepository
  - Extend BaseRepository with application-specific methods
  - Implement findByJobPost() for listing applications by job
  - Implement findByStatus() for filtering by status
  - Implement updateStatus() with audit trail
  - Implement generateReferenceNumber() for unique references
  - _Requirements: 3.1, 5.1, 5.3_

- [ ] 3.4 Write property test for application repository
  - **Property 18: Status change audit trail**
  - **Validates: Requirements 5.3**

- [ ] 3.5 Create PortalConfigRepository
  - Implement findByKey() for configuration lookup
  - Implement upsert() for configuration updates
  - Implement findByCategory() for grouped configs
  - _Requirements: 6.2, 6.3, 6.4_

- [ ] 3.6 Create AnalyticsRepository
  - Implement trackEvent() for recording analytics
  - Implement getMetrics() for aggregated analytics
  - Implement generateReport() for analytics reports
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 4. Implement service layer
- [ ] 4.1 Create JobPostService
  - Implement create() with slug generation
  - Implement update() with cache invalidation
  - Implement publish() with validation
  - Implement close() with status update
  - Implement getActive() with caching
  - Implement getBySlug() with caching
  - Implement search() with filtering
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4_

- [ ] 4.2 Write property test for job service
  - **Property 12: Job publication visibility**
  - **Validates: Requirements 4.2**

- [ ] 4.3 Write property test for job service caching
  - **Property 13: Job update propagation**
  - **Validates: Requirements 4.3**

- [ ] 4.4 Create ApplicationService
  - Implement submit() with file upload and email notification
  - Implement updateStatus() with email notification
  - Implement getByJobPost() with filtering
  - Implement export() for CSV/PDF generation
  - Implement requestInformation() with email
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2, 5.3, 5.5, 10.3_

- [ ] 4.5 Write property test for application service
  - **Property 9: Confirmation email delivery**
  - **Validates: Requirements 3.4**

- [ ] 4.6 Write property test for application status updates
  - **Property 38: Status change notification**
  - **Validates: Requirements 10.2**

- [ ] 4.7 Create FileUploadService
  - Implement uploadResume() with Vercel Blob Storage
  - Implement validateFile() for format and size checks
  - Implement deleteFile() for cleanup
  - _Requirements: 3.2_

- [ ] 4.8 Write property test for file upload service
  - **Property 7: File upload validation**
  - **Validates: Requirements 3.2**

- [ ] 4.9 Create EmailService
  - Implement sendApplicationConfirmation() with Resend
  - Implement sendStatusUpdate() for status changes
  - Implement sendRejectionNotification() for rejections
  - Implement sendInterviewInvitation() for interviews
  - Implement sendInformationRequest() for additional info
  - Use configured email templates from portal config
  - _Requirements: 3.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 4.10 Write property test for email service
  - **Property 37: Application confirmation email**
  - **Validates: Requirements 10.1**

- [ ] 4.11 Create AnalyticsService
  - Implement trackPageView() for page analytics
  - Implement trackJobView() for job listing analytics
  - Implement trackApplicationStart() for conversion tracking
  - Implement trackApplicationSubmit() for completion tracking
  - Implement getMetrics() with caching
  - Implement generateReport() for exports
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 4.12 Write property test for analytics service
  - **Property 32: Interaction tracking**
  - **Validates: Requirements 9.1**

- [ ] 5. Create API routes for public access
- [ ] 5.1 Implement GET /api/careers/jobs
  - List all active job postings
  - Support filtering by category, location, type
  - Support search by keywords
  - Return paginated results
  - Implement caching with Upstash Redis
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 5.2 Write property test for jobs API filtering
  - **Property 2: Job filtering correctness**
  - **Validates: Requirements 1.2**

- [ ] 5.3 Implement GET /api/careers/jobs/[slug]
  - Get job details by slug
  - Return 404 if job not found or not active
  - Implement caching
  - Track job view analytics
  - _Requirements: 1.4, 1.5, 9.1_

- [ ] 5.4 Write property test for job detail API
  - **Property 4: Job detail completeness**
  - **Validates: Requirements 1.4**

- [ ] 5.5 Implement POST /api/careers/applications
  - Accept application submission
  - Validate all required fields
  - Upload resume to Vercel Blob Storage
  - Generate reference number
  - Send confirmation email
  - Track application submission analytics
  - Return application reference number
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.2_

- [ ] 5.6 Write property test for application submission API
  - **Property 10: Validation error clarity**
  - **Validates: Requirements 3.5**

- [ ] 5.7 Implement POST /api/careers/analytics/track
  - Accept analytics events from client
  - Validate event data
  - Store in analytics table
  - Return success response
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 6. Create API routes for authenticated access
- [ ] 6.1 Implement POST /api/careers/jobs (authenticated)
  - Require Clerk authentication
  - Validate user has hiring manager or admin role
  - Create new job posting
  - Generate slug from title
  - Return created job
  - _Requirements: 4.1_

- [ ] 6.2 Implement PATCH /api/careers/jobs/[id] (authenticated)
  - Require Clerk authentication
  - Validate user has permission for this job
  - Update job posting
  - Invalidate cache
  - Return updated job
  - _Requirements: 4.3_

- [ ] 6.3 Implement DELETE /api/careers/jobs/[id] (authenticated)
  - Require Clerk authentication
  - Validate user has permission for this job
  - Soft delete or close job posting
  - Invalidate cache
  - Return success response
  - _Requirements: 4.4_

- [ ] 6.4 Implement GET /api/careers/applications (authenticated)
  - Require Clerk authentication
  - Filter applications by user's job postings
  - Support filtering by status, date, position
  - Return paginated results with applicant details
  - _Requirements: 4.5, 5.1, 5.4_

- [ ] 6.5 Write property test for application filtering API
  - **Property 19: Application filtering accuracy**
  - **Validates: Requirements 5.4**

- [ ] 6.6 Implement GET /api/careers/applications/[id] (authenticated)
  - Require Clerk authentication
  - Validate user has permission to view
  - Return full application details with documents
  - _Requirements: 5.2_

- [ ] 6.7 Implement PATCH /api/careers/applications/[id] (authenticated)
  - Require Clerk authentication
  - Validate user has permission to update
  - Update application status
  - Record status change in audit trail
  - Send notification email to applicant
  - Return updated application
  - _Requirements: 5.3, 10.2_

- [ ] 6.8 Implement GET /api/careers/analytics/metrics (authenticated)
  - Require Clerk authentication
  - Validate user has admin role
  - Return aggregated metrics for date range
  - Implement caching
  - _Requirements: 9.4_

- [ ] 6.9 Implement GET /api/careers/analytics/reports (authenticated)
  - Require Clerk authentication
  - Validate user has admin role
  - Generate CSV report for date range
  - Return downloadable file
  - _Requirements: 9.5_

- [ ] 7. Create public-facing components
- [ ] 7.1 Create JobListingsPage component
  - Server component for initial data fetch
  - Display job listings organized by category
  - Implement client-side filtering UI
  - Implement search functionality
  - Implement pagination
  - Track page view analytics
  - _Requirements: 1.1, 1.2, 1.3, 9.1_

- [ ] 7.2 Write property test for job listings display
  - **Property 1: Active jobs display completeness**
  - **Validates: Requirements 1.1**

- [ ] 7.3 Create JobDetailPage component
  - Server component for job data fetch
  - Display complete job information
  - Show posting date and deadline
  - Include "Apply" button
  - Track job view analytics
  - Implement responsive design
  - _Requirements: 1.4, 1.5, 9.1_

- [ ] 7.4 Write property test for job detail display
  - **Property 5: Date display consistency**
  - **Validates: Requirements 1.5**

- [ ] 7.5 Create ApplicationForm component
  - Client component with form state management
  - Include all required fields (name, email, resume, cover letter, GDPR consent)
  - Implement file upload with drag-and-drop
  - Show real-time validation errors
  - Display success message with reference number
  - Track application start and submit analytics
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.2_

- [ ] 7.6 Write property test for application form
  - **Property 6: Application form field presence**
  - **Validates: Requirements 3.1**

- [ ] 7.7 Create CulturePage component
  - Server component for culture content
  - Display mission, vision, values
  - Show employee testimonials
  - Display benefits information
  - Show diversity and inclusion content
  - Include photos and videos
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 7.8 Create JobFilterSidebar component
  - Client component for filtering UI
  - Filter by category, location, type
  - Update URL params for shareable links
  - Show active filter count
  - _Requirements: 1.2_

- [ ] 7.9 Create JobSearchBar component
  - Client component for search input
  - Implement debounced search
  - Show search suggestions
  - Clear search functionality
  - _Requirements: 1.3_

- [ ] 8. Create admin/hiring manager components
- [ ] 8.1 Create JobPostingManager component
  - Client component for CRUD operations
  - Form for creating/editing job postings
  - Rich text editor for description
  - Dynamic fields for requirements and responsibilities
  - Publish/unpublish toggle
  - Delete confirmation modal
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8.2 Create ApplicationDashboard component
  - Client component for application management
  - Display applications in table/card view
  - Filter by status, date, position
  - Bulk actions (export, status update)
  - Pagination
  - _Requirements: 5.1, 5.4, 5.5_

- [ ] 8.3 Create ApplicationDetailView component
  - Client component for viewing application
  - Display all applicant information
  - Show resume preview/download
  - Status update dropdown
  - Add notes functionality
  - Request information button
  - _Requirements: 5.2, 5.3, 10.3_

- [ ] 8.4 Create AnalyticsDashboard component
  - Client component for metrics display
  - Show key metrics (views, applications, conversion rate)
  - Display charts for trends
  - Date range selector
  - Export report button
  - _Requirements: 9.4, 9.5_

- [ ] 9. Implement responsive design and accessibility
- [ ] 9.1 Add mobile-optimized styles
  - Implement responsive layouts for all components
  - Add touch-optimized form inputs
  - Test on mobile viewports (< 768px)
  - Optimize images for mobile
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 9.2 Write property test for responsive design
  - **Property 24: Mobile layout optimization**
  - **Validates: Requirements 7.1**

- [ ] 9.3 Add accessibility attributes
  - Add ARIA labels and roles to all interactive elements
  - Ensure semantic HTML structure
  - Add alt text to all images
  - Add labels to all form inputs
  - Add aria-live regions for dynamic content
  - _Requirements: 8.1, 8.4, 8.5_

- [ ] 9.4 Write property test for accessibility
  - **Property 27: Semantic HTML structure**
  - **Validates: Requirements 8.1**

- [ ] 9.5 Write property test for form accessibility
  - **Property 30: Form field labels**
  - **Validates: Requirements 8.4**

- [ ] 9.6 Verify color contrast compliance
  - Test all text/background combinations
  - Ensure 4.5:1 contrast ratio minimum
  - Fix any failing combinations
  - _Requirements: 8.3_

- [ ] 9.7 Write property test for color contrast
  - **Property 28: Color contrast compliance**
  - **Validates: Requirements 8.3**

- [ ] 10. Implement caching and performance optimization
- [ ] 10.1 Set up Redis caching for job listings
  - Use existing RepositoryCacheService
  - Cache active jobs list (5 min TTL)
  - Cache job details (10 min TTL)
  - Cache job categories (1 hour TTL)
  - Implement cache invalidation on updates
  - _Requirements: 1.1, 1.4, 4.3_

- [ ] 10.2 Set up Redis caching for analytics
  - Cache aggregated metrics (30 min TTL)
  - Implement cache warming for common queries
  - _Requirements: 9.4_

- [ ] 10.3 Optimize database queries
  - Add indexes for common queries
  - Use select() to fetch only needed fields
  - Implement pagination for large result sets
  - _Requirements: 1.1, 5.1_

- [ ] 10.4 Implement image optimization
  - Use Next.js Image component for all images
  - Configure image domains in next.config.js
  - Implement lazy loading for below-fold images
  - _Requirements: 2.5, 7.5_

- [ ] 11. Set up email notifications
- [ ] 11.1 Configure Resend integration
  - Add RESEND_API_KEY to Phase.dev
  - Create email templates in code
  - Test email delivery in development
  - _Requirements: 3.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11.2 Create email templates
  - Application confirmation template
  - Status update template
  - Rejection notification template
  - Interview invitation template
  - Information request template
  - _Requirements: 3.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11.3 Write property test for email templates
  - **Property 21: Email template application**
  - **Validates: Requirements 6.2**

- [ ] 12. Implement file upload functionality
- [ ] 12.1 Configure Vercel Blob Storage
  - Add BLOB_READ_WRITE_TOKEN to Phase.dev
  - Set up blob storage client
  - Configure file size limits
  - _Requirements: 3.2_

- [ ] 12.2 Implement resume upload endpoint
  - Accept file uploads in API route
  - Validate file type and size
  - Upload to Vercel Blob Storage
  - Return file URL
  - _Requirements: 3.2_

- [ ] 12.3 Add file upload UI
  - Implement drag-and-drop file upload
  - Show upload progress
  - Display file preview
  - Handle upload errors
  - _Requirements: 3.2, 7.4_

- [ ] 13. Add analytics tracking
- [ ] 13.1 Implement client-side analytics
  - Create useAnalytics hook
  - Track page views on mount
  - Track job views on detail page
  - Track application starts on form open
  - Track application submits on success
  - Include UTM parameters and referrer
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 13.2 Implement server-side analytics
  - Track API endpoint usage
  - Track conversion rates
  - Aggregate metrics for dashboard
  - _Requirements: 9.2, 9.4_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Create admin configuration interface
- [ ] 15.1 Create PortalConfigPage component
  - Display all configuration categories
  - Form for updating email templates
  - Form for managing job categories
  - Form for configuring custom form fields
  - Save button with validation
  - _Requirements: 6.2, 6.3, 6.4_

- [ ] 15.2 Write property test for configuration
  - **Property 23: Category configuration propagation**
  - **Validates: Requirements 6.4**

- [ ] 16. Implement SEO optimization
- [ ] 16.1 Add metadata to job listing pages
  - Generate dynamic metadata for each job
  - Include Open Graph tags
  - Include Twitter Card tags
  - Add structured data (JSON-LD)
  - _Requirements: 1.1, 1.4_

- [ ] 16.2 Create sitemap for job listings
  - Generate dynamic sitemap.xml
  - Include all active job postings
  - Update on job publish/close
  - _Requirements: 1.1_

- [ ] 16.3 Add robots.txt configuration
  - Allow crawling of public pages
  - Disallow crawling of admin pages
  - _Requirements: 1.1_

- [ ] 17. Add error handling and loading states
- [ ] 17.1 Create error boundaries
  - Add error boundary for job listings
  - Add error boundary for application form
  - Add error boundary for admin pages
  - Display user-friendly error messages
  - _Requirements: 3.5_

- [ ] 17.2 Add loading states
  - Add skeleton loaders for job listings
  - Add loading spinner for form submission
  - Add loading states for admin operations
  - _Requirements: 1.1, 3.3_

- [ ] 17.3 Implement error logging
  - Log errors to console in development
  - Log errors to monitoring service in production
  - Include context (user, job, application IDs)
  - _Requirements: 3.5_

- [ ] 18. Write integration tests
- [ ] 18.1 Write end-to-end application flow test
  - Test browsing jobs → viewing details → submitting application → receiving confirmation
  - _Requirements: 1.1, 1.4, 3.1, 3.4_

- [ ] 18.2 Write job management flow test
  - Test creating job → publishing → receiving applications → updating status → closing position
  - _Requirements: 4.1, 4.2, 5.1, 5.3, 4.4_

- [ ] 18.3 Write analytics flow test
  - Test tracking events → aggregating metrics → generating reports
  - _Requirements: 9.1, 9.4, 9.5_

- [ ] 19. Write E2E tests with Playwright
- [ ] 19.1 Write E2E test for job seeker journey
  - Test browsing jobs, filtering, searching, viewing details, applying
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1_

- [ ] 19.2 Write E2E test for hiring manager journey
  - Test creating job, publishing, reviewing applications, updating status
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3_

- [ ] 19.3 Write E2E test for mobile user journey
  - Test mobile browsing and application submission
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Documentation and deployment preparation
- [ ] 21.1 Write API documentation
  - Document all public API endpoints
  - Document all authenticated API endpoints
  - Include request/response examples
  - Document error codes
  - _Requirements: All API requirements_

- [ ] 21.2 Write component documentation
  - Document all public components with props
  - Document all admin components with props
  - Include usage examples
  - _Requirements: All component requirements_

- [ ] 21.3 Create deployment guide
  - Document environment variables needed
  - Document database migration steps
  - Document Vercel deployment process
  - Document Phase.dev configuration
  - _Requirements: All requirements_

- [ ] 21.4 Create user guide for hiring managers
  - Document how to create job postings
  - Document how to review applications
  - Document how to update application status
  - Document how to export reports
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 5.5_

- [ ] 21.5 Create user guide for administrators
  - Document how to configure portal settings
  - Document how to manage email templates
  - Document how to view analytics
  - _Requirements: 6.2, 6.3, 6.4, 9.4_
