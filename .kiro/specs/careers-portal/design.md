# Design Document

## Overview

The Careers Portal is a comprehensive recruitment platform built on Next.js 15 with React 19, leveraging the existing C9D AI platform architecture. The system provides a public-facing interface for job seekers to explore opportunities and submit applications, while offering authenticated interfaces for hiring managers and administrators to manage postings and review candidates.

The portal integrates with the existing authentication (Clerk), database (Supabase with Drizzle ORM), and infrastructure (Vercel, Redis caching) to provide a seamless, performant, and accessible recruitment experience.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Public Interface                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Job Listings │  │   Culture    │  │ Application  │      │
│  │    Pages     │  │    Pages     │  │    Forms     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Jobs API    │  │Applications  │  │  Analytics   │      │
│  │   Routes     │  │  API Routes  │  │  API Routes  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Job Service  │  │ Application  │  │  Analytics   │      │
│  │              │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Job      │  │ Application  │  │   Config     │      │
│  │  Repository  │  │  Repository  │  │  Repository  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Layer (Supabase/Drizzle)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  job_posts   │  │ applications │  │portal_config │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Clerk     │  │   Upstash    │  │   Vercel     │      │
│  │    (Auth)    │  │   Redis      │  │  Blob Store  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 15 App Router, React 19, TypeScript 5+
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: Clerk (existing integration)
- **Database**: Supabase PostgreSQL with Drizzle ORM (existing integration)
- **Caching**: Upstash Redis (existing integration via REDIS_URL)
- **File Storage**: Vercel Blob Storage for resumes/documents
- **Email**: Resend for transactional emails (Vercel-native)
- **Analytics**: Custom analytics service with database persistence
- **Deployment**: Vercel with Edge Functions and Phase.dev environment management
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Components and Interfaces

### Public Components

#### JobListingsPage
```typescript
interface JobListingsPageProps {
  initialJobs?: JobListing[]
  categories?: JobCategory[]
  locations?: string[]
}

// Server Component - fetches initial data
export default async function JobListingsPage(props: JobListingsPageProps)
```

#### JobDetailPage
```typescript
interface JobDetailPageProps {
  params: { slug: string }
}

// Server Component - fetches job details
export default async function JobDetailPage({ params }: JobDetailPageProps)
```

#### ApplicationForm
```typescript
interface ApplicationFormProps {
  jobId: string
  jobTitle: string
  onSuccess?: (applicationId: string) => void
}

// Client Component - handles form submission
export function ApplicationForm(props: ApplicationFormProps)
```

#### CulturePage
```typescript
interface CulturePageProps {
  content: CultureContent
  testimonials: EmployeeTestimonial[]
  benefits: BenefitItem[]
}

// Server Component - displays culture content
export default async function CulturePage(props: CulturePageProps)
```

### Admin Components

#### JobPostingManager
```typescript
interface JobPostingManagerProps {
  userId: string
  userRole: string
}

// Client Component - CRUD operations for job postings
export function JobPostingManager(props: JobPostingManagerProps)
```

#### ApplicationDashboard
```typescript
interface ApplicationDashboardProps {
  userId: string
  filters?: ApplicationFilters
}

// Client Component - displays and manages applications
export function ApplicationDashboard(props: ApplicationDashboardProps)
```

#### AnalyticsDashboard
```typescript
interface AnalyticsDashboardProps {
  dateRange: DateRange
  metrics: AnalyticsMetrics
}

// Client Component - displays recruitment analytics
export function AnalyticsDashboard(props: AnalyticsDashboardProps)
```

### API Routes

#### Job Listings API
```typescript
// GET /api/careers/jobs - List all active jobs
// GET /api/careers/jobs/[id] - Get job details
// POST /api/careers/jobs - Create job (authenticated)
// PATCH /api/careers/jobs/[id] - Update job (authenticated)
// DELETE /api/careers/jobs/[id] - Delete job (authenticated)
```

#### Applications API
```typescript
// POST /api/careers/applications - Submit application
// GET /api/careers/applications - List applications (authenticated)
// GET /api/careers/applications/[id] - Get application details (authenticated)
// PATCH /api/careers/applications/[id] - Update application status (authenticated)
```

#### Analytics API
```typescript
// POST /api/careers/analytics/track - Track event
// GET /api/careers/analytics/metrics - Get metrics (authenticated)
// GET /api/careers/analytics/reports - Generate reports (authenticated)
```

## Data Models

### Job Posting Schema

```typescript
// lib/db/schema/careers.ts
export const jobPosts = pgTable('job_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  requirements: jsonb('requirements').notNull(), // Array of requirement strings
  responsibilities: jsonb('responsibilities').notNull(), // Array of responsibility strings
  
  // Classification
  category: varchar('category', { length: 100 }).notNull(),
  department: varchar('department', { length: 100 }),
  jobType: varchar('job_type', { length: 50 }).notNull(), // full-time, part-time, contract
  experienceLevel: varchar('experience_level', { length: 50 }), // entry, mid, senior
  
  // Location
  location: varchar('location', { length: 255 }).notNull(),
  remotePolicy: varchar('remote_policy', { length: 50 }), // remote, hybrid, onsite
  
  // Compensation
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: varchar('salary_currency', { length: 3 }).default('USD'),
  
  // Status
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, active, closed, filled
  publishedAt: timestamp('published_at'),
  closedAt: timestamp('closed_at'),
  applicationDeadline: timestamp('application_deadline'),
  
  // Metadata
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  
  // SEO
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
})

export const jobPostsRelations = relations(jobPosts, ({ many }) => ({
  applications: many(applications),
}))
```

### Application Schema

```typescript
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobPostId: uuid('job_post_id').notNull().references(() => jobPosts.id),
  referenceNumber: varchar('reference_number', { length: 50 }).notNull().unique(),
  
  // Applicant Information
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  location: varchar('location', { length: 255 }),
  
  // Application Content
  coverLetter: text('cover_letter'),
  resumeUrl: varchar('resume_url', { length: 500 }).notNull(),
  portfolioUrl: varchar('portfolio_url', { length: 500 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  
  // Additional Data
  customFields: jsonb('custom_fields'), // Flexible additional questions
  source: varchar('source', { length: 100 }), // How they found the job
  
  // Status Tracking
  status: varchar('status', { length: 50 }).notNull().default('submitted'),
  // submitted, under_review, interview_scheduled, rejected, accepted
  statusHistory: jsonb('status_history').notNull().default([]),
  
  // Assignment
  assignedTo: varchar('assigned_to', { length: 255 }),
  reviewedBy: varchar('reviewed_by', { length: 255 }),
  reviewedAt: timestamp('reviewed_at'),
  
  // Metadata
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  
  // Privacy
  gdprConsent: boolean('gdpr_consent').notNull().default(false),
  dataRetentionDate: timestamp('data_retention_date'),
})

export const applicationsRelations = relations(applications, ({ one }) => ({
  jobPost: one(jobPosts, {
    fields: [applications.jobPostId],
    references: [jobPosts.id],
  }),
}))
```

### Portal Configuration Schema

```typescript
export const portalConfig = pgTable('portal_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  updatedBy: varchar('updated_by', { length: 255 }).notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Configuration categories:
// - branding: logo, colors, typography
// - email_templates: confirmation, status_update, rejection
// - form_fields: custom application fields
// - job_categories: available categories
// - integrations: ATS, HR platform connections
```

### Analytics Schema

```typescript
export const careersAnalytics = pgTable('careers_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  // page_view, job_view, application_start, application_submit, filter_used, search_performed
  
  // Context
  jobPostId: uuid('job_post_id').references(() => jobPosts.id),
  applicationId: uuid('application_id').references(() => applications.id),
  
  // Event Data
  eventData: jsonb('event_data'), // Flexible event-specific data
  
  // Session Tracking
  sessionId: varchar('session_id', { length: 255 }),
  userId: varchar('user_id', { length: 255 }),
  
  // Source Tracking
  referrer: varchar('referrer', { length: 500 }),
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  
  // Device/Browser
  userAgent: varchar('user_agent', { length: 500 }),
  deviceType: varchar('device_type', { length: 50 }), // mobile, tablet, desktop
  
  // Timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

### Validation Schemas (Zod)

```typescript
// lib/validation/schemas/careers.ts
import { z } from 'zod'

export const JobPostSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(100),
  requirements: z.array(z.string()).min(1),
  responsibilities: z.array(z.string()).min(1),
  category: z.string().min(1),
  department: z.string().optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead']).optional(),
  location: z.string().min(1),
  remotePolicy: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  applicationDeadline: z.date().optional(),
})

export const ApplicationSchema = z.object({
  jobPostId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url(),
  portfolioUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  customFields: z.record(z.any()).optional(),
  source: z.string().optional(),
  gdprConsent: z.boolean().refine(val => val === true, {
    message: 'GDPR consent is required'
  }),
})

export const ApplicationFilterSchema = z.object({
  status: z.array(z.string()).optional(),
  jobPostId: z.string().uuid().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  assignedTo: z.string().optional(),
})
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Job Listing Properties

Property 1: Active jobs display completeness
*For any* set of active job postings, when displayed on the careers portal, all active jobs should be present and organized by their assigned category
**Validates: Requirements 1.1**

Property 2: Job filtering correctness
*For any* set of job listings and any filter criteria (category, location, or type), the filtered results should contain only jobs matching all specified criteria and should include all matching jobs
**Validates: Requirements 1.2**

Property 3: Job search relevance
*For any* search query and set of job listings, all returned results should contain the search term in either the title, description, or requirements fields
**Validates: Requirements 1.3**

Property 4: Job detail completeness
*For any* job listing, when rendered for display, the output should contain all required fields: title, location, type, responsibilities, requirements, and benefits
**Validates: Requirements 1.4**

Property 5: Date display consistency
*For any* job listing, the displayed output should include the posting date, and if an application deadline exists, it should also be displayed
**Validates: Requirements 1.5**

### Application Properties

Property 6: Application form field presence
*For any* job listing, the application form should contain all required fields: first name, last name, email, resume upload, and GDPR consent
**Validates: Requirements 3.1**

Property 7: File upload validation
*For any* uploaded file, the system should accept it if and only if it is in PDF, DOC, or DOCX format and is 10MB or smaller
**Validates: Requirements 3.2**

Property 8: Application validation completeness
*For any* application submission, the system should reject it if any required field is missing or invalid, and should accept it if all fields are valid
**Validates: Requirements 3.3**

Property 9: Confirmation email delivery
*For any* successfully submitted application, a confirmation email should be sent to the applicant's email address containing the application reference number
**Validates: Requirements 3.4**

Property 10: Validation error clarity
*For any* application submission with validation errors, the error response should contain specific error messages for each invalid field
**Validates: Requirements 3.5**

### Job Management Properties

Property 11: Job posting required fields
*For any* job posting creation attempt, the system should reject it if any of the required fields (title, description, requirements, location, job type, category) are missing
**Validates: Requirements 4.1**

Property 12: Job publication visibility
*For any* job posting, after it is published, it should appear in the public job listings within the next query
**Validates: Requirements 4.2**

Property 13: Job update propagation
*For any* job posting update, the changes should be reflected in the public portal within 60 seconds
**Validates: Requirements 4.3**

Property 14: Job closure effects
*For any* job posting, when closed, it should be removed from public listings and its status should be marked as "filled" or "closed"
**Validates: Requirements 4.4**

Property 15: Application list completeness
*For any* hiring manager, when viewing applications, all applications for their posted positions should be displayed with complete applicant details and document links
**Validates: Requirements 4.5**

### Application Management Properties

Property 16: Application dashboard organization
*For any* set of applications, the dashboard should display them grouped by job posting and organized by status
**Validates: Requirements 5.1**

Property 17: Application data accessibility
*For any* application, when reviewed, all associated data (resume, cover letter, applicant information) should be accessible
**Validates: Requirements 5.2**

Property 18: Status change audit trail
*For any* application status update, the system should record the change with a timestamp and the user who made the change
**Validates: Requirements 5.3**

Property 19: Application filtering accuracy
*For any* filter criteria (status, date, position), the filtered application results should contain only applications matching all specified criteria
**Validates: Requirements 5.4**

Property 20: Application export completeness
*For any* set of selected applications, the exported CSV or PDF should contain all selected applications with their complete information
**Validates: Requirements 5.5**

### Configuration Properties

Property 21: Email template application
*For any* configured email template, subsequent emails of that type should use the configured template content
**Validates: Requirements 6.2**

Property 22: Form field configuration
*For any* configured custom form fields, they should appear in all job application forms
**Validates: Requirements 6.3**

Property 23: Category configuration propagation
*For any* job category configuration change, the updated categories should be available in both job posting creation and job filtering interfaces
**Validates: Requirements 6.4**

### Responsive Design Properties

Property 24: Mobile layout optimization
*For any* page, when rendered with a viewport width below 768px, the layout should use mobile-optimized styles
**Validates: Requirements 7.1**

Property 25: Tablet layout optimization
*For any* page, when rendered with a viewport width between 768px and 1024px, the layout should use tablet-optimized styles
**Validates: Requirements 7.2**

Property 26: Mobile form optimization
*For any* form input on mobile viewports, the input should have appropriate mobile attributes (inputMode, autocomplete)
**Validates: Requirements 7.3**

### Accessibility Properties

Property 27: Semantic HTML structure
*For any* rendered page, all interactive elements should use semantic HTML with appropriate ARIA labels and roles
**Validates: Requirements 8.1**

Property 28: Color contrast compliance
*For any* text element, the color contrast ratio between text and background should be at least 4.5:1
**Validates: Requirements 8.3**

Property 29: Image alternative text
*For any* image element, it should have an alt attribute with descriptive text
**Validates: Requirements 8.4**

Property 30: Form field labels
*For any* form input, it should have an associated label element or aria-label attribute
**Validates: Requirements 8.4**

Property 31: Error message accessibility
*For any* error message, it should have appropriate ARIA attributes (role="alert" or aria-live) for screen reader announcement
**Validates: Requirements 8.5**

### Analytics Properties

Property 32: Interaction tracking
*For any* user interaction (page view, job view, application start), an analytics event should be recorded with appropriate event type and context
**Validates: Requirements 9.1**

Property 33: Conversion tracking
*For any* completed application, analytics data should be recorded including the job posting ID and traffic source
**Validates: Requirements 9.2**

Property 34: Navigation tracking
*For any* page navigation, analytics should record the navigation event with timestamp and page information
**Validates: Requirements 9.3**

Property 35: Analytics aggregation accuracy
*For any* analytics query with date range and metrics, the returned data should accurately aggregate all matching events
**Validates: Requirements 9.4**

Property 36: Report generation accuracy
*For any* report generation request, the exported CSV should contain all data points matching the specified date range and metrics
**Validates: Requirements 9.5**

### Notification Properties

Property 37: Application confirmation email
*For any* submitted application, a confirmation email should be sent immediately containing the application reference number
**Validates: Requirements 10.1**

Property 38: Status change notification
*For any* application status change, a notification email should be sent to the applicant
**Validates: Requirements 10.2**

Property 39: Information request email
*For any* information request from a hiring manager, an email should be sent to the applicant with the request details
**Validates: Requirements 10.3**

Property 40: Rejection notification email
*For any* application marked as rejected, a professional notification email should be sent to the applicant
**Validates: Requirements 10.4**

Property 41: Interview invitation email
*For any* application marked for interview, an invitation email should be sent with scheduling information
**Validates: Requirements 10.5**

## Error Handling

### Validation Errors

```typescript
// lib/errors/careers-errors.ts
export class JobPostingValidationError extends ValidationError {
  constructor(message: string, public fields: Record<string, string[]>) {
    super(message)
    this.name = 'JobPostingValidationError'
  }
}

export class ApplicationValidationError extends ValidationError {
  constructor(message: string, public fields: Record<string, string[]>) {
    super(message)
    this.name = 'ApplicationValidationError'
  }
}

export class FileUploadError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true
  
  constructor(message: string, public fileType?: string, public fileSize?: number) {
    super(message)
    this.name = 'FileUploadError'
  }
}
```

### Error Handling Strategy

1. **Validation Errors**: Return 400 with detailed field-level error messages
2. **Authentication Errors**: Return 401 for unauthenticated requests to protected routes
3. **Authorization Errors**: Return 403 when user lacks permission for action
4. **Not Found Errors**: Return 404 for non-existent jobs or applications
5. **File Upload Errors**: Return 400 with specific file validation failure reason
6. **Database Errors**: Return 500 with generic message, log detailed error
7. **Email Delivery Errors**: Log error but don't fail the primary operation
8. **Rate Limiting**: Return 429 when rate limits exceeded

### Error Response Format

```typescript
interface ErrorResponse {
  error: string
  code: string
  details?: Record<string, any>
  timestamp: string
  requestId: string
}
```

## Testing Strategy

### Unit Testing

**Framework**: Vitest with React Testing Library

**Coverage Targets**:
- Services: 100% (critical business logic)
- Repositories: 95% (data access layer)
- API Routes: 90% (external interfaces)
- Components: 85% (UI layer)

**Test Categories**:
1. **Service Layer Tests**: Job service, application service, analytics service
2. **Repository Tests**: CRUD operations, filtering, pagination
3. **Validation Tests**: Zod schema validation for all input types
4. **Component Tests**: Form components, listing components, dashboard components
5. **Utility Tests**: Date formatting, file validation, slug generation

### Property-Based Testing

**Framework**: fast-check (JavaScript property-based testing library)

**Property Test Configuration**:
- Minimum 100 iterations per property test
- Each property test tagged with: `Feature: careers-portal, Property {number}: {property_text}`
- Use custom generators for domain objects (jobs, applications, filters)

**Key Property Tests**:
1. Job filtering always returns subset of input jobs
2. Search results always contain search term
3. Validation accepts valid data and rejects invalid data
4. Status changes always create audit records
5. Email notifications always sent for status changes

### Integration Testing

**Test Scenarios**:
1. **End-to-End Application Flow**: Browse jobs → View details → Submit application → Receive confirmation
2. **Job Management Flow**: Create job → Publish → Receive applications → Update status → Close position
3. **Analytics Flow**: Track events → Aggregate metrics → Generate reports
4. **Email Flow**: Trigger notification → Verify email sent → Verify content correct

### E2E Testing

**Framework**: Playwright

**Critical User Journeys**:
1. Job seeker browses and applies for position
2. Hiring manager creates and publishes job posting
3. Hiring manager reviews applications and updates status
4. Administrator configures portal settings
5. Mobile user browses jobs and submits application

### Accessibility Testing

**Tools**: axe-core, Pa11y

**Test Coverage**:
1. Keyboard navigation through all interactive elements
2. Screen reader compatibility for all content
3. Color contrast validation for all text
4. Form label and error message accessibility
5. ARIA attribute correctness

### Performance Testing

**Metrics**:
- Page load time < 2 seconds
- Time to Interactive < 3 seconds
- First Contentful Paint < 1.5 seconds
- Largest Contentful Paint < 2.5 seconds
- Cumulative Layout Shift < 0.1

**Load Testing**:
- 100 concurrent users browsing jobs
- 50 concurrent application submissions
- Database query performance under load
- File upload performance with multiple concurrent uploads

## Security Considerations

### Authentication & Authorization

1. **Public Routes**: Job listings, job details, culture pages (no auth required)
2. **Protected Routes**: Application management, job posting management (Clerk auth required)
3. **Role-Based Access**: 
   - Hiring Manager: Create/edit own job postings, view applications for own postings
   - Administrator: Full access to all jobs, applications, and configuration
   - Applicant: View own application status (future enhancement)

### Data Protection

1. **PII Handling**: Encrypt applicant data at rest, secure transmission via HTTPS
2. **GDPR Compliance**: 
   - Explicit consent checkbox on application form
   - Data retention policies (auto-delete after configurable period)
   - Right to erasure implementation
   - Data export capability for applicants
3. **File Upload Security**:
   - Virus scanning for uploaded files
   - File type validation (whitelist approach)
   - File size limits enforced
   - Secure storage with access controls

### Input Validation

1. **Server-Side Validation**: All inputs validated with Zod schemas
2. **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
3. **XSS Prevention**: React's built-in escaping, Content Security Policy headers
4. **CSRF Protection**: Clerk's built-in CSRF protection for authenticated routes
5. **Rate Limiting**: API rate limits to prevent abuse

## Performance Optimization

### Caching Strategy

```typescript
// Upstash Redis caching for job listings (using existing RepositoryCacheService)
const CACHE_KEYS = {
  ACTIVE_JOBS: 'careers:jobs:active',
  JOB_DETAIL: (id: string) => `careers:jobs:${id}`,
  JOB_CATEGORIES: 'careers:categories',
  ANALYTICS_METRICS: (range: string) => `careers:analytics:${range}`,
}

const CACHE_TTL = {
  ACTIVE_JOBS: 300, // 5 minutes
  JOB_DETAIL: 600, // 10 minutes
  JOB_CATEGORIES: 3600, // 1 hour
  ANALYTICS_METRICS: 1800, // 30 minutes
}

// Leverage existing cache service from lib/repositories/cache-service.ts
import { getCacheService } from '@/lib/repositories/cache-service'
const cacheService = getCacheService()
```

### Database Optimization

1. **Indexes**:
   - `job_posts(status, published_at)` for active job queries
   - `job_posts(slug)` for job detail lookups
   - `applications(job_post_id, status)` for application filtering
   - `applications(email)` for applicant lookup
   - `careers_analytics(event_type, created_at)` for analytics queries

2. **Query Optimization**:
   - Use select() to fetch only needed fields
   - Implement pagination for large result sets
   - Use database-level aggregation for analytics
   - Batch operations for bulk updates

### File Storage Optimization

1. **Vercel Blob Storage**: Store resumes and documents
2. **CDN Delivery**: Serve static assets via Vercel Edge Network
3. **Image Optimization**: Use Next.js Image component for photos
4. **Lazy Loading**: Load images and heavy components on demand

### Code Splitting

1. **Route-Based Splitting**: Automatic with Next.js App Router
2. **Component Lazy Loading**: Dynamic imports for heavy components
3. **Third-Party Library Optimization**: Import only needed functions

## Deployment Strategy

### Environment Configuration

```typescript
// Required environment variables (managed via Phase.dev)
// Existing infrastructure variables:
NEXT_PUBLIC_SUPABASE_URL=              // Existing Supabase project
SUPABASE_SERVICE_ROLE_KEY=             // Existing Supabase service key
DATABASE_URL=                          // Existing PostgreSQL connection
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=     // Existing Clerk integration
CLERK_SECRET_KEY=                      // Existing Clerk secret
REDIS_URL=                             // Existing Upstash Redis URL
REDIS_TOKEN=                           // Existing Upstash Redis token

// New variables for careers portal:
BLOB_READ_WRITE_TOKEN=                 // Vercel Blob Storage token
RESEND_API_KEY=                        // Resend email API key
CAREERS_ADMIN_ROLE_ID=                 // Role ID for careers administrators
```

### Database Migrations

```sql
-- Migration: Create careers portal tables
-- File: lib/db/migrations/000X_create_careers_tables.sql

CREATE TABLE job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  -- ... (full schema as defined in Data Models)
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES job_posts(id),
  reference_number VARCHAR(50) NOT NULL UNIQUE,
  -- ... (full schema as defined in Data Models)
);

CREATE TABLE portal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  -- ... (full schema as defined in Data Models)
);

CREATE TABLE careers_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  -- ... (full schema as defined in Data Models)
);

-- Indexes for performance
CREATE INDEX idx_job_posts_status_published ON job_posts(status, published_at);
CREATE INDEX idx_job_posts_slug ON job_posts(slug);
CREATE INDEX idx_applications_job_status ON applications(job_post_id, status);
CREATE INDEX idx_applications_email ON applications(email);
CREATE INDEX idx_analytics_event_created ON careers_analytics(event_type, created_at);
```

### Deployment Pipeline

1. **Development**: Local development with Phase.dev environment variables
2. **Staging**: Vercel preview deployments for PR reviews
3. **Production**: Vercel production deployment on main branch merge

### Monitoring & Observability

1. **Error Tracking**: Sentry for error monitoring
2. **Performance Monitoring**: Vercel Analytics for Core Web Vitals
3. **Database Monitoring**: Supabase dashboard for query performance
4. **Custom Metrics**: Application-specific metrics in careers_analytics table
5. **Logging**: Structured logging with context (user, job, application IDs)

## Integration Points

### Existing Platform Integration

1. **Authentication**: Leverage existing Clerk integration with role-based access control
2. **Database**: Use existing Supabase connection (`lib/db/connection.ts`) and Drizzle ORM setup
3. **Caching**: Use existing Upstash Redis via `RepositoryCacheService` (`lib/repositories/cache-service.ts`)
4. **Repository Pattern**: Follow existing repository pattern (`lib/repositories/base-repository.ts`)
5. **UI Components**: Reuse shadcn/ui components from shared package
6. **Styling**: Follow existing Tailwind CSS configuration
7. **Testing**: Use existing Vitest and Playwright setup with Clerk testing utilities
8. **Environment Management**: Use Phase.dev for environment variable management (existing setup)
9. **Deployment**: Use existing Vercel configuration with turbo build pipeline

### External Service Integration

1. **Email Service**: Resend or SendGrid for transactional emails
2. **File Storage**: Vercel Blob Storage for resume uploads
3. **Analytics**: Custom analytics service (no third-party tracking)
4. **ATS Integration** (Future): Webhook-based integration with applicant tracking systems

## Future Enhancements

1. **Applicant Portal**: Allow applicants to track application status
2. **Interview Scheduling**: Integrated calendar for interview scheduling
3. **Video Interviews**: Integration with video conferencing platforms
4. **Referral Program**: Employee referral tracking and rewards
5. **Talent Pool**: Save promising candidates for future opportunities
6. **Advanced Analytics**: Predictive analytics for hiring success
7. **Multi-Language Support**: Internationalization for global hiring
8. **Accessibility Improvements**: Enhanced screen reader support, voice navigation
