# Blog Portal Design Document

## Overview

The Blog Portal is a comprehensive content management and publishing system built on the C9D AI platform infrastructure. It provides marketing and engineering teams with powerful tools for creating, managing, and publishing external-facing blog content while leveraging existing authentication, database, and infrastructure capabilities.

The system follows a modular architecture with clear separation between content management, editorial workflows, publishing operations, and reader-facing features. It integrates seamlessly with the existing Next.js application, Supabase database, Clerk authentication, and Vercel deployment infrastructure.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Blog Portal System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Content    │  │  Editorial   │  │  Publishing  │      │
│  │  Management  │  │   Workflow   │  │   Engine     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     SEO      │  │    Media     │  │  Analytics   │      │
│  │  Optimizer   │  │   Manager    │  │   Tracker    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    Shared Services Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Authentication (Clerk) │ Database (Supabase) │ Cache (Redis)│
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Content Management Layer**
- Rich text editor with block-based content structure
- Auto-save functionality with version control
- Media library integration
- Component library for reusable content blocks

**Editorial Workflow Layer**
- Multi-stage approval process (Draft → Review → Approved → Published)
- Inline commenting and collaboration tools
- Notification system for workflow events
- Conflict resolution for concurrent editing

**Publishing Engine**
- Immediate and scheduled publication
- Content distribution to CDN
- Social media integration
- Email notification system

**SEO Optimization Layer**
- Automatic slug generation
- Meta tag management
- Readability analysis
- Structured data generation

**Media Management Layer**
- Image optimization and responsive variants
- CDN integration for asset delivery
- Media library with search and filtering
- Asset versioning and organization

**Analytics Layer**
- Page view tracking
- Engagement metrics (time on page, scroll depth)
- Traffic source analysis
- Real-time dashboard updates

## Components and Interfaces

### Core Services

#### BlogPostService
```typescript
interface BlogPostService {
  create(data: BlogPostCreate): Promise<BlogPost>
  update(id: string, data: BlogPostUpdate): Promise<BlogPost>
  delete(id: string): Promise<void>
  getById(id: string): Promise<BlogPost | null>
  list(filters: BlogPostFilters): Promise<PaginatedResult<BlogPost>>
  publish(id: string, scheduledAt?: Date): Promise<BlogPost>
  unpublish(id: string): Promise<BlogPost>
  submitForReview(id: string): Promise<BlogPost>
  approve(id: string): Promise<BlogPost>
  requestChanges(id: string, feedback: string): Promise<BlogPost>
}
```

#### ContentBlockService
```typescript
interface ContentBlockService {
  create(postId: string, block: ContentBlock): Promise<ContentBlock>
  update(blockId: string, data: ContentBlockUpdate): Promise<ContentBlock>
  delete(blockId: string): Promise<void>
  reorder(postId: string, blockIds: string[]): Promise<void>
  getByPostId(postId: string): Promise<ContentBlock[]>
}
```

#### MediaService
```typescript
interface MediaService {
  upload(file: File, metadata: MediaMetadata): Promise<MediaAsset>
  delete(id: string): Promise<void>
  getById(id: string): Promise<MediaAsset | null>
  list(filters: MediaFilters): Promise<PaginatedResult<MediaAsset>>
  generateVariants(id: string): Promise<MediaVariant[]>
  optimizeImage(id: string): Promise<MediaAsset>
}
```

#### SEOService
```typescript
interface SEOService {
  generateSlug(title: string): Promise<string>
  validateSlug(slug: string): Promise<boolean>
  analyzeSEO(content: string, metadata: SEOMetadata): Promise<SEOAnalysis>
  generateMetaTags(post: BlogPost): Promise<MetaTags>
  generateStructuredData(post: BlogPost): Promise<StructuredData>
}
```

#### WorkflowService
```typescript
interface WorkflowService {
  transitionState(postId: string, toState: WorkflowState): Promise<BlogPost>
  addComment(postId: string, comment: Comment): Promise<Comment>
  getComments(postId: string): Promise<Comment[]>
  notifyStakeholders(postId: string, event: WorkflowEvent): Promise<void>
  checkPermissions(userId: string, postId: string, action: string): Promise<boolean>
}
```

#### AnalyticsService
```typescript
interface AnalyticsService {
  trackPageView(postId: string, metadata: ViewMetadata): Promise<void>
  trackEngagement(postId: string, metrics: EngagementMetrics): Promise<void>
  getPostAnalytics(postId: string, timeRange: TimeRange): Promise<Analytics>
  getOverviewAnalytics(filters: AnalyticsFilters): Promise<OverviewAnalytics>
  exportAnalytics(filters: AnalyticsFilters): Promise<CSVData>
}
```

### API Routes

**Content Management**
- `POST /api/blog/posts` - Create new blog post
- `GET /api/blog/posts` - List blog posts with filters
- `GET /api/blog/posts/[id]` - Get specific blog post
- `PATCH /api/blog/posts/[id]` - Update blog post
- `DELETE /api/blog/posts/[id]` - Delete blog post
- `POST /api/blog/posts/[id]/publish` - Publish blog post
- `POST /api/blog/posts/[id]/unpublish` - Unpublish blog post

**Editorial Workflow**
- `POST /api/blog/posts/[id]/submit` - Submit for review
- `POST /api/blog/posts/[id]/approve` - Approve post
- `POST /api/blog/posts/[id]/request-changes` - Request changes
- `POST /api/blog/posts/[id]/comments` - Add comment
- `GET /api/blog/posts/[id]/comments` - Get comments

**Media Management**
- `POST /api/blog/media` - Upload media asset
- `GET /api/blog/media` - List media assets
- `GET /api/blog/media/[id]` - Get specific media asset
- `DELETE /api/blog/media/[id]` - Delete media asset

**Categories and Tags**
- `GET /api/blog/categories` - List categories
- `POST /api/blog/categories` - Create category
- `GET /api/blog/tags` - List tags
- `POST /api/blog/tags` - Create tag

**Analytics**
- `POST /api/blog/analytics/track` - Track analytics event
- `GET /api/blog/analytics/posts/[id]` - Get post analytics
- `GET /api/blog/analytics/overview` - Get overview analytics

**Public Routes**
- `GET /blog` - Blog listing page
- `GET /blog/[slug]` - Individual blog post
- `GET /blog/category/[slug]` - Category listing
- `GET /blog/tag/[slug]` - Tag listing
- `GET /blog/search` - Search results

## Data Models

### BlogPost
```typescript
interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: ContentBlock[]
  featuredImageId: string | null
  authorId: string
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived'
  publishedAt: Date | null
  scheduledAt: Date | null
  seoMetadata: SEOMetadata
  categoryIds: string[]
  tagIds: string[]
  version: number
  createdAt: Date
  updatedAt: Date
}

interface ContentBlock {
  id: string
  type: 'text' | 'image' | 'code' | 'embed' | 'component'
  content: Record<string, unknown>
  order: number
  createdAt: Date
  updatedAt: Date
}

interface SEOMetadata {
  metaTitle: string
  metaDescription: string
  keywords: string[]
  ogImage: string | null
  canonicalUrl: string | null
}
```

### Category
```typescript
interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  order: number
  createdAt: Date
  updatedAt: Date
}
```

### Tag
```typescript
interface Tag {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}
```

### MediaAsset
```typescript
interface MediaAsset {
  id: string
  filename: string
  originalUrl: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  altText: string
  caption: string | null
  uploadedBy: string
  variants: MediaVariant[]
  createdAt: Date
  updatedAt: Date
}

interface MediaVariant {
  id: string
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original'
  url: string
  width: number
  height: number
}
```

### Comment
```typescript
interface Comment {
  id: string
  postId: string
  userId: string
  content: string
  resolved: boolean
  createdAt: Date
  updatedAt: Date
}
```

### PostVersion
```typescript
interface PostVersion {
  id: string
  postId: string
  version: number
  title: string
  content: ContentBlock[]
  changes: string
  createdBy: string
  createdAt: Date
}
```

### Analytics
```typescript
interface PostAnalytics {
  postId: string
  views: number
  uniqueVisitors: number
  averageTimeOnPage: number
  averageScrollDepth: number
  bounceRate: number
  trafficSources: Record<string, number>
  engagementRate: number
}
```

### Database Schema (Drizzle ORM)

Following the existing pattern from `apps/web/lib/db/schema/`, the blog portal will use Drizzle ORM for type-safe database operations:

```typescript
// apps/web/lib/db/schema/blog.ts
import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index, unique, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './users'

// Blog posts table
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  featuredImageId: uuid('featured_image_id').references(() => mediaAssets.id),
  authorId: text('author_id').notNull(),
  status: text('status', { enum: ['draft', 'in_review', 'approved', 'published', 'archived'] }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  seoMetadata: jsonb('seo_metadata').notNull().default({}),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  statusIdx: index('idx_blog_posts_status').on(table.status),
  publishedAtIdx: index('idx_blog_posts_published_at').on(table.publishedAt),
  authorIdx: index('idx_blog_posts_author').on(table.authorId),
  slugIdx: index('idx_blog_posts_slug').on(table.slug)
}))

// Content blocks table
export const contentBlocks = pgTable('content_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['text', 'image', 'code', 'embed', 'component'] }).notNull(),
  content: jsonb('content').notNull(),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  postOrderIdx: index('idx_content_blocks_post').on(table.postId, table.orderIndex)
}))

// Categories table
export const blogCategories = pgTable('blog_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: uuid('parent_id').references((): any => blogCategories.id),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  parentIdx: index('idx_blog_categories_parent').on(table.parentId)
}))

// Tags table
export const blogTags = pgTable('blog_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

// Post-Category junction table
export const blogPostCategories = pgTable('blog_post_categories', {
  postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => blogCategories.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.categoryId] })
}))

// Post-Tag junction table
export const blogPostTags = pgTable('blog_post_tags', {
  postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => blogTags.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.tagId] })
}))

// Media assets table
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  originalUrl: text('original_url').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  altText: text('alt_text').notNull(),
  caption: text('caption'),
  uploadedBy: text('uploaded_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  uploadedByIdx: index('idx_media_assets_uploaded_by').on(table.uploadedBy)
}))

// Media variants table
export const mediaVariants = pgTable('media_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),
  size: text('size', { enum: ['thumbnail', 'small', 'medium', 'large', 'original'] }).notNull(),
  url: text('url').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

// Comments table
export const blogComments = pgTable('blog_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

// Post versions table
export const blogPostVersions = pgTable('blog_post_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  title: text('title').notNull(),
  content: jsonb('content').notNull(),
  changes: text('changes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  postVersionUnique: unique().on(table.postId, table.version)
}))

// Analytics table
export const blogAnalytics = pgTable('blog_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  eventType: text('event_type', { enum: ['view', 'engagement', 'share'] }).notNull(),
  metadata: jsonb('metadata').notNull().default({}),
  sessionId: text('session_id'),
  userId: text('user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  postCreatedIdx: index('idx_blog_analytics_post').on(table.postId, table.createdAt)
}))

// Drizzle relations for type-safe joins
export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id]
  }),
  featuredImage: one(mediaAssets, {
    fields: [blogPosts.featuredImageId],
    references: [mediaAssets.id]
  }),
  contentBlocks: many(contentBlocks),
  categories: many(blogPostCategories),
  tags: many(blogPostTags),
  comments: many(blogComments),
  versions: many(blogPostVersions),
  analytics: many(blogAnalytics)
}))

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  post: one(blogPosts, {
    fields: [contentBlocks.postId],
    references: [blogPosts.id]
  })
}))

export const blogCategoriesRelations = relations(blogCategories, ({ one, many }) => ({
  parent: one(blogCategories, {
    fields: [blogCategories.parentId],
    references: [blogCategories.id]
  }),
  children: many(blogCategories),
  posts: many(blogPostCategories)
}))

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  variants: many(mediaVariants),
  posts: many(blogPosts)
}))
```

**Migration Strategy:**
- Create migration file in `apps/web/lib/db/migrations/`
- Use existing migration runner pattern from `apps/web/lib/db/migration-runner.ts`
- Run migrations via `apps/web/scripts/migrate.ts`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Content Management Properties

**Property 1: Content block type support**
*For any* content block type (text, image, code, embed, component), the system should accept and persist that block type
**Validates: Requirements 1.2**

**Property 2: Draft persistence**
*For any* blog post in draft status, saving the post should persist all content and metadata to the database
**Validates: Requirements 1.3**

**Property 3: Image optimization**
*For any* uploaded image, the system should generate optimized versions and at least 4 responsive variants (thumbnail, small, medium, large)
**Validates: Requirements 1.4, 6.1**

**Property 4: Preview rendering consistency**
*For any* blog post, the preview render output should match the published render output exactly
**Validates: Requirements 1.5**

### Editorial Workflow Properties

**Property 5: Status filtering**
*For any* query for posts with status "in_review", the system should return only posts with that exact status
**Validates: Requirements 2.1**

**Property 6: Approval state transition**
*For any* blog post with status "in_review", approving the post should change its status to "approved"
**Validates: Requirements 2.3**

**Property 7: Change request state transition**
*For any* blog post with status "in_review", requesting changes should change its status to "draft"
**Validates: Requirements 2.4**

**Property 8: Version history completeness**
*For any* blog post with N versions, retrieving version history should return exactly N version records
**Validates: Requirements 2.5**

### Publishing Properties

**Property 9: Scheduled publishing**
*For any* blog post with a future scheduled_at timestamp, the post should have status "scheduled" until that time
**Validates: Requirements 3.2**

**Property 10: Publication date immutability**
*For any* published blog post, updating the post should not change the published_at timestamp
**Validates: Requirements 3.3**

**Property 11: Unpublish data preservation**
*For any* published blog post, unpublishing should change the status but preserve all post data
**Validates: Requirements 3.4**

**Property 12: Publication queue filtering**
*For any* query for scheduled posts, the system should return only posts with status "scheduled" or future scheduled_at dates
**Validates: Requirements 3.5**

### SEO Properties

**Property 13: Slug generation**
*For any* blog post title, the system should generate a URL-safe slug containing only lowercase letters, numbers, and hyphens
**Validates: Requirements 4.1**

**Property 14: SEO metadata validation**
*For any* SEO metadata, validation should enforce meta title length ≤ 60 characters and meta description length ≤ 160 characters
**Validates: Requirements 4.3**

**Property 15: SEO analysis generation**
*For any* blog post content, SEO analysis should return readability score and keyword density metrics
**Validates: Requirements 4.4**

**Property 16: Image alt text requirement**
*For any* image added to content, the system should require non-empty alt text before allowing the image to be saved
**Validates: Requirements 4.5**

### Organization Properties

**Property 17: Hierarchical categories**
*For any* category with a parent_id, the parent category should exist in the system
**Validates: Requirements 5.1**

**Property 18: Tag creation and reuse**
*For any* tag name, if a tag with that name exists, the system should reuse it; otherwise create a new tag
**Validates: Requirements 5.2**

**Property 19: Category filtering**
*For any* category, querying posts by that category should return only posts assigned to that category
**Validates: Requirements 5.3, 7.3**

**Property 20: Tag filtering**
*For any* tag, querying posts by that tag should return only posts assigned to that tag
**Validates: Requirements 5.4**

**Property 21: Category post counts**
*For any* category, the post count in navigation should equal the number of published posts assigned to that category
**Validates: Requirements 5.5**

### Media Management Properties

**Property 22: File type validation**
*For any* uploaded file, if the MIME type is not in the allowed list (image/jpeg, image/png, image/webp, image/gif), the upload should be rejected
**Validates: Requirements 6.4**

**Property 23: CDN URL generation**
*For any* media asset, the served URL should point to the CDN domain and use optimized formats (WebP where supported)
**Validates: Requirements 6.5**

### Reader Experience Properties

**Property 24: Chronological ordering**
*For any* query for published posts without explicit sorting, posts should be ordered by published_at in descending order
**Validates: Requirements 7.1**

**Property 25: Search relevance**
*For any* search query, returned posts should contain the search terms in title, excerpt, or content
**Validates: Requirements 7.2**

**Property 26: Related posts algorithm**
*For any* blog post, related posts should share at least one tag or category with the current post
**Validates: Requirements 7.4**

### Collaboration Properties

**Property 27: Edit conflict detection**
*For any* blog post being edited by user A, if user B attempts to save changes, the system should detect the conflict and prevent data loss
**Validates: Requirements 8.1**

**Property 28: Mention notifications**
*For any* comment or content containing @username, the system should create a notification for that user
**Validates: Requirements 8.2**

**Property 29: Comment notifications**
*For any* new comment on a post, the system should notify the post author and all previous commenters
**Validates: Requirements 8.3**

**Property 30: Active editor tracking**
*For any* blog post, the system should track which users are currently editing and display this information
**Validates: Requirements 8.4**

**Property 31: Change attribution**
*For any* saved change to a blog post, the version record should attribute the change to the authenticated user who made it
**Validates: Requirements 8.5**

### Analytics Properties

**Property 32: Page view tracking**
*For any* blog post view, the system should record an analytics event with post_id, session_id, and timestamp
**Validates: Requirements 9.1**

**Property 33: Engagement tracking**
*For any* engagement event (scroll, time on page), the system should record the event with associated metrics
**Validates: Requirements 9.2**

**Property 34: CSV export format**
*For any* analytics data export, the output should be valid CSV format with headers and properly escaped values
**Validates: Requirements 9.4**

### Component Library Properties

**Property 35: Component persistence**
*For any* created reusable component, the component should be saved to the component library and retrievable by ID
**Validates: Requirements 10.1**

**Property 36: Component reference integrity**
*For any* content block referencing a component, the block should store the component ID, not a copy of the component data
**Validates: Requirements 10.2**

**Property 37: Component update propagation**
*For any* updated component, the system should identify all posts using that component and offer to update them
**Validates: Requirements 10.3**

**Property 38: Component resolution**
*For any* content block with a component reference, rendering should resolve the reference to the current component version
**Validates: Requirements 10.5**

### Permissions Properties

**Property 39: RBAC enforcement**
*For any* user action on a blog post, the system should verify the user has the required permission before allowing the operation
**Validates: Requirements 11.2, 11.3**

**Property 40: Audit logging**
*For any* blog operation (create, update, delete, publish), the system should create an audit log entry with user_id, action, and timestamp
**Validates: Requirements 11.4**

**Property 41: Permission revocation immediacy**
*For any* user whose permissions are revoked, subsequent operations should be denied immediately
**Validates: Requirements 11.5**

### Import Properties

**Property 42: Multi-format import support**
*For any* import file in Markdown, HTML, or WordPress XML format, the system should successfully parse and import the content
**Validates: Requirements 12.1**

**Property 43: Import validation**
*For any* import file with invalid structure, the system should reject the import and return specific error messages
**Validates: Requirements 12.2**

**Property 44: Import data preservation**
*For any* imported content, the system should preserve formatting, embedded images, and metadata from the source
**Validates: Requirements 12.3**

**Property 45: Import draft status**
*For any* successfully imported content, the created blog posts should have status "draft"
**Validates: Requirements 12.4**

### Subscription Properties

**Property 46: Double opt-in confirmation**
*For any* new subscription, the system should require email confirmation before activating the subscription
**Validates: Requirements 13.1**

**Property 47: Publication notifications**
*For any* blog post that transitions to "published" status, the system should send email notifications to all active subscribers
**Validates: Requirements 13.2**

**Property 48: Unsubscribe effectiveness**
*For any* user who unsubscribes, the system should not send any further email notifications to that email address
**Validates: Requirements 13.3**

**Property 49: Email compliance**
*For any* email sent by the system, the email should include unsubscribe link, sender information, and physical address
**Validates: Requirements 13.5**

### Social Media Properties

**Property 50: Auto-posting on publish**
*For any* blog post that transitions to "published" status with social sharing enabled, the system should post to all configured social platforms
**Validates: Requirements 14.1**

**Property 51: Social post optimization**
*For any* generated social media post, the content should be optimized for the target platform's character limits and image requirements
**Validates: Requirements 14.3**

**Property 52: Social engagement tracking**
*For any* social media post created by the system, engagement metrics (likes, shares, comments) should be tracked and stored
**Validates: Requirements 14.5**

### AI Features Properties

**Property 53: AI suggestion generation**
*For any* content improvement request, the AI service should return at least one suggestion
**Validates: Requirements 15.1**

**Property 54: Grammar checking**
*For any* content with grammatical errors, the grammar checker should identify the errors and provide corrections
**Validates: Requirements 15.2**

**Property 55: SEO optimization suggestions**
*For any* content analyzed for SEO, the system should provide keyword and readability suggestions
**Validates: Requirements 15.3**

**Property 56: Summary generation**
*For any* content longer than 500 words, the generated summary should be less than 20% of the original length
**Validates: Requirements 15.4**

**Property 57: AI content attribution**
*For any* AI-generated content, the system should mark it with an indicator showing it was AI-generated
**Validates: Requirements 15.5**

### API Properties

**Property 58: API rate limiting**
*For any* API key, requests exceeding the rate limit should return HTTP 429 status code
**Validates: Requirements 16.2**

**Property 59: API query parameters**
*For any* API request with filter, sort, or pagination parameters, the response should respect those parameters
**Validates: Requirements 16.3**

**Property 60: API validation errors**
*For any* API request with invalid input, the response should return HTTP 400 status with detailed error messages
**Validates: Requirements 16.4**

**Property 61: API CORS headers**
*For any* API response, the headers should include appropriate CORS headers and cache-control directives
**Validates: Requirements 16.5**

### Version Control Properties

**Property 62: Version creation on save**
*For any* blog post save operation, the system should create a new version record with incremented version number
**Validates: Requirements 17.1**

**Property 63: Version history retrieval**
*For any* blog post, retrieving version history should return all versions ordered by version number descending
**Validates: Requirements 17.2**

**Property 64: Version restoration**
*For any* version restoration, the system should create a new version (not modify existing versions) with content from the selected version
**Validates: Requirements 17.3**

**Property 65: Version retention**
*For any* blog post, all versions should be retained indefinitely and never deleted
**Validates: Requirements 17.5**

### A/B Testing Properties

**Property 66: Multiple variation support**
*For any* A/B test, the system should support at least 2 and up to 10 content variations
**Validates: Requirements 18.1**

**Property 67: Random variation assignment**
*For any* reader viewing A/B tested content, the variation assignment should be random with equal probability distribution
**Validates: Requirements 18.2**

**Property 68: Per-variation metrics**
*For any* A/B test, engagement metrics should be tracked separately for each variation
**Validates: Requirements 18.3**

**Property 69: Statistical significance calculation**
*For any* A/B test with sufficient data, the system should calculate and display statistical significance (p-value)
**Validates: Requirements 18.4**

**Property 70: Automatic winner selection**
*For any* concluded A/B test, the system should automatically publish the variation with the highest engagement rate
**Validates: Requirements 18.5**

### Localization Properties

**Property 71: Multi-language support**
*For any* blog post, the system should allow creation of translations in multiple languages
**Validates: Requirements 19.1**

**Property 72: Translation relationships**
*For any* translated blog post, the system should maintain a reference to the original post and all other translations
**Validates: Requirements 19.2**

**Property 73: Language detection**
*For any* reader request, the system should detect the preferred language from Accept-Language header and serve appropriate content
**Validates: Requirements 19.3**

**Property 74: Translation status tracking**
*For any* blog post with translations, the system should track completion status for each target language
**Validates: Requirements 19.4**

**Property 75: Hreflang tag generation**
*For any* blog post with translations, the HTML output should include hreflang tags for all language versions
**Validates: Requirements 19.5**

### Security Properties

**Property 76: Access logging**
*For any* access to blog content (read, write, delete), the system should create an audit log entry
**Validates: Requirements 20.3**

**Property 77: Suspicious activity detection**
*For any* detected suspicious activity (rapid requests, unauthorized access attempts), the system should alert administrators
**Validates: Requirements 20.4**

**Property 78: Privacy compliance**
*For any* personal data stored in the system, the system should support data export, deletion, and consent management
**Validates: Requirements 20.5**

## Error Handling

### Error Categories

**Validation Errors**
- Invalid input data (missing required fields, incorrect formats)
- SEO metadata violations (title too long, missing description)
- File upload errors (unsupported type, size exceeded)
- Slug conflicts (duplicate slugs)

**State Transition Errors**
- Invalid workflow transitions (e.g., draft → published without approval)
- Permission denied for state changes
- Concurrent edit conflicts

**Resource Errors**
- Blog post not found
- Media asset not found
- Category/tag not found
- Component not found

**External Service Errors**
- Image optimization service failures
- CDN upload failures
- Social media API errors
- Email delivery failures
- AI service unavailability

**Database Errors**
- Connection failures
- Query timeouts
- Constraint violations
- Transaction rollback scenarios

### Error Handling Strategy

```typescript
// Custom error types
class BlogPostNotFoundError extends AppError {
  statusCode = 404
  isOperational = true
}

class InvalidWorkflowTransitionError extends AppError {
  statusCode = 400
  isOperational = true
}

class MediaUploadError extends AppError {
  statusCode = 500
  isOperational = true
}

class PermissionDeniedError extends AppError {
  statusCode = 403
  isOperational = true
}

// Error handling in services
async function publishBlogPost(postId: string, userId: string): Promise<BlogPost> {
  try {
    // Check permissions
    const hasPermission = await checkPermission(userId, 'blog.publish')
    if (!hasPermission) {
      throw new PermissionDeniedError('User does not have publish permission')
    }
    
    // Get post
    const post = await BlogPostService.getById(postId)
    if (!post) {
      throw new BlogPostNotFoundError(`Blog post ${postId} not found`)
    }
    
    // Validate state transition
    if (post.status !== 'approved') {
      throw new InvalidWorkflowTransitionError(
        `Cannot publish post with status ${post.status}`
      )
    }
    
    // Publish post
    const published = await BlogPostService.publish(postId)
    
    // Handle side effects with graceful degradation
    try {
      await notifySubscribers(published)
    } catch (error) {
      logger.error('Failed to notify subscribers', { error, postId })
      // Don't fail the publish operation
    }
    
    try {
      await postToSocialMedia(published)
    } catch (error) {
      logger.error('Failed to post to social media', { error, postId })
      // Don't fail the publish operation
    }
    
    return published
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    
    // Unexpected errors
    logger.error('Unexpected error publishing blog post', { error, postId })
    throw new Error('Failed to publish blog post')
  }
}
```

### Retry Logic

```typescript
// Retry configuration for external services
const retryConfig = {
  imageOptimization: { maxRetries: 3, backoff: 'exponential' },
  cdnUpload: { maxRetries: 3, backoff: 'exponential' },
  socialMedia: { maxRetries: 2, backoff: 'linear' },
  emailDelivery: { maxRetries: 3, backoff: 'exponential' }
}

// Retry wrapper
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < config.maxRetries) {
        const delay = calculateBackoff(attempt, config.backoff)
        await sleep(delay)
      }
    }
  }
  
  throw lastError!
}
```

### Graceful Degradation

The system implements graceful degradation for non-critical features:

- **Image Optimization**: If optimization fails, serve original image
- **Social Media Posting**: Log failure but don't block publication
- **Email Notifications**: Queue for retry, don't block operations
- **Analytics Tracking**: Use fire-and-forget pattern
- **AI Features**: Provide fallback suggestions if AI service unavailable

## Testing Strategy

### Unit Testing

**Service Layer Tests**
- Test all BlogPostService methods with mocked database
- Test WorkflowService state transitions
- Test SEOService slug generation and validation
- Test MediaService upload and optimization logic
- Test AnalyticsService metric calculations

**Validation Tests**
- Test Zod schemas for all data models
- Test SEO metadata validation rules
- Test file upload validation (type, size)
- Test workflow transition validation

**Utility Function Tests**
- Test slug generation algorithm
- Test date/time formatting
- Test content sanitization
- Test markdown/HTML parsing

### Property-Based Testing

The system will use **fast-check** (TypeScript property-based testing library) to verify correctness properties.

**Configuration**:
- Minimum 100 iterations per property test
- Use custom generators for domain-specific types
- Tag each test with the property number from design document

**Example Property Tests**:

```typescript
import fc from 'fast-check'
import { describe, it, expect } from 'vitest'

/**
 * Feature: blog-portal, Property 13: Slug generation
 * Validates: Requirements 4.1
 */
describe('Property 13: Slug generation', () => {
  it('should generate URL-safe slugs for any title', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (title) => {
          const slug = generateSlug(title)
          
          // Slug should only contain lowercase letters, numbers, and hyphens
          expect(slug).toMatch(/^[a-z0-9-]+$/)
          
          // Slug should not start or end with hyphen
          expect(slug).not.toMatch(/^-|-$/)
          
          // Slug should not have consecutive hyphens
          expect(slug).not.toMatch(/--/)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: blog-portal, Property 10: Publication date immutability
 * Validates: Requirements 3.3
 */
describe('Property 10: Publication date immutability', () => {
  it('should not change published_at when updating published posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1 }),
          content: fc.array(fc.object()),
          excerpt: fc.string()
        }),
        async (updates) => {
          // Create and publish a post
          const post = await createTestPost({ status: 'published' })
          const originalPublishedAt = post.published_at
          
          // Update the post
          const updated = await BlogPostService.update(post.id, updates)
          
          // published_at should not change
          expect(updated.published_at).toEqual(originalPublishedAt)
          
          // updated_at should change
          expect(updated.updated_at).not.toEqual(post.updated_at)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: blog-portal, Property 19: Category filtering
 * Validates: Requirements 5.3, 7.3
 */
describe('Property 19: Category filtering', () => {
  it('should return only posts assigned to the queried category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        fc.uuid(),
        async (categoryIds, queryCategoryId) => {
          // Create posts with various categories
          const posts = await Promise.all(
            categoryIds.map(catId => 
              createTestPost({ categoryIds: [catId] })
            )
          )
          
          // Query by specific category
          const results = await BlogPostService.list({
            categoryId: queryCategoryId
          })
          
          // All results should have the queried category
          results.items.forEach(post => {
            expect(post.categoryIds).toContain(queryCategoryId)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Integration Testing

**API Route Tests**
- Test all blog API endpoints with real database
- Test authentication and authorization
- Test request validation and error responses
- Test pagination and filtering
- Test file upload endpoints

**Workflow Integration Tests**
- Test complete editorial workflow (draft → review → approved → published)
- Test concurrent editing scenarios
- Test notification delivery
- Test permission enforcement

**External Service Integration**
- Test image optimization service integration
- Test CDN upload integration
- Test social media API integration (with test accounts)
- Test email delivery (with test SMTP)

### End-to-End Testing

**Content Creation Flow**
1. User logs in
2. Creates new blog post
3. Adds content blocks (text, images, code)
4. Uploads featured image
5. Sets SEO metadata
6. Assigns categories and tags
7. Saves draft
8. Submits for review

**Editorial Workflow**
1. Editor reviews submitted post
2. Adds comments
3. Requests changes
4. Creator makes revisions
5. Resubmits for review
6. Editor approves
7. Publisher publishes

**Reader Experience**
1. Reader visits blog
2. Browses posts by category
3. Searches for content
4. Reads blog post
5. Views related posts
6. Subscribes to updates

### Performance Testing

**Load Testing**
- Test blog listing page with 10,000+ posts
- Test search performance with large content corpus
- Test concurrent editing by multiple users
- Test image optimization throughput
- Test analytics ingestion rate

**Optimization Targets**
- Blog listing page: < 500ms response time
- Individual post page: < 300ms response time
- Search results: < 1s response time
- Image optimization: < 5s per image
- Auto-save: < 200ms response time

## Deployment Considerations

### Infrastructure Alignment

The blog portal leverages the existing C9D AI platform infrastructure:

**Next.js Application (Vercel)**
- Deploy to Vercel with edge functions (already configured in vercel.json)
- Use ISR (Incremental Static Regeneration) for blog posts
- Configure CDN caching for static assets
- Enable image optimization through Next.js Image component
- API routes with 30s max duration and 1024MB memory (per vercel.json)
- Deployed to iad1 region for optimal performance

**Database (Supabase + Drizzle ORM)**
- Supabase PostgreSQL with existing connection pooling (via apps/web/lib/db/connection.ts)
- Use Drizzle ORM for type-safe database operations (existing pattern)
- Leverage existing schema patterns from apps/web/lib/db/schema/
- Connection configuration with SSL for production
- Prepared statements for performance
- Automatic snake_case to camelCase transformation
- Database health checks and monitoring already implemented

**Caching Layer (Upstash Redis)**
- Upstash Redis for serverless-compatible caching
- Environment variables: REDIS_URL and REDIS_TOKEN (already in vercel.json)
- Cache blog post listings (5 minute TTL)
- Cache category/tag data (15 minute TTL)
- Cache analytics aggregations (1 hour TTL)
- Session caching for authenticated users
- Rate limiting for API endpoints

```typescript
// apps/web/lib/cache/redis-client.ts
import { Redis } from '@upstash/redis'

export class BlogCacheService {
  private static redis = new Redis({
    url: process.env.REDIS_URL!,
    token: process.env.REDIS_TOKEN!
  })
  
  // Cache keys
  private static keys = {
    postList: (filters: string) => `blog:posts:list:${filters}`,
    post: (slug: string) => `blog:post:${slug}`,
    categories: () => 'blog:categories:all',
    tags: () => 'blog:tags:all',
    analytics: (postId: string, range: string) => `blog:analytics:${postId}:${range}`
  }
  
  // Cache TTLs (in seconds)
  private static ttl = {
    postList: 300, // 5 minutes
    post: 600, // 10 minutes
    categories: 900, // 15 minutes
    tags: 900, // 15 minutes
    analytics: 3600 // 1 hour
  }
  
  static async getPostList(filters: string): Promise<any | null> {
    return await this.redis.get(this.keys.postList(filters))
  }
  
  static async setPostList(filters: string, data: any): Promise<void> {
    await this.redis.setex(this.keys.postList(filters), this.ttl.postList, JSON.stringify(data))
  }
  
  static async invalidatePostList(): Promise<void> {
    const keys = await this.redis.keys('blog:posts:list:*')
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
  
  static async getPost(slug: string): Promise<any | null> {
    return await this.redis.get(this.keys.post(slug))
  }
  
  static async setPost(slug: string, data: any): Promise<void> {
    await this.redis.setex(this.keys.post(slug), this.ttl.post, JSON.stringify(data))
  }
  
  static async invalidatePost(slug: string): Promise<void> {
    await this.redis.del(this.keys.post(slug))
  }
}
```

**Media Storage (Supabase Storage)**
- Supabase Storage for original uploads
- Leverage existing Supabase client configuration
- CDN for optimized image delivery via Supabase CDN
- Automatic image format conversion (WebP)
- Lazy loading for images with Next.js Image component
- Responsive image variants generated on upload

**Authentication (Clerk)**
- Existing Clerk integration (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
- Role-based access control for blog operations
- User context for audit logging
- Webhook integration for user sync

**Environment Management (Phase.dev)**
- Centralized environment variable management via Phase.dev
- PHASE_SERVICE_TOKEN for secure access
- Environment-specific configuration (production, staging, development)
- Automatic environment variable injection during build and runtime

### Monitoring

**Application Monitoring**
- Error tracking with Sentry
- Performance monitoring with Vercel Analytics
- Custom metrics for blog operations
- Real-time alerting for critical errors

**Database Monitoring**
- Query performance tracking
- Connection pool monitoring
- Slow query logging
- Database size and growth tracking

**External Service Monitoring**
- CDN availability and performance
- Social media API rate limits
- Email delivery success rates
- AI service response times

### Security

**Authentication & Authorization**
- Clerk for user authentication
- Role-based access control (RBAC)
- API key authentication for external access
- Rate limiting on all endpoints

**Data Protection**
- Encryption at rest for sensitive data
- HTTPS for all communications
- Input sanitization and validation
- SQL injection prevention through parameterized queries
- XSS prevention through content sanitization

**Compliance**
- GDPR compliance (data export, deletion, consent)
- CAN-SPAM compliance for emails
- Accessibility compliance (WCAG 2.1 AA)
- Regular security audits

### Scalability

**Horizontal Scaling**
- Stateless application design
- Database connection pooling
- Distributed caching with Redis
- CDN for static asset delivery

**Vertical Scaling**
- Database performance optimization
- Query optimization and indexing
- Efficient data structures
- Lazy loading and pagination

**Future Considerations**
- Microservices architecture for high-scale features
- Event-driven architecture for notifications
- Search engine integration (Elasticsearch/Algolia)
- Content delivery network optimization
