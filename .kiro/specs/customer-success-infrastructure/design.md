# Design Document

## Overview

The Customer Success Infrastructure is a comprehensive system that guides users from initial signup through platform mastery. It combines onboarding checklists, progress tracking, an in-app help center, contextual tooltips, product tours, and feature announcements into a unified experience. Built on Next.js 15+ with React 19+, TypeScript, deployed on Vercel with edge functions, using Supabase for persistent storage, Upstash Redis for caching and real-time features, and Clerk authentication, the system provides proactive, context-aware assistance throughout the user journey.

The core design philosophy centers on:
- **Proactive Guidance**: Anticipate user needs and offer help before frustration occurs
- **Context Awareness**: Deliver relevant help based on user role, progress, and current activity
- **Non-Disruptive**: Provide assistance without interrupting workflow
- **Multi-Modal Learning**: Support different learning styles with text, video, and interactive content
- **Continuous Improvement**: Track usage and feedback to optimize help effectiveness
- **Personalization**: Adapt content and guidance to individual user needs and organizational contexts

### Architectural Alignment

This design integrates with the existing C9D AI platform architecture:

**Vercel Deployment Strategy**:
- Leverages existing Vercel configuration and deployment pipeline
- Uses App Router patterns consistent with apps/web structure
- Implements edge functions for low-latency help delivery
- Follows existing middleware patterns for authentication and routing
- Integrates with existing build and deployment workflows

**Database Schema Integration**:
- Extends existing Supabase schema with customer success tables
- Follows established RLS policy patterns for multi-tenant isolation
- Uses existing Drizzle ORM patterns and migration workflows
- Aligns with current naming conventions and type definitions
- Integrates with existing user and organization models via clerk_user_id

**Caching Strategy Alignment**:
- Uses existing Upstash Redis instance and connection patterns
- Follows established cache key naming conventions
- Integrates with existing rate limiting infrastructure
- Aligns with current TTL and invalidation strategies

**Authentication Integration**:
- Uses existing Clerk configuration and user management
- Follows established authentication patterns from @clerk/nextjs
- Integrates with existing organization and role structures
- Aligns with current session management and token handling

### Infrastructure Architecture

**Deployment Platform**: Vercel
- Next.js App Router with Server Components
- Edge Functions for low-latency help delivery
- Edge Middleware for context detection and routing
- Automatic CDN distribution for static help content
- Serverless Functions for API routes

**Database**: Supabase (PostgreSQL)
- Persistent storage for help articles, checklists, tours, announcements
- Row Level Security (RLS) for multi-tenant data isolation
- Real-time subscriptions for live progress updates
- Full-text search for help center content
- Vector embeddings for semantic search (future enhancement)

**Caching Layer**: Upstash Redis
- Session-based user context caching
- Help article content caching with TTL
- Search result caching for popular queries
- Real-time tour state management
- Rate limiting for API endpoints
- Analytics event buffering before batch writes

**Authentication**: Clerk
- User identity and session management
- Organization and role-based access control
- Webhook integration for user lifecycle events

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Vercel Edge Network                            │
├─────────────────────────────────────────────────────────────────┤
│  Edge Middleware (Context Detection, Routing)                   │
│  CDN (Static Help Content, Images, Videos)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Client Layer (Next.js on Vercel)                    │
├─────────────────────────────────────────────────────────────────┤
│  Server Components:                                              │
│    - OnboardingChecklist  - HelpCenter    - ProductTours        │
│    - ProgressTracker      - Articles      - Announcements       │
│  Client Components:                                              │
│    - ContextualTooltips   - FeedbackWidget - InteractiveDemos   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Service Layer (Vercel Serverless Functions)             │
├─────────────────────────────────────────────────────────────────┤
│  ChecklistService    │  HelpCenterService  │  TourService       │
│  ProgressService     │  SearchService      │  AnnouncementSvc   │
│  TooltipService      │  AnalyticsService   │  FeedbackService   │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
    ┌───────────────────────────┐   ┌──────────────────────────┐
    │   Upstash Redis Cache     │   │  Repository Layer        │
    ├───────────────────────────┤   ├──────────────────────────┤
    │ • User Context Cache      │   │ ChecklistRepo            │
    │ • Article Content Cache   │   │ HelpArticleRepo          │
    │ • Search Results Cache    │   │ TourRepo                 │
    │ • Tour State Management   │   │ AnnouncementRepo         │
    │ • Analytics Event Buffer  │   │ ProgressRepo             │
    │ • Rate Limiting           │   │ AnalyticsRepo            │
    └───────────────────────────┘   └──────────────────────────┘
                                                │
                                                ▼
                              ┌──────────────────────────────────┐
                              │  Supabase (PostgreSQL)           │
                              ├──────────────────────────────────┤
                              │ • checklists                     │
                              │ • help_articles                  │
                              │ • product_tours                  │
                              │ • user_progress                  │
                              │ • announcements                  │
                              │ • analytics_events               │
                              │ • user_feedback                  │
                              │ • bookmarks                      │
                              │ • Full-text search index         │
                              │ • Real-time subscriptions        │
                              │ • Row Level Security (RLS)       │
                              └──────────────────────────────────┘
                                                │
                                                ▼
                              ┌──────────────────────────────────┐
                              │  Clerk Authentication            │
                              ├──────────────────────────────────┤
                              │ • User Identity                  │
                              │ • Session Management             │
                              │ • Organization/Role RBAC         │
                              │ • Webhooks (user lifecycle)      │
                              └──────────────────────────────────┘
```

### Component Interaction Flow

```
User Login (Clerk)
    │
    ▼
Edge Middleware (Context Detection)
    │
    ├─── Check Redis Cache for User Context
    │         │
    │         ├─── Cache Hit ──► Use Cached Context
    │         │
    │         └─── Cache Miss ──► Fetch from Supabase → Cache in Redis
    │
    ▼
Check Onboarding Status
    │
    ├─── New User ──────────► Show Onboarding Checklist
    │                              │
    ├─── Returning User ────► Show Progress Dashboard
    │                              │
    └─── Activated User ────► Show Feature Announcements
                                   │
                                   ▼
                            Track User Activity (Buffer in Redis)
                                   │
                                   ▼
                            Detect Context (Edge Function)
                                   │
                                   ├─── Stuck on Task ──► Offer Contextual Help
                                   │                       (Cached in Redis)
                                   │
                                   ├─── New Feature ────► Trigger Product Tour
                                   │                       (State in Redis)
                                   │
                                   └─── Help Request ───► Open Help Center
                                                          (Search Cache in Redis)
```

### Caching Strategy with Upstash Redis

#### Cache Keys and TTL

```typescript
// User context cache (5 minutes)
const USER_CONTEXT_KEY = `user:context:${userId}`
const USER_CONTEXT_TTL = 300

// Help article cache (1 hour)
const ARTICLE_KEY = `article:${articleId}`
const ARTICLE_TTL = 3600

// Search results cache (15 minutes)
const SEARCH_KEY = `search:${hash(query)}:${userSegment}`
const SEARCH_TTL = 900

// Tour state cache (session duration)
const TOUR_STATE_KEY = `tour:state:${userId}:${tourId}`
const TOUR_STATE_TTL = 7200

// Analytics event buffer (1 minute before batch write)
const ANALYTICS_BUFFER_KEY = `analytics:buffer:${timestamp}`
const ANALYTICS_BUFFER_TTL = 60
```

#### Cache Invalidation Strategy

```typescript
// Invalidate on content update
async function updateHelpArticle(articleId: string, content: ArticleContent): Promise<void> {
  // Update in Supabase
  await supabase.from('help_articles').update(content).eq('id', articleId)
  
  // Invalidate Redis cache
  await redis.del(`article:${articleId}`)
  
  // Invalidate related search caches
  await redis.del(`search:*`) // Pattern-based deletion
}

// Invalidate on user progress update
async function updateUserProgress(userId: string, progress: ProgressUpdate): Promise<void> {
  // Update in Supabase
  await supabase.from('user_progress').update(progress).eq('user_id', userId)
  
  // Invalidate user context cache
  await redis.del(`user:context:${userId}`)
}
```

#### Rate Limiting with Redis

```typescript
// Rate limit help searches (10 per minute per user)
async function checkSearchRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:search:${userId}`
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, 60) // 1 minute window
  }
  
  return count <= 10
}

// Rate limit feedback submissions (5 per hour per user)
async function checkFeedbackRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:feedback:${userId}`
  const count = await redis.incr(key)
  
  if (count === 1) {
    await redis.expire(key, 3600) // 1 hour window
  }
  
  return count <= 5
}
```



### Vercel Deployment Architecture

#### Edge Functions for Low-Latency Help
```typescript
// Edge function for context detection
// Deployed to Vercel Edge Network (globally distributed)
export const config = { runtime: 'edge' }

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request)
  const context = await detectUserContext(userId) // Uses Redis cache
  
  return new Response(JSON.stringify(context), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

#### Serverless Functions for Business Logic
```typescript
// Serverless function for help article retrieval
// Deployed to Vercel Serverless (regional)
export async function GET(request: NextRequest) {
  const articleId = request.nextUrl.searchParams.get('id')
  
  // Check Redis cache first
  const cached = await redis.get(`article:${articleId}`)
  if (cached) return NextResponse.json(JSON.parse(cached))
  
  // Fetch from Supabase if not cached
  const article = await supabase
    .from('help_articles')
    .select('*')
    .eq('id', articleId)
    .single()
  
  // Cache for 1 hour
  await redis.setex(`article:${articleId}`, 3600, JSON.stringify(article.data))
  
  return NextResponse.json(article.data)
}
```

#### Static Generation for Help Content
```typescript
// Generate static pages for popular help articles
export async function generateStaticParams() {
  const { data: articles } = await supabase
    .from('help_articles')
    .select('slug')
    .order('view_count', { ascending: false })
    .limit(100)
  
  return articles.map((article) => ({
    slug: article.slug
  }))
}

// Static page with ISR (revalidate every hour)
export const revalidate = 3600

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug)
  return <ArticleView article={article} />
}
```

#### Edge Middleware for Context Routing
```typescript
// middleware.ts - Runs on Vercel Edge
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const userId = getUserIdFromCookie(request)
  
  // Check if user needs onboarding redirect
  const context = await redis.get(`user:context:${userId}`)
  if (context && JSON.parse(context).needsOnboarding) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/features/:path*']
}
```

## Components and Interfaces

### Core Components

#### 1. OnboardingChecklist Component
```typescript
interface OnboardingChecklistProps {
  userId: string
  onItemComplete: (itemId: string) => void
  onDismiss: () => void
  variant?: 'sidebar' | 'modal' | 'inline'
}

// Displays prioritized onboarding tasks
// - Shows completion status for each item
// - Estimates time and indicates importance
// - Persists completion state automatically
// - Celebrates activation milestone
// - Allows dismissal with re-access option
```

#### 2. ProgressTracker Component
```typescript
interface ProgressTrackerProps {
  userId: string
  categories: ProgressCategory[]
  showComparison?: boolean
  onMilestoneReached?: (milestone: Milestone) => void
}

interface ProgressCategory {
  id: string
  name: string
  completionPercentage: number
  items: ProgressItem[]
}

// Visual progress dashboard
// - Shows completion across multiple categories
// - Displays badges and achievements
// - Suggests next steps
// - Compares to typical adoption patterns
```

#### 3. HelpCenter Component
```typescript
interface HelpCenterProps {
  initialQuery?: string
  context?: UserContext
  onArticleView: (articleId: string) => void
  variant?: 'fullscreen' | 'sidepanel' | 'modal'
}

// In-app help center with search
// - Provides autocomplete search
// - Displays ranked results by relevance
// - Shows articles with rich media
// - Offers support escalation
// - Tracks article views for analytics
```

#### 4. ContextualTooltip Component
```typescript
interface ContextualTooltipProps {
  content: string | ReactNode
  articleLink?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  dismissible?: boolean
  onDismiss?: () => void
  children: ReactNode
}

// Inline help tooltips
// - Displays on hover or focus
// - Positions intelligently to avoid obscuring content
// - Links to detailed articles
// - Remembers dismissals
// - Accessible for screen readers
```

#### 5. ProductTour Component
```typescript
interface ProductTourProps {
  tourId: string
  steps: TourStep[]
  onComplete: () => void
  onCancel: () => void
  autoStart?: boolean
}

interface TourStep {
  id: string
  target: string // CSS selector
  title: string
  content: string | ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  action?: TourAction
}

// Guided product tours
// - Highlights UI elements sequentially
// - Waits for user acknowledgment
// - Allows cancellation and resumption
// - Marks completion status
// - Adapts to viewport size
```

#### 6. AnnouncementCenter Component
```typescript
interface AnnouncementCenterProps {
  userId: string
  onAnnouncementRead: (announcementId: string) => void
  showBadge?: boolean
  maxUnreadDisplay?: number
}

// Feature announcement system
// - Displays notification badge for unread items
// - Shows list of recent updates
// - Marks announcements as read
// - Targets by user segment
// - Provides announcement history
```

#### 7. FeedbackWidget Component
```typescript
interface FeedbackWidgetProps {
  contentId: string
  contentType: 'article' | 'tour' | 'tooltip'
  onSubmit: (feedback: Feedback) => void
  variant?: 'inline' | 'floating'
}

interface Feedback {
  rating: number
  comment?: string
  helpful: boolean
  suggestions?: string
}

// User feedback collection
// - Provides rating interface
// - Captures feedback text
// - Acknowledges submission
// - Tracks feedback for analytics
```

### Service Layer Interfaces

#### ChecklistService
```typescript
interface ChecklistService {
  // Get checklist for user
  getChecklist(userId: string): Promise<Checklist>
  
  // Complete checklist item
  completeItem(userId: string, itemId: string): Promise<void>
  
  // Check if user is activated
  checkActivation(userId: string): Promise<boolean>
  
  // Get custom checklist for organization
  getOrganizationChecklist(orgId: string): Promise<Checklist>
  
  // Update checklist configuration
  updateChecklist(checklistId: string, config: ChecklistConfig): Promise<void>
}
```

#### HelpCenterService
```typescript
interface HelpCenterService {
  // Search help articles
  search(query: string, context?: UserContext): Promise<SearchResults>
  
  // Get article by ID
  getArticle(articleId: string): Promise<HelpArticle>
  
  // Get related articles
  getRelatedArticles(articleId: string): Promise<HelpArticle[]>
  
  // Track article view
  trackView(userId: string, articleId: string): Promise<void>
  
  // Get popular articles
  getPopularArticles(limit?: number): Promise<HelpArticle[]>
}
```

#### TourService
```typescript
interface TourService {
  // Get available tours for user
  getAvailableTours(userId: string): Promise<ProductTour[]>
  
  // Get tour by ID
  getTour(tourId: string): Promise<ProductTour>
  
  // Mark tour as started
  startTour(userId: string, tourId: string): Promise<void>
  
  // Mark tour as completed
  completeTour(userId: string, tourId: string): Promise<void>
  
  // Check if tour should be shown
  shouldShowTour(userId: string, tourId: string): Promise<boolean>
}
```

#### AnnouncementService
```typescript
interface AnnouncementService {
  // Get announcements for user
  getAnnouncements(userId: string): Promise<Announcement[]>
  
  // Get unread count
  getUnreadCount(userId: string): Promise<number>
  
  // Mark announcement as read
  markAsRead(userId: string, announcementId: string): Promise<void>
  
  // Create announcement
  createAnnouncement(announcement: AnnouncementInput): Promise<string>
  
  // Target announcement to segment
  targetAnnouncement(announcementId: string, segment: UserSegment): Promise<void>
}
```

#### ProgressService
```typescript
interface ProgressService {
  // Get user progress
  getProgress(userId: string): Promise<UserProgress>
  
  // Update progress metric
  updateProgress(userId: string, metric: ProgressMetric): Promise<void>
  
  // Check for milestones
  checkMilestones(userId: string): Promise<Milestone[]>
  
  // Get suggested next steps
  getSuggestedSteps(userId: string): Promise<SuggestedStep[]>
  
  // Compare to typical patterns
  compareProgress(userId: string): Promise<ProgressComparison>
}
```

#### AnalyticsService
```typescript
interface AnalyticsService {
  // Track help event
  trackHelpEvent(event: HelpEvent): Promise<void>
  
  // Get help usage metrics
  getHelpMetrics(filters?: AnalyticsFilters): Promise<HelpMetrics>
  
  // Get popular search queries
  getPopularSearches(limit?: number): Promise<SearchQuery[]>
  
  // Identify documentation gaps
  getDocumentationGaps(): Promise<DocumentationGap[]>
  
  // Get intervention effectiveness
  getInterventionMetrics(interventionId: string): Promise<InterventionMetrics>
}
```



## Data Models

### Database Schema

**Schema Integration**: All tables follow existing C9D AI platform conventions:
- Use `clerk_user_id` for user references (aligns with existing user model)
- Follow existing naming conventions (snake_case for columns)
- Use UUID primary keys with `id` column name
- Include `created_at` and `updated_at` timestamps
- Implement RLS policies following existing patterns
- Use JSONB for flexible metadata storage
- Create indexes following existing performance patterns

#### checklists
```typescript
interface Checklist {
  id: string
  name: string
  description: string
  organization_id: string | null
  is_default: boolean
  items: ChecklistItem[]
  activation_threshold: number
  created_at: Date
  updated_at: Date
}

interface ChecklistItem {
  id: string
  title: string
  description: string
  estimated_minutes: number
  importance: 'critical' | 'high' | 'medium' | 'low'
  order: number
  help_article_id: string | null
  tour_id: string | null
}
```

#### user_checklist_progress
```typescript
interface UserChecklistProgress {
  id: string
  user_id: string
  checklist_id: string
  completed_items: string[]
  is_activated: boolean
  started_at: Date
  activated_at: Date | null
  dismissed_at: Date | null
  metadata: Record<string, unknown>
}
```

#### help_articles
```typescript
interface HelpArticle {
  id: string
  title: string
  slug: string
  content: string // Markdown or HTML
  excerpt: string
  category: string
  tags: string[]
  author_id: string
  organization_id: string | null // null for platform articles
  video_url: string | null
  interactive_demo_url: string | null
  related_article_ids: string[]
  search_keywords: string[]
  view_count: number
  helpful_count: number
  not_helpful_count: number
  published_at: Date
  updated_at: Date
}
```

#### search_index
```typescript
interface SearchIndexEntry {
  id: string
  article_id: string
  content_type: 'article' | 'tour' | 'announcement'
  title: string
  content: string
  keywords: string[]
  category: string
  tags: string[]
  relevance_score: number
  last_indexed_at: Date
}
```

#### product_tours
```typescript
interface ProductTour {
  id: string
  name: string
  description: string
  feature_id: string | null
  steps: TourStepData[]
  target_segment: UserSegment | null
  trigger_condition: TriggerCondition | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

interface TourStepData {
  id: string
  order: number
  target_selector: string
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  action_type: 'click' | 'input' | 'navigate' | 'none'
  action_target: string | null
}
```

#### tour_completions
```typescript
interface TourCompletion {
  id: string
  user_id: string
  tour_id: string
  started_at: Date
  completed_at: Date | null
  cancelled_at: Date | null
  current_step: number
  completion_percentage: number
  metadata: Record<string, unknown>
}
```

#### announcements
```typescript
interface Announcement {
  id: string
  title: string
  content: string
  announcement_type: 'feature' | 'update' | 'maintenance' | 'tip'
  priority: 'high' | 'medium' | 'low'
  target_segment: UserSegment | null
  link_url: string | null
  link_text: string | null
  image_url: string | null
  published_at: Date
  expires_at: Date | null
  created_by: string
}
```

#### user_announcement_reads
```typescript
interface UserAnnouncementRead {
  id: string
  user_id: string
  announcement_id: string
  read_at: Date
}
```

#### tooltips
```typescript
interface Tooltip {
  id: string
  target_selector: string
  content: string
  article_link: string | null
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  is_dismissible: boolean
  show_condition: ShowCondition | null
  created_at: Date
  updated_at: Date
}

interface ShowCondition {
  user_segment: UserSegment | null
  max_views: number | null
  expires_at: Date | null
}
```

#### user_tooltip_dismissals
```typescript
interface UserTooltipDismissal {
  id: string
  user_id: string
  tooltip_id: string
  dismissed_at: Date
}
```

#### user_progress
```typescript
interface UserProgress {
  id: string
  user_id: string
  onboarding_completion: number
  feature_adoption_score: number
  learning_path_progress: Record<string, number>
  milestones_achieved: string[]
  last_activity_at: Date
  created_at: Date
  updated_at: Date
}
```

#### progress_milestones
```typescript
interface ProgressMilestone {
  id: string
  name: string
  description: string
  badge_icon: string
  criteria: MilestoneCriteria
  reward_type: 'badge' | 'feature_unlock' | 'notification'
  reward_data: Record<string, unknown>
  created_at: Date
}

interface MilestoneCriteria {
  checklist_completion: number | null
  feature_usage_count: Record<string, number> | null
  time_on_platform_hours: number | null
  custom_criteria: string | null
}
```

#### user_feedback
```typescript
interface UserFeedback {
  id: string
  user_id: string
  content_id: string
  content_type: 'article' | 'tour' | 'tooltip'
  rating: number // 1-5
  helpful: boolean
  comment: string | null
  suggestions: string | null
  submitted_at: Date
  responded_at: Date | null
  response: string | null
}
```

#### bookmarks
```typescript
interface Bookmark {
  id: string
  user_id: string
  content_id: string
  content_type: 'article' | 'tour' | 'feature'
  category: string | null
  tags: string[]
  notes: string | null
  created_at: Date
  updated_at: Date
}
```

#### analytics_events
```typescript
interface AnalyticsEvent {
  id: string
  user_id: string
  event_type: HelpEventType
  event_data: Record<string, unknown>
  context: EventContext
  occurred_at: Date
}

enum HelpEventType {
  HELP_SEARCH = 'help_search',
  ARTICLE_VIEW = 'article_view',
  TOUR_START = 'tour_start',
  TOUR_COMPLETE = 'tour_complete',
  TOUR_CANCEL = 'tour_cancel',
  TOOLTIP_VIEW = 'tooltip_view',
  TOOLTIP_DISMISS = 'tooltip_dismiss',
  ANNOUNCEMENT_VIEW = 'announcement_view',
  FEEDBACK_SUBMIT = 'feedback_submit',
  BOOKMARK_CREATE = 'bookmark_create'
}

interface EventContext {
  page_url: string
  user_segment: string | null
  session_id: string
  device_type: string
}
```

### TypeScript Types

```typescript
// User context for personalization
interface UserContext {
  userId: string
  role: string
  subscriptionTier: string
  organizationId: string | null
  onboardingComplete: boolean
  featureUsage: Record<string, number>
  currentPage: string
}

// Search results
interface SearchResults {
  query: string
  results: SearchResult[]
  totalCount: number
  suggestions: string[]
}

interface SearchResult {
  id: string
  type: 'article' | 'tour' | 'announcement'
  title: string
  excerpt: string
  relevanceScore: number
  url: string
}

// User segment for targeting
interface UserSegment {
  subscriptionTiers: string[]
  roles: string[]
  organizationIds: string[]
  featureUsage: Record<string, { min?: number; max?: number }>
  progressThreshold: number | null
}

// Trigger conditions for tours
interface TriggerCondition {
  event: string
  pageUrl: string | null
  featureId: string | null
  delaySeconds: number
}

// Progress comparison
interface ProgressComparison {
  userCompletion: number
  averageCompletion: number
  percentile: number
  timeToActivation: number | null
  averageTimeToActivation: number
}

// Suggested steps
interface SuggestedStep {
  id: string
  title: string
  description: string
  type: 'checklist_item' | 'tour' | 'article' | 'feature'
  priority: number
  estimatedMinutes: number
}

// Help metrics
interface HelpMetrics {
  totalSearches: number
  totalArticleViews: number
  totalTourCompletions: number
  averageSearchesPerUser: number
  topArticles: ArticleMetric[]
  topSearches: SearchMetric[]
  documentationGaps: DocumentationGap[]
}

interface ArticleMetric {
  articleId: string
  title: string
  viewCount: number
  helpfulRating: number
  averageTimeOnPage: number
}

interface SearchMetric {
  query: string
  searchCount: number
  clickThroughRate: number
  noResultsRate: number
}

interface DocumentationGap {
  topic: string
  searchVolume: number
  availableArticles: number
  averageHelpfulRating: number
}

// Intervention metrics
interface InterventionMetrics {
  interventionId: string
  targetSegment: UserSegment
  deliveryCount: number
  engagementRate: number
  completionRate: number
  impactOnActivation: number
  controlGroupComparison: ComparisonMetrics
}

interface ComparisonMetrics {
  treatmentGroupActivation: number
  controlGroupActivation: number
  statisticalSignificance: number
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: New user checklist display
*For any* new user logging in, the rendered UI should contain an onboarding checklist component with at least one task item.
**Validates: Requirements 1.1**

### Property 2: Checklist item information completeness
*For any* checklist item rendered in the UI, the item should display completion status, estimated time, and importance level.
**Validates: Requirements 1.2**

### Property 3: Checklist completion persistence
*For any* checklist item completion action, querying the database within 100ms should return the completed status for that item.
**Validates: Requirements 1.3**

### Property 4: Activation on critical completion
*For any* user completing all critical checklist items, the user's activation status should be set to true and a celebration UI element should be rendered.
**Validates: Requirements 1.4**

### Property 5: Checklist re-access availability
*For any* dismissed checklist, the help menu or dashboard should contain a re-access link or widget.
**Validates: Requirements 1.5**

### Property 6: Progress tracker category completeness
*For any* progress tracker display, the UI should show completion percentages for onboarding, feature adoption, and learning paths.
**Validates: Requirements 2.1**

### Property 7: Feature exploration visibility
*For any* progress detail view, the display should show both used features and unexplored features.
**Validates: Requirements 2.2**

### Property 8: Milestone recognition display
*For any* milestone reached event, the UI should render a badge or achievement notification.
**Validates: Requirements 2.3**

### Property 9: Stalled progress suggestions
*For any* user with no progress changes for threshold T seconds, the system should display suggested next steps and learning resources.
**Validates: Requirements 2.4**

### Property 10: Progress comparison data presence
*For any* progress comparison view, the display should include typical adoption pattern data for comparison.
**Validates: Requirements 2.5**

### Property 11: Help center search interface
*For any* help center access, the rendered UI should contain a search input with autocomplete functionality.
**Validates: Requirements 3.1**

### Property 12: Search result relevance ranking
*For any* help search query, the returned results should be ordered by relevance score in descending order.
**Validates: Requirements 3.2**

### Property 13: Article content structure
*For any* help article view, the rendered content should contain at least one heading element and support for images, videos, or code examples.
**Validates: Requirements 3.3**

### Property 14: Support escalation options
*For any* help article view, the UI should contain contact support or request documentation options.
**Validates: Requirements 3.4**

### Property 15: Content update immediacy
*For any* help content update, accessing the content within 1 second should return the updated version without cache clearing.
**Validates: Requirements 3.5**

### Property 16: Tooltip display on interaction
*For any* UI element with associated tooltip, hovering or focusing should trigger tooltip display within 500ms.
**Validates: Requirements 4.1**

### Property 17: Tooltip positioning avoidance
*For any* displayed tooltip, the tooltip bounding box should not overlap with critical UI elements marked as high priority.
**Validates: Requirements 4.2**

### Property 18: Complex tooltip article links
*For any* tooltip marked as complex, the tooltip content should contain at least one link to a detailed help article.
**Validates: Requirements 4.3**

### Property 19: Tooltip dismissal persistence
*For any* tooltip dismissal, the same tooltip should not reappear for that user unless explicitly requested.
**Validates: Requirements 4.4**

### Property 20: Tooltip accessibility compliance
*For any* tooltip with accessibility features enabled, the tooltip should have proper ARIA attributes and screen reader announcements.
**Validates: Requirements 4.5**

### Property 21: Feature release tour offering
*For any* new feature release, users in the target segment should receive a tour offer notification.
**Validates: Requirements 5.1**

### Property 22: Tour step guidance
*For any* product tour start, each step should display visual highlights and instruction text.
**Validates: Requirements 5.2**

### Property 23: Tour step acknowledgment requirement
*For any* tour step, the tour should not advance to the next step without user acknowledgment action.
**Validates: Requirements 5.3**

### Property 24: Tour cancellation and resumption
*For any* tour cancellation, the system should offer a resume option accessible from the help menu.
**Validates: Requirements 5.4**

### Property 25: Tour completion non-repetition
*For any* completed tour, the tour should not be automatically shown again unless explicitly requested by the user.
**Validates: Requirements 5.5**

### Property 26: Feature announcement badge display
*For any* new feature release, users should see an announcement badge indicator in the UI.
**Validates: Requirements 6.1**

### Property 27: Announcement list structure
*For any* announcement view, the display should show a list of updates with descriptions and learn-more links.
**Validates: Requirements 6.2**

### Property 28: Announcement read status update
*For any* announcement marked as read, the badge indicator should be removed from the UI.
**Validates: Requirements 6.3**

### Property 29: Announcement targeting accuracy
*For any* targeted announcement, only users matching the target segment criteria should receive the announcement.
**Validates: Requirements 6.4**

### Property 30: Announcement history access
*For any* user, the help menu should contain a link to announcement history.
**Validates: Requirements 6.5**

### Property 31: Stuck user help offering
*For any* user spending more than threshold T seconds on a task without progress, relevant help resources should be proactively offered.
**Validates: Requirements 7.1**

### Property 32: Contextual help relevance
*For any* contextual help display, the help content should match the user's current page, role, and recent actions.
**Validates: Requirements 7.2**

### Property 33: Repeated access advanced suggestions
*For any* help content accessed more than N times by a user, the system should suggest related advanced topics.
**Validates: Requirements 7.3**

### Property 34: Error-specific help provision
*For any* error occurrence, the system should provide help content specific to the error type with recovery steps.
**Validates: Requirements 7.4**

### Property 35: Low engagement intervention
*For any* user with engagement score below threshold E, the system should suggest onboarding refreshers or feature discovery tours.
**Validates: Requirements 7.5**

### Property 36: Help access tracking
*For any* help resource access, a database record should be created with resource type, topic, and user context.
**Validates: Requirements 8.1**

### Property 37: Help usage report completeness
*For any* help usage analysis, the report should include most-accessed articles and common search queries.
**Validates: Requirements 8.2**

### Property 38: Documentation gap identification
*For any* topic with search volume above threshold S and article count below threshold A, the topic should be highlighted as a documentation gap.
**Validates: Requirements 8.3**

### Property 39: Help-success correlation
*For any* help usage analysis, the report should show which resources correlate with task completion versus abandonment.
**Validates: Requirements 8.4**

### Property 40: A/B testing capability
*For any* help content, administrators should be able to create A/B test variants and assign users to variants.
**Validates: Requirements 8.5**

### Property 41: Feedback option availability
*For any* help content view, the UI should provide rating and feedback submission options.
**Validates: Requirements 9.1**

### Property 42: Feedback data capture completeness
*For any* feedback submission, the database record should contain feedback text, rating, and user context.
**Validates: Requirements 9.2**

### Property 43: Feedback acknowledgment
*For any* feedback submission, the UI should display an acknowledgment message.
**Validates: Requirements 9.3**

### Property 44: Feedback aggregation accuracy
*For any* set of feedback records for content C, the aggregated rating should equal the average of all ratings for C.
**Validates: Requirements 9.4**

### Property 45: Feedback-based update notification
*For any* content update triggered by feedback, users who provided feedback should receive a notification about the improvement.
**Validates: Requirements 9.5**

### Property 46: Custom content addition capability
*For any* organization administrator, the system should allow adding custom help articles that persist to the database.
**Validates: Requirements 10.1**

### Property 47: Checklist customization capability
*For any* organization administrator, the system should allow modifying checklist items and the changes should persist.
**Validates: Requirements 10.2**

### Property 48: Content versioning functionality
*For any* custom content change, the system should create a new version record with approval workflow state.
**Validates: Requirements 10.3**

### Property 49: Organization content prioritization
*For any* user in an organization with custom content, search results should prioritize organization-specific content over generic content.
**Validates: Requirements 10.4**

### Property 50: Custom content analytics
*For any* organization with custom content, analytics should be available showing usage metrics and satisfaction ratings.
**Validates: Requirements 10.5**

### Property 51: Multi-format content availability
*For any* help article, the UI should indicate which formats (text, video, interactive demo) are available.
**Validates: Requirements 11.1**

### Property 52: Video player feature completeness
*For any* video content view, the player should provide playback controls, transcript access, and section navigation.
**Validates: Requirements 11.2**

### Property 53: Interactive demo sandbox isolation
*For any* interactive demo execution, actions should not affect production data or real user accounts.
**Validates: Requirements 11.3**

### Property 54: Format preference persistence
*For any* user setting a format preference, subsequent search results should prioritize that format.
**Validates: Requirements 11.4**

### Property 55: Format alternative indication
*For any* content request in an unavailable format, the UI should clearly indicate available alternative formats.
**Validates: Requirements 11.5**

### Property 56: Mobile responsive interface
*For any* help access on mobile devices, the UI should be responsive and optimized for touch interactions.
**Validates: Requirements 12.1**

### Property 57: Mobile content readability
*For any* help article viewed on mobile, the content should be formatted for readability on small screens.
**Validates: Requirements 12.2**

### Property 58: Mobile tour adaptation
*For any* product tour on mobile, tour steps and highlights should adapt to mobile layouts.
**Validates: Requirements 12.3**

### Property 59: Mobile voice search availability
*For any* help search on mobile, voice search capability should be available in addition to text input.
**Validates: Requirements 12.4**

### Property 60: Mobile bandwidth optimization
*For any* help access on limited bandwidth, text content should load first with media available on demand.
**Validates: Requirements 12.5**

### Property 61: Non-navigating help display
*For any* help access, the help content should open in a side panel or modal without navigating away from the current page.
**Validates: Requirements 13.1**

### Property 62: Simultaneous help and workflow interaction
*For any* help session, users should be able to interact with the main interface while help remains visible.
**Validates: Requirements 13.2**

### Property 63: Direct action link provision
*For any* help suggestion containing actions, the UI should provide direct links or buttons to execute those actions.
**Validates: Requirements 13.3**

### Property 64: Auto-close on task completion
*For any* help-guided task completion, the help content should automatically close and return focus to the main workflow.
**Validates: Requirements 13.4**

### Property 65: Quick dismiss with keyboard shortcuts
*For any* help session, keyboard shortcuts should be available to quickly dismiss the help content.
**Validates: Requirements 13.5**

### Property 66: Segment targeting criteria support
*For any* user segment definition, the system should support targeting based on subscription tier, usage patterns, role, and progress metrics.
**Validates: Requirements 14.1**

### Property 67: Intervention scheduling capability
*For any* intervention creation, the system should support scheduling tours, announcements, and help suggestions for specific segments.
**Validates: Requirements 14.2**

### Property 68: Intervention engagement tracking
*For any* delivered intervention, the system should track engagement rates and measure impact on user behavior.
**Validates: Requirements 14.3**

### Property 69: Intervention outcome recording
*For any* user response to an intervention, the system should record the outcome and adjust future targeting.
**Validates: Requirements 14.4**

### Property 70: Intervention effectiveness comparison
*For any* intervention analysis, the report should compare targeted group metrics versus control group metrics.
**Validates: Requirements 14.5**

### Property 71: Bookmark option availability
*For any* help content view, the UI should provide options to bookmark the content for later reference.
**Validates: Requirements 15.1**

### Property 72: Bookmark organization capability
*For any* bookmark creation, the system should allow categorization and custom tagging.
**Validates: Requirements 15.2**

### Property 73: Annotation attachment capability
*For any* help article or feature, users should be able to attach personal notes that persist to the database.
**Validates: Requirements 15.3**

### Property 74: Bookmark access with search and filtering
*For any* user accessing bookmarks, the UI should provide a dedicated section with search and filtering functionality.
**Validates: Requirements 15.4**

### Property 75: Bookmark sharing within organization
*For any* bookmark, users should be able to share it with team members within their organization.
**Validates: Requirements 15.5**



## Error Handling

### Error Types

```typescript
// Base customer success error
class CustomerSuccessError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true
}

// Checklist errors
class ChecklistNotFoundError extends CustomerSuccessError {
  readonly statusCode = 404
  constructor(public checklistId: string) {
    super(`Checklist not found: ${checklistId}`)
  }
}

class ChecklistItemCompletionError extends CustomerSuccessError {
  constructor(public itemId: string, public reason: string) {
    super(`Failed to complete checklist item ${itemId}: ${reason}`)
  }
}

// Help center errors
class ArticleNotFoundError extends CustomerSuccessError {
  readonly statusCode = 404
  constructor(public articleId: string) {
    super(`Help article not found: ${articleId}`)
  }
}

class SearchIndexError extends CustomerSuccessError {
  readonly statusCode = 500
  constructor(message: string) {
    super(`Search index error: ${message}`)
  }
}

// Tour errors
class TourNotFoundError extends CustomerSuccessError {
  readonly statusCode = 404
  constructor(public tourId: string) {
    super(`Product tour not found: ${tourId}`)
  }
}

class TourStepError extends CustomerSuccessError {
  constructor(public tourId: string, public stepId: string, public reason: string) {
    super(`Tour step error in ${tourId} at step ${stepId}: ${reason}`)
  }
}

// Announcement errors
class AnnouncementDeliveryError extends CustomerSuccessError {
  constructor(public announcementId: string, public userId: string) {
    super(`Failed to deliver announcement ${announcementId} to user ${userId}`)
  }
}

// Analytics errors
class AnalyticsTrackingError extends CustomerSuccessError {
  readonly statusCode = 500
  constructor(message: string, public eventData: unknown) {
    super(`Analytics tracking failed: ${message}`)
  }
}
```

### Error Handling Strategies

#### 1. Graceful Degradation for Help Features
```typescript
// Never block user workflow due to help system failures
async function displayHelpSafely(contentId: string): Promise<void> {
  try {
    const content = await helpCenterService.getArticle(contentId)
    renderHelpContent(content)
  } catch (error) {
    // Log error but don't disrupt user
    logger.warn('Help content unavailable', { contentId, error })
    
    // Show fallback message
    renderFallbackHelp('Help content temporarily unavailable. Please try again later.')
  }
}
```

#### 2. Search Fallback Mechanisms
```typescript
// Provide results even when search index fails
async function searchWithFallback(query: string): Promise<SearchResults> {
  try {
    return await searchService.search(query)
  } catch (error) {
    logger.error('Search index error', { query, error })
    
    // Fall back to simple text matching
    return await fallbackTextSearch(query)
  }
}
```

#### 3. Tour Interruption Handling
```typescript
// Handle tour interruptions gracefully
class TourManager {
  async handleTourInterruption(tourId: string, userId: string, reason: string): Promise<void> {
    try {
      // Save current progress
      await tourService.saveTourProgress(userId, tourId, this.currentStep)
      
      // Offer resume option
      await this.showResumeOption(userId, tourId)
    } catch (error) {
      logger.error('Tour interruption handling failed', { tourId, userId, error })
      
      // Clear tour state to prevent stuck state
      await this.clearTourState(userId, tourId)
    }
  }
}
```

#### 4. Analytics Failure Isolation
```typescript
// Never block features due to analytics failures
async function trackEventSafely(event: AnalyticsEvent): Promise<void> {
  try {
    await analyticsService.trackEvent(event)
  } catch (error) {
    // Log but don't throw
    logger.warn('Analytics tracking failed', { event, error })
    
    // Queue for retry
    await analyticsQueue.enqueue(event)
  }
}
```

#### 5. Content Update Conflicts
```typescript
// Handle concurrent content updates
async function updateContentWithConflictResolution(
  contentId: string,
  updates: ContentUpdate
): Promise<void> {
  try {
    await contentRepository.update(contentId, updates)
  } catch (error) {
    if (error instanceof ConflictError) {
      // Merge changes or prompt for resolution
      const resolved = await resolveConflict(contentId, updates, error.currentVersion)
      await contentRepository.update(contentId, resolved)
    } else {
      throw error
    }
  }
}
```

### User-Facing Error Messages

```typescript
const ERROR_MESSAGES = {
  HELP_UNAVAILABLE: {
    title: 'Help Temporarily Unavailable',
    message: 'We\'re having trouble loading help content. You can still use the platform normally.',
    action: 'Try Again',
    severity: 'warning'
  },
  
  SEARCH_FAILED: {
    title: 'Search Unavailable',
    message: 'Search is temporarily unavailable. Try browsing help categories instead.',
    action: 'Browse Categories',
    severity: 'warning'
  },
  
  TOUR_INTERRUPTED: {
    title: 'Tour Paused',
    message: 'Your tour has been paused. You can resume it anytime from the help menu.',
    action: 'Resume Later',
    severity: 'info'
  },
  
  FEEDBACK_FAILED: {
    title: 'Feedback Not Submitted',
    message: 'We couldn\'t submit your feedback. Please try again in a moment.',
    action: 'Retry',
    severity: 'error'
  },
  
  BOOKMARK_FAILED: {
    title: 'Bookmark Not Saved',
    message: 'We couldn\'t save your bookmark. Your other bookmarks are safe.',
    action: 'Try Again',
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

function getRecoveryActions(error: CustomerSuccessError): RecoveryAction[] {
  if (error instanceof ArticleNotFoundError) {
    return [
      {
        label: 'Search Help',
        handler: async () => await openHelpSearch(),
        isPrimary: true
      },
      {
        label: 'Contact Support',
        handler: async () => await openSupportChat(),
        isPrimary: false
      }
    ]
  }
  
  if (error instanceof TourStepError) {
    return [
      {
        label: 'Skip Step',
        handler: async () => await skipTourStep(error.tourId, error.stepId),
        isPrimary: true
      },
      {
        label: 'Exit Tour',
        handler: async () => await exitTour(error.tourId),
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
    },
    {
      label: 'Dismiss',
      handler: async () => await dismissError(),
      isPrimary: false
    }
  ]
}
```

## Testing Strategy

### Dual Testing Approach

The Customer Success Infrastructure requires both unit testing and property-based testing to ensure comprehensive coverage and correctness.

**CRITICAL REQUIREMENT**: All tests must pass with 100% success rate for tasks to be considered complete. No failing or skipped tests are acceptable.

#### Unit Testing Focus
- Specific user scenarios (new user, returning user, activated user)
- Error handling for service failures and network issues
- UI component rendering with various states
- Integration between services and repositories
- Analytics event tracking and aggregation
- Search relevance and ranking algorithms
- Tour step progression and interruption handling

#### Property-Based Testing Focus
- Universal properties that hold across all users and content
- Checklist completion and activation logic
- Progress tracking accuracy
- Search result relevance and ranking
- Tooltip positioning and display behavior
- Tour step sequencing and acknowledgment
- Announcement targeting and delivery
- Bookmark organization and sharing
- Feedback aggregation and analysis

### Testing Framework

**Property-Based Testing Library**: fast-check (for TypeScript/JavaScript)

**Configuration**: Each property-based test should run a minimum of 100 iterations to ensure statistical confidence in the properties.

**Test Tagging**: Each property-based test must include a comment explicitly referencing the correctness property from the design document:

```typescript
// Feature: customer-success-infrastructure, Property 1: New user checklist display
test('new users should see onboarding checklist', async () => {
  await fc.assert(
    fc.asyncProperty(fc.record({ userId: fc.uuid(), isNew: fc.constant(true) }), async (user) => {
      const ui = await renderDashboard(user)
      expect(ui.querySelector('[data-testid="onboarding-checklist"]')).toBeTruthy()
    }),
    { numRuns: 100 }
  )
})
```

### Integration Testing Requirements

**CRITICAL**: Integration tests must leverage real services (Supabase, Upstash Redis, Clerk) as a priority. No mocking of external services in integration tests.

#### Real Service Integration
```typescript
// ✅ CORRECT: Real Supabase integration test
describe('ChecklistService Integration', () => {
  let testUserId: string
  let testChecklistId: string
  
  beforeAll(async () => {
    // Create test data in real Supabase
    const { data: user } = await supabase.from('users').insert({
      clerk_user_id: `test_${Date.now()}`,
      email: `test_${Date.now()}@example.com`
    }).select().single()
    testUserId = user.id
    
    const { data: checklist } = await supabase.from('checklists').insert({
      name: 'Test Checklist',
      is_default: true
    }).select().single()
    testChecklistId = checklist.id
  })
  
  afterAll(async () => {
    // Clean up test data
    await supabase.from('user_checklist_progress').delete().eq('user_id', testUserId)
    await supabase.from('users').delete().eq('id', testUserId)
    await supabase.from('checklists').delete().eq('id', testChecklistId)
  })
  
  it('should complete checklist item in real database', async () => {
    const result = await ChecklistService.completeItem(testUserId, 'item-1')
    
    // Verify in real database
    const { data } = await supabase
      .from('user_checklist_progress')
      .select('completed_items')
      .eq('user_id', testUserId)
      .single()
    
    expect(data.completed_items).toContain('item-1')
  })
})
```

#### Test Data Lifecycle Management

**MANDATORY**: Test data must be managed through its entire lifecycle within the test. Do not taint the datastores.

```typescript
// Test data management pattern
class TestDataManager {
  private createdResources: Map<string, { type: string; id: string }> = new Map()
  
  async createTestUser(): Promise<string> {
    const userId = `test_user_${Date.now()}_${Math.random()}`
    const { data } = await supabase.from('users').insert({
      clerk_user_id: userId,
      email: `${userId}@test.example.com`
    }).select().single()
    
    this.createdResources.set(data.id, { type: 'user', id: data.id })
    return data.id
  }
  
  async createTestChecklist(): Promise<string> {
    const checklistId = `test_checklist_${Date.now()}_${Math.random()}`
    const { data } = await supabase.from('checklists').insert({
      name: checklistId,
      is_default: false
    }).select().single()
    
    this.createdResources.set(data.id, { type: 'checklist', id: data.id })
    return data.id
  }
  
  async cleanup(): Promise<void> {
    // Clean up in reverse order of creation
    const resources = Array.from(this.createdResources.values()).reverse()
    
    for (const resource of resources) {
      try {
        if (resource.type === 'user') {
          await supabase.from('users').delete().eq('id', resource.id)
        } else if (resource.type === 'checklist') {
          await supabase.from('checklists').delete().eq('id', resource.id)
        }
        // Add other resource types as needed
      } catch (error) {
        console.error(`Failed to clean up ${resource.type} ${resource.id}:`, error)
      }
    }
    
    this.createdResources.clear()
  }
}

// Usage in tests
describe('Integration Tests', () => {
  let testData: TestDataManager
  
  beforeEach(() => {
    testData = new TestDataManager()
  })
  
  afterEach(async () => {
    await testData.cleanup()
  })
  
  it('should test with managed data', async () => {
    const userId = await testData.createTestUser()
    const checklistId = await testData.createTestChecklist()
    
    // Test logic here
    // Cleanup happens automatically in afterEach
  })
})
```

#### Idempotency and Parallel Execution

**MANDATORY**: Testing must be idempotent and support parallel executions.

```typescript
// Idempotent test pattern with unique identifiers
describe('Parallel-Safe Integration Tests', () => {
  it('should handle concurrent checklist completions', async () => {
    // Use unique identifiers for parallel safety
    const testRunId = `${Date.now()}_${Math.random()}`
    const userId = `test_user_${testRunId}`
    
    // Create isolated test data
    const { data: user } = await supabase.from('users').insert({
      clerk_user_id: userId,
      email: `${userId}@test.example.com`
    }).select().single()
    
    try {
      // Test logic with isolated data
      await ChecklistService.completeItem(user.id, 'item-1')
      
      // Verify results
      const { data } = await supabase
        .from('user_checklist_progress')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      expect(data.completed_items).toContain('item-1')
    } finally {
      // Always clean up, even if test fails
      await supabase.from('user_checklist_progress').delete().eq('user_id', user.id)
      await supabase.from('users').delete().eq('id', user.id)
    }
  })
})

// Parallel execution configuration
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution
        isolate: true      // Isolate test environments
      }
    },
    maxConcurrency: 4 // Limit concurrent tests to avoid overwhelming services
  }
})
```

### Test Categories

#### 1. Checklist and Progress Tests
```typescript
// Unit tests
describe('ChecklistService', () => {
  it('should complete checklist item and persist immediately')
  it('should mark user as activated when all critical items complete')
  it('should allow checklist dismissal and re-access')
})

// Property tests
describe('Checklist Properties', () => {
  // Property 1: New user checklist display
  it('should display checklist for all new users')
  
  // Property 3: Checklist completion persistence
  it('should persist completion within 100ms for any item')
  
  // Property 4: Activation on critical completion
  it('should activate user when all critical items complete')
})
```

#### 2. Help Center and Search Tests
```typescript
// Unit tests
describe('HelpCenterService', () => {
  it('should return relevant articles for search query')
  it('should handle search index failures gracefully')
  it('should track article views for analytics')
})

// Property tests
describe('Help Center Properties', () => {
  // Property 11: Help center search interface
  it('should provide search with autocomplete for any access')
  
  // Property 12: Search result relevance ranking
  it('should rank results by relevance for any query')
  
  // Property 15: Content update immediacy
  it('should reflect updates within 1 second without cache clearing')
})
```

#### 3. Product Tour Tests
```typescript
// Unit tests
describe('TourService', () => {
  it('should start tour and highlight first step')
  it('should wait for acknowledgment before advancing')
  it('should handle tour cancellation and offer resume')
})

// Property tests
describe('Tour Properties', () => {
  // Property 22: Tour step guidance
  it('should display highlights and instructions for any tour start')
  
  // Property 23: Tour step acknowledgment requirement
  it('should not advance without acknowledgment for any step')
  
  // Property 25: Tour completion non-repetition
  it('should not auto-show completed tours unless requested')
})
```

#### 4. Announcement Tests
```typescript
// Unit tests
describe('AnnouncementService', () => {
  it('should deliver announcements to target segment')
  it('should mark announcements as read')
  it('should provide announcement history')
})

// Property tests
describe('Announcement Properties', () => {
  // Property 26: Feature announcement badge display
  it('should display badge for any new feature release')
  
  // Property 29: Announcement targeting accuracy
  it('should deliver only to matching segment for any targeted announcement')
  
  // Property 30: Announcement history access
  it('should provide history link for any user')
})
```

#### 5. Analytics and Feedback Tests
```typescript
// Unit tests
describe('AnalyticsService', () => {
  it('should track help events without blocking user flow')
  it('should aggregate metrics accurately')
  it('should identify documentation gaps')
})

// Property tests
describe('Analytics Properties', () => {
  // Property 36: Help access tracking
  it('should create tracking record for any help access')
  
  // Property 44: Feedback aggregation accuracy
  it('should calculate average rating correctly for any feedback set')
  
  // Property 70: Intervention effectiveness comparison
  it('should compare treatment vs control for any intervention')
})
```

#### 6. Integration Tests
```typescript
describe('Customer Success Integration', () => {
  it('should complete full onboarding flow from login to activation')
  it('should deliver contextual help based on user behavior')
  it('should track user journey from new user to proficient')
  it('should handle concurrent help requests without conflicts')
  it('should synchronize progress across multiple devices')
})
```

#### 7. E2E Tests with Clerk Authentication

**MANDATORY**: All E2E tests must follow Clerk authentication guidelines and manage their own seed data with idempotency.

```typescript
// E2E test with Clerk authentication
import { test, expect } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'

describe('Customer Success E2E', () => {
  let testUser: { id: string; email: string; password: string }
  
  test.beforeEach(async ({ page }) => {
    // Create unique test user for this run
    const testRunId = `${Date.now()}_${Math.random()}`
    testUser = {
      id: `test_user_${testRunId}`,
      email: `test_${testRunId}@example.com`,
      password: 'TestPassword123!'
    }
    
    // Create test user in Clerk using official testing utilities
    await clerk.signUp({
      page,
      signUpParams: {
        emailAddress: testUser.email,
        password: testUser.password
      }
    })
    
    // Seed test data in Supabase
    await seedTestData(testUser.id)
  })
  
  test.afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testUser.id)
    
    // Clean up Clerk test user
    await clerk.deleteUser({ userId: testUser.id })
  })
  
  test('should guide new user through complete onboarding', async ({ page }) => {
    // Test is idempotent - uses unique test data
    await page.goto('/dashboard')
    
    // Verify onboarding checklist appears
    await expect(page.locator('[data-testid="onboarding-checklist"]')).toBeVisible()
    
    // Complete checklist items
    await page.click('[data-testid="checklist-item-1"]')
    await page.click('[data-testid="checklist-item-2"]')
    
    // Verify activation celebration
    await expect(page.locator('[data-testid="activation-celebration"]')).toBeVisible()
  })
  
  test('should provide help when user appears stuck', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Simulate stuck behavior (no activity for threshold time)
    await page.waitForTimeout(5000)
    
    // Verify contextual help appears
    await expect(page.locator('[data-testid="contextual-help"]')).toBeVisible()
  })
  
  test('should deliver product tour for new feature', async ({ page }) => {
    // Seed tour data for this test
    const tourId = await seedProductTour(testUser.id)
    
    try {
      await page.goto('/features/new-feature')
      
      // Verify tour offer appears
      await expect(page.locator('[data-testid="tour-offer"]')).toBeVisible()
      
      // Start tour
      await page.click('[data-testid="start-tour-button"]')
      
      // Verify tour steps
      await expect(page.locator('[data-testid="tour-step-1"]')).toBeVisible()
      
      // Complete tour
      await page.click('[data-testid="tour-next-button"]')
      await page.click('[data-testid="tour-complete-button"]')
      
      // Verify tour marked as complete
      await expect(page.locator('[data-testid="tour-completed"]')).toBeVisible()
    } finally {
      // Clean up tour data
      await cleanupProductTour(tourId)
    }
  })
})

// Test data seeding helpers
async function seedTestData(userId: string): Promise<void> {
  // Create user record in Supabase
  await supabase.from('users').insert({
    clerk_user_id: userId,
    email: `${userId}@test.example.com`
  })
  
  // Create default checklist progress
  await supabase.from('user_checklist_progress').insert({
    user_id: userId,
    checklist_id: 'default-checklist',
    completed_items: []
  })
}

async function cleanupTestData(userId: string): Promise<void> {
  // Clean up in reverse order of dependencies
  await supabase.from('user_checklist_progress').delete().eq('user_id', userId)
  await supabase.from('user_progress').delete().eq('user_id', userId)
  await supabase.from('analytics_events').delete().eq('user_id', userId)
  await supabase.from('users').delete().eq('clerk_user_id', userId)
}

async function seedProductTour(userId: string): Promise<string> {
  const tourId = `test_tour_${Date.now()}_${Math.random()}`
  
  await supabase.from('product_tours').insert({
    id: tourId,
    name: 'Test Tour',
    is_active: true,
    steps: [
      { id: 'step-1', order: 1, title: 'Step 1', content: 'Test content' }
    ]
  })
  
  return tourId
}

async function cleanupProductTour(tourId: string): Promise<void> {
  await supabase.from('tour_completions').delete().eq('tour_id', tourId)
  await supabase.from('product_tours').delete().eq('id', tourId)
}
```

#### E2E Test Idempotency Requirements

1. **Unique Test Data**: Every test run must use unique identifiers (timestamps + random values)
2. **Complete Lifecycle**: Tests must create and clean up all data within the test
3. **Parallel Safety**: Tests must not interfere with each other when run in parallel
4. **Clerk Integration**: Use official @clerk/testing utilities for authentication
5. **Cleanup Guarantee**: Use try/finally blocks to ensure cleanup even on test failure

### Performance Testing

```typescript
describe('Customer Success Performance', () => {
  it('should load help center search results within 500ms')
  it('should display tooltips within 200ms of hover')
  it('should handle 1000 concurrent help requests')
  it('should index new content within 5 seconds')
  it('should track analytics events without impacting UI responsiveness')
})
```

### Accessibility Testing

```typescript
describe('Customer Success Accessibility', () => {
  it('should provide keyboard navigation for all help features')
  it('should announce tooltips to screen readers')
  it('should support high contrast mode for all UI elements')
  it('should provide text alternatives for all visual content')
  it('should maintain focus management during tours')
})
```

### Success Criteria

**MANDATORY REQUIREMENTS** (All must be met for task completion):

#### Test Execution
- ✅ All unit tests pass with 100% success rate (zero failures, zero skips)
- ✅ All property-based tests pass with 100 iterations minimum
- ✅ All integration tests pass using real services (Supabase, Redis, Clerk)
- ✅ All E2E tests pass with Clerk authentication and managed seed data
- ✅ Tests are idempotent and support parallel execution
- ✅ Test data lifecycle is fully managed (create and cleanup within tests)

#### Code Coverage
- ✅ Services: 100% coverage (critical business logic)
- ✅ Repositories: 95% coverage (data layer)
- ✅ API routes: 90% coverage (external interfaces)
- ✅ Components: 85% coverage (UI layer)

#### Integration Quality
- ✅ Integration tests use real Supabase connections (no mocking)
- ✅ Integration tests use real Upstash Redis (no mocking)
- ✅ Integration tests use official Clerk testing utilities
- ✅ Test data does not taint production or shared datastores
- ✅ All test data is cleaned up, even on test failure

#### E2E Quality
- ✅ E2E tests use official @clerk/testing/playwright utilities
- ✅ E2E tests create unique test users per run
- ✅ E2E tests seed and cleanup their own data
- ✅ E2E tests are idempotent across multiple runs
- ✅ E2E tests can run in parallel without conflicts

#### Performance and Accessibility
- ✅ Performance tests meet defined thresholds
- ✅ Accessibility tests confirm WCAG 2.1 AA compliance
- ✅ No memory leaks or resource exhaustion in test execution

#### Architectural Alignment
- ✅ Follows existing Vercel deployment patterns
- ✅ Integrates with existing Supabase schema conventions
- ✅ Uses existing Upstash Redis connection patterns
- ✅ Follows existing Clerk authentication patterns
- ✅ Aligns with existing Drizzle ORM and migration workflows

