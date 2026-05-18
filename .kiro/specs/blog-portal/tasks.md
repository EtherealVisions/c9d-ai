# Implementation Plan

- [ ] 1. Set up database schema and migrations
- [ ] 1.1 Create Drizzle schema for blog tables
  - Create `apps/web/lib/db/schema/blog.ts` with all blog-related tables
  - Define tables: blog_posts, content_blocks, blog_categories, blog_tags, media_assets, etc.
  - Add Drizzle relations for type-safe joins
  - _Requirements: 1.1, 1.2, 5.1, 6.1_

- [ ] 1.2 Create database migration
  - Create migration file in `apps/web/lib/db/migrations/`
  - Include all table definitions, indexes, and constraints
  - Test migration with existing migration runner
  - _Requirements: 1.1, 1.2, 5.1, 6.1_

- [ ] 1.3 Create Zod validation schemas
  - Create `apps/web/lib/validation/schemas/blog.ts`
  - Define schemas for BlogPost, ContentBlock, Category, Tag, MediaAsset
  - Include SEO metadata validation
  - _Requirements: 4.3, 6.4_

- [ ] 1.4 Write property test for schema validation
  - **Property 14: SEO metadata validation**
  - **Validates: Requirements 4.3**

- [ ] 2. Implement core blog post service
- [ ] 2.1 Create BlogPostService with CRUD operations
  - Implement create, read, update, delete operations
  - Use Drizzle ORM for database queries
  - Include proper error handling
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2.2 Write property test for draft persistence
  - **Property 2: Draft persistence**
  - **Validates: Requirements 1.3**

- [ ] 2.3 Write property test for publication date immutability
  - **Property 10: Publication date immutability**
  - **Validates: Requirements 3.3**

- [ ] 2.4 Implement auto-save functionality
  - Create auto-save endpoint with debouncing
  - Store draft versions with timestamps
  - _Requirements: 1.3_

- [ ] 2.5 Write property test for version creation
  - **Property 62: Version creation on save**
  - **Validates: Requirements 17.1**

- [ ] 3. Implement content block management
- [ ] 3.1 Create ContentBlockService
  - Implement create, update, delete, reorder operations
  - Support all block types (text, image, code, embed, component)
  - Handle block ordering logic
  - _Requirements: 1.2_

- [ ] 3.2 Write property test for content block types
  - **Property 1: Content block type support**
  - **Validates: Requirements 1.2**

- [ ] 3.3 Create rich text editor component
  - Implement block-based editor UI
  - Add formatting toolbar
  - Support drag-and-drop reordering
  - _Requirements: 1.1, 1.2_

- [ ] 4. Implement SEO optimization features
- [ ] 4.1 Create SEOService
  - Implement slug generation from titles
  - Add slug validation and uniqueness checking
  - Create SEO analysis functions
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 4.2 Write property test for slug generation
  - **Property 13: Slug generation**
  - **Validates: Requirements 4.1**

- [ ] 4.3 Create SEO metadata editor component
  - Build UI for meta title, description, keywords
  - Add character count indicators
  - Show SEO preview
  - _Requirements: 4.2, 4.3_

- [ ] 4.4 Write property test for alt text requirement
  - **Property 16: Image alt text requirement**
  - **Validates: Requirements 4.5**

- [ ] 5. Implement media management system
- [ ] 5.1 Create MediaService
  - Implement upload to Supabase Storage
  - Generate responsive image variants
  - Create media library queries
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 5.2 Write property test for image optimization
  - **Property 3: Image optimization**
  - **Validates: Requirements 1.4, 6.1**

- [ ] 5.3 Write property test for file type validation
  - **Property 22: File type validation**
  - **Validates: Requirements 6.4**

- [ ] 5.4 Create media library UI component
  - Build grid view with search and filters
  - Add upload interface with drag-and-drop
  - Show image previews and metadata
  - _Requirements: 6.2_

- [ ] 5.5 Implement image optimization pipeline
  - Integrate with image processing library (sharp)
  - Generate WebP variants
  - Create responsive sizes (thumbnail, small, medium, large)
  - _Requirements: 1.4, 6.1_

- [ ] 5.6 Write property test for CDN URL generation
  - **Property 23: CDN URL generation**
  - **Validates: Requirements 6.5**

- [ ] 6. Implement category and tag management
- [ ] 6.1 Create CategoryService and TagService
  - Implement CRUD operations for categories and tags
  - Support hierarchical categories
  - Add slug generation for both
  - _Requirements: 5.1, 5.2_

- [ ] 6.2 Write property test for hierarchical categories
  - **Property 17: Hierarchical categories**
  - **Validates: Requirements 5.1**

- [ ] 6.3 Write property test for tag creation and reuse
  - **Property 18: Tag creation and reuse**
  - **Validates: Requirements 5.2**

- [ ] 6.4 Create category and tag UI components
  - Build category tree selector
  - Add tag input with autocomplete
  - Show post counts per category
  - _Requirements: 5.1, 5.2, 5.5_

- [ ] 6.5 Write property test for category filtering
  - **Property 19: Category filtering**
  - **Validates: Requirements 5.3, 7.3**

- [ ] 6.6 Write property test for tag filtering
  - **Property 20: Tag filtering**
  - **Validates: Requirements 5.4**

- [ ] 7. Implement editorial workflow
- [ ] 7.1 Create WorkflowService
  - Implement state transition logic (draft → review → approved → published)
  - Add permission checks for each transition
  - Create notification system for workflow events
  - _Requirements: 2.1, 2.3, 2.4_

- [ ] 7.2 Write property test for approval state transition
  - **Property 6: Approval state transition**
  - **Validates: Requirements 2.3**

- [ ] 7.3 Write property test for change request transition
  - **Property 7: Change request state transition**
  - **Validates: Requirements 2.4**

- [ ] 7.4 Create comment system
  - Implement inline commenting on content
  - Add comment resolution tracking
  - Build comment notification system
  - _Requirements: 2.2, 8.3_

- [ ] 7.5 Write property test for comment notifications
  - **Property 29: Comment notifications**
  - **Validates: Requirements 8.3**

- [ ] 7.6 Build workflow UI components
  - Create review dashboard
  - Add approval/rejection buttons
  - Show workflow history timeline
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 8. Implement publishing engine
- [ ] 8.1 Create PublishingService
  - Implement immediate publication
  - Add scheduled publication with cron job
  - Create unpublish functionality
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 8.2 Write property test for scheduled publishing
  - **Property 9: Scheduled publishing**
  - **Validates: Requirements 3.2**

- [ ] 8.3 Write property test for unpublish data preservation
  - **Property 11: Unpublish data preservation**
  - **Validates: Requirements 3.4**

- [ ] 8.4 Implement publication queue
  - Create scheduled post monitoring
  - Add automatic publication at scheduled time
  - Build queue management UI
  - _Requirements: 3.2, 3.5_

- [ ] 8.5 Write property test for publication queue filtering
  - **Property 12: Publication queue filtering**
  - **Validates: Requirements 3.5**

- [ ] 9. Implement caching layer with Upstash Redis
- [ ] 9.1 Create BlogCacheService
  - Set up Upstash Redis client
  - Implement cache methods for posts, categories, tags
  - Add cache invalidation logic
  - _Requirements: 7.1, 7.2_

- [ ] 9.2 Add caching to blog post queries
  - Cache post listings with filters
  - Cache individual posts by slug
  - Implement cache-aside pattern
  - _Requirements: 7.1_

- [ ] 9.3 Add caching to category and tag queries
  - Cache category tree
  - Cache tag lists
  - Set appropriate TTLs
  - _Requirements: 5.3, 5.4_

- [ ] 9.4 Write unit tests for cache service
  - Test cache get/set operations
  - Test cache invalidation
  - Test TTL behavior
  - _Requirements: 7.1, 7.2_

- [ ] 10. Implement reader-facing blog pages
- [ ] 10.1 Create blog listing page
  - Build `/blog` route with post grid
  - Add pagination
  - Implement filters (category, tag, search)
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 10.2 Write property test for chronological ordering
  - **Property 24: Chronological ordering**
  - **Validates: Requirements 7.1**

- [ ] 10.3 Create individual blog post page
  - Build `/blog/[slug]` route
  - Render content blocks
  - Show related posts
  - Add social sharing buttons
  - _Requirements: 7.4_

- [ ] 10.4 Write property test for preview rendering consistency
  - **Property 4: Preview rendering consistency**
  - **Validates: Requirements 1.5**

- [ ] 10.5 Create category and tag pages
  - Build `/blog/category/[slug]` route
  - Build `/blog/tag/[slug]` route
  - Show filtered post listings
  - _Requirements: 5.3, 5.4_

- [ ] 10.6 Implement search functionality
  - Add full-text search on posts
  - Create search results page
  - Implement search relevance ranking
  - _Requirements: 7.2_

- [ ] 10.7 Write property test for search relevance
  - **Property 25: Search relevance**
  - **Validates: Requirements 7.2**

- [ ] 10.8 Write property test for related posts algorithm
  - **Property 26: Related posts algorithm**
  - **Validates: Requirements 7.4**

- [ ] 11. Implement analytics tracking
- [ ] 11.1 Create AnalyticsService
  - Implement page view tracking
  - Add engagement metrics (time on page, scroll depth)
  - Create analytics aggregation queries
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 11.2 Write property test for page view tracking
  - **Property 32: Page view tracking**
  - **Validates: Requirements 9.1**

- [ ] 11.3 Write property test for engagement tracking
  - **Property 33: Engagement tracking**
  - **Validates: Requirements 9.2**

- [ ] 11.4 Create analytics dashboard
  - Build analytics overview page
  - Show charts for views, engagement, traffic sources
  - Add date range filters
  - _Requirements: 9.3_

- [ ] 11.5 Implement analytics export
  - Create CSV export functionality
  - Add export API endpoint
  - _Requirements: 9.4_

- [ ] 11.6 Write property test for CSV export format
  - **Property 34: CSV export format**
  - **Validates: Requirements 9.4**

- [ ] 12. Implement collaboration features
- [ ] 12.1 Create collaboration service
  - Implement concurrent edit detection
  - Add active editor tracking
  - Create mention notification system
  - _Requirements: 8.1, 8.2, 8.4_

- [ ] 12.2 Write property test for edit conflict detection
  - **Property 27: Edit conflict detection**
  - **Validates: Requirements 8.1**

- [ ] 12.3 Write property test for mention notifications
  - **Property 28: Mention notifications**
  - **Validates: Requirements 8.2**

- [ ] 12.4 Write property test for active editor tracking
  - **Property 30: Active editor tracking**
  - **Validates: Requirements 8.4**

- [ ] 12.5 Write property test for change attribution
  - **Property 31: Change attribution**
  - **Validates: Requirements 8.5**

- [ ] 13. Implement permissions and RBAC
- [ ] 13.1 Create blog permission system
  - Define blog-specific permissions (create, edit, publish, delete)
  - Integrate with existing Clerk roles
  - Add permission checking middleware
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 13.2 Write property test for RBAC enforcement
  - **Property 39: RBAC enforcement**
  - **Validates: Requirements 11.2, 11.3**

- [ ] 13.3 Implement audit logging
  - Create audit log entries for all blog operations
  - Store user, action, timestamp, and changes
  - Build audit log viewer
  - _Requirements: 11.4_

- [ ] 13.4 Write property test for audit logging
  - **Property 40: Audit logging**
  - **Validates: Requirements 11.4**

- [ ] 13.5 Write property test for permission revocation
  - **Property 41: Permission revocation immediacy**
  - **Validates: Requirements 11.5**

- [ ] 14. Implement content import system
- [ ] 14.1 Create ImportService
  - Implement Markdown parser
  - Add HTML parser
  - Create WordPress XML parser
  - _Requirements: 12.1, 12.2_

- [ ] 14.2 Write property test for multi-format import
  - **Property 42: Multi-format import support**
  - **Validates: Requirements 12.1**

- [ ] 14.3 Write property test for import validation
  - **Property 43: Import validation**
  - **Validates: Requirements 12.2**

- [ ] 14.4 Write property test for import data preservation
  - **Property 44: Import data preservation**
  - **Validates: Requirements 12.3**

- [ ] 14.5 Create import UI
  - Build file upload interface
  - Show import progress
  - Display validation errors
  - _Requirements: 12.2, 12.5_

- [ ] 14.6 Write property test for import draft status
  - **Property 45: Import draft status**
  - **Validates: Requirements 12.4**

- [ ] 15. Implement subscription system
- [ ] 15.1 Create SubscriptionService
  - Implement email subscription with double opt-in
  - Add unsubscribe functionality
  - Create preference management
  - _Requirements: 13.1, 13.3, 13.4_

- [ ] 15.2 Write property test for double opt-in
  - **Property 46: Double opt-in confirmation**
  - **Validates: Requirements 13.1**

- [ ] 15.3 Write property test for unsubscribe effectiveness
  - **Property 48: Unsubscribe effectiveness**
  - **Validates: Requirements 13.3**

- [ ] 15.4 Implement email notification system
  - Create email templates for new posts
  - Add email sending via service (SendGrid/Resend)
  - Implement notification queue
  - _Requirements: 13.2_

- [ ] 15.5 Write property test for publication notifications
  - **Property 47: Publication notifications**
  - **Validates: Requirements 13.2**

- [ ] 15.6 Write property test for email compliance
  - **Property 49: Email compliance**
  - **Validates: Requirements 13.5**

- [ ] 16. Implement social media integration
- [ ] 16.1 Create SocialMediaService
  - Integrate with Twitter API
  - Integrate with LinkedIn API
  - Integrate with Facebook API
  - _Requirements: 14.1, 14.2_

- [ ] 16.2 Write property test for auto-posting
  - **Property 50: Auto-posting on publish**
  - **Validates: Requirements 14.1**

- [ ] 16.3 Write property test for social post optimization
  - **Property 51: Social post optimization**
  - **Validates: Requirements 14.3**

- [ ] 16.4 Create social media preview component
  - Show how posts will appear on each platform
  - Add platform-specific customization
  - _Requirements: 14.4_

- [ ] 16.5 Implement social engagement tracking
  - Track likes, shares, comments from social platforms
  - Store engagement metrics
  - _Requirements: 14.5_

- [ ] 16.6 Write property test for social engagement tracking
  - **Property 52: Social engagement tracking**
  - **Validates: Requirements 14.5**

- [ ] 17. Implement AI-assisted writing features
- [ ] 17.1 Create AIService
  - Integrate with OpenAI API (already configured in vercel.json)
  - Implement content improvement suggestions
  - Add grammar checking
  - Create SEO optimization suggestions
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 17.2 Write property test for AI suggestion generation
  - **Property 53: AI suggestion generation**
  - **Validates: Requirements 15.1**

- [ ] 17.3 Write property test for grammar checking
  - **Property 54: Grammar checking**
  - **Validates: Requirements 15.2**

- [ ] 17.4 Write property test for SEO optimization suggestions
  - **Property 55: SEO optimization suggestions**
  - **Validates: Requirements 15.3**

- [ ] 17.5 Implement summary generation
  - Create AI-powered summary generation
  - Add summary length controls
  - _Requirements: 15.4_

- [ ] 17.6 Write property test for summary generation
  - **Property 56: Summary generation**
  - **Validates: Requirements 15.4**

- [ ] 17.7 Write property test for AI content attribution
  - **Property 57: AI content attribution**
  - **Validates: Requirements 15.5**

- [ ] 18. Implement blog API endpoints
- [ ] 18.1 Create blog post API routes
  - POST /api/blog/posts - Create post
  - GET /api/blog/posts - List posts
  - GET /api/blog/posts/[id] - Get post
  - PATCH /api/blog/posts/[id] - Update post
  - DELETE /api/blog/posts/[id] - Delete post
  - _Requirements: 16.1_

- [ ] 18.2 Write property test for API rate limiting
  - **Property 58: API rate limiting**
  - **Validates: Requirements 16.2**

- [ ] 18.3 Write property test for API query parameters
  - **Property 59: API query parameters**
  - **Validates: Requirements 16.3**

- [ ] 18.4 Create workflow API routes
  - POST /api/blog/posts/[id]/submit - Submit for review
  - POST /api/blog/posts/[id]/approve - Approve post
  - POST /api/blog/posts/[id]/request-changes - Request changes
  - POST /api/blog/posts/[id]/publish - Publish post
  - _Requirements: 2.3, 2.4, 3.1_

- [ ] 18.5 Write property test for API validation errors
  - **Property 60: API validation errors**
  - **Validates: Requirements 16.4**

- [ ] 18.6 Create media API routes
  - POST /api/blog/media - Upload media
  - GET /api/blog/media - List media
  - GET /api/blog/media/[id] - Get media
  - DELETE /api/blog/media/[id] - Delete media
  - _Requirements: 6.1, 6.2_

- [ ] 18.7 Write property test for API CORS headers
  - **Property 61: API CORS headers**
  - **Validates: Requirements 16.5**

- [ ] 19. Implement version control system
- [ ] 19.1 Create VersionService
  - Implement version creation on save
  - Add version history retrieval
  - Create version comparison logic
  - Implement version restoration
  - _Requirements: 17.1, 17.2, 17.3_

- [ ] 19.2 Write property test for version history retrieval
  - **Property 63: Version history retrieval**
  - **Validates: Requirements 17.2**

- [ ] 19.3 Write property test for version restoration
  - **Property 64: Version restoration**
  - **Validates: Requirements 17.3**

- [ ] 19.4 Write property test for version retention
  - **Property 65: Version retention**
  - **Validates: Requirements 17.5**

- [ ] 19.5 Create version history UI
  - Build version timeline view
  - Add diff viewer with highlighting
  - Create restore version button
  - _Requirements: 17.2, 17.4_

- [ ] 20. Implement A/B testing system
- [ ] 20.1 Create ABTestService
  - Implement test creation with multiple variations
  - Add random variation assignment
  - Create metrics tracking per variation
  - Implement statistical significance calculation
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 20.2 Write property test for multiple variation support
  - **Property 66: Multiple variation support**
  - **Validates: Requirements 18.1**

- [ ] 20.3 Write property test for random variation assignment
  - **Property 67: Random variation assignment**
  - **Validates: Requirements 18.2**

- [ ] 20.4 Write property test for per-variation metrics
  - **Property 68: Per-variation metrics**
  - **Validates: Requirements 18.3**

- [ ] 20.5 Write property test for statistical significance
  - **Property 69: Statistical significance calculation**
  - **Validates: Requirements 18.4**

- [ ] 20.6 Implement automatic winner selection
  - Create test conclusion logic
  - Add automatic publication of winning variation
  - _Requirements: 18.5_

- [ ] 20.7 Write property test for automatic winner selection
  - **Property 70: Automatic winner selection**
  - **Validates: Requirements 18.5**

- [ ] 21. Implement localization system
- [ ] 21.1 Create LocalizationService
  - Implement multi-language post creation
  - Add translation relationship management
  - Create language detection logic
  - _Requirements: 19.1, 19.2, 19.3_

- [ ] 21.2 Write property test for multi-language support
  - **Property 71: Multi-language support**
  - **Validates: Requirements 19.1**

- [ ] 21.3 Write property test for translation relationships
  - **Property 72: Translation relationships**
  - **Validates: Requirements 19.2**

- [ ] 21.4 Write property test for language detection
  - **Property 73: Language detection**
  - **Validates: Requirements 19.3**

- [ ] 21.5 Implement translation status tracking
  - Track completion status per language
  - Show translation progress
  - _Requirements: 19.4_

- [ ] 21.6 Write property test for translation status tracking
  - **Property 74: Translation status tracking**
  - **Validates: Requirements 19.4**

- [ ] 21.7 Add hreflang tag generation
  - Generate hreflang tags for all translations
  - Include in HTML head
  - _Requirements: 19.5_

- [ ] 21.8 Write property test for hreflang tag generation
  - **Property 75: Hreflang tag generation**
  - **Validates: Requirements 19.5**

- [ ] 22. Implement security and compliance features
- [ ] 22.1 Create SecurityService
  - Implement access logging for all operations
  - Add suspicious activity detection
  - Create admin alert system
  - _Requirements: 20.3, 20.4_

- [ ] 22.2 Write property test for access logging
  - **Property 76: Access logging**
  - **Validates: Requirements 20.3**

- [ ] 22.3 Write property test for suspicious activity detection
  - **Property 77: Suspicious activity detection**
  - **Validates: Requirements 20.4**

- [ ] 22.4 Implement privacy compliance features
  - Add data export functionality
  - Implement data deletion
  - Create consent management
  - _Requirements: 20.5_

- [ ] 22.5 Write property test for privacy compliance
  - **Property 78: Privacy compliance**
  - **Validates: Requirements 20.5**

- [ ] 22.6 Add security headers and HTTPS enforcement
  - Verify security headers in vercel.json
  - Ensure HTTPS for all communications
  - _Requirements: 20.1, 20.2_

- [ ] 23. Implement component library system
- [ ] 23.1 Create ComponentLibraryService
  - Implement reusable component creation
  - Add component reference management
  - Create component update propagation
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 23.2 Write property test for component persistence
  - **Property 35: Component persistence**
  - **Validates: Requirements 10.1**

- [ ] 23.3 Write property test for component reference integrity
  - **Property 36: Component reference integrity**
  - **Validates: Requirements 10.2**

- [ ] 23.4 Write property test for component update propagation
  - **Property 37: Component update propagation**
  - **Validates: Requirements 10.3**

- [ ] 23.5 Create component library UI
  - Build component browser
  - Add component insertion interface
  - Show component usage across posts
  - _Requirements: 10.4_

- [ ] 23.6 Write property test for component resolution
  - **Property 38: Component resolution**
  - **Validates: Requirements 10.5**

- [ ] 24. Create admin dashboard
- [ ] 24.1 Build main admin dashboard
  - Create dashboard layout with navigation
  - Add overview statistics
  - Show recent activity
  - _Requirements: 2.1, 9.3_

- [ ] 24.2 Create post management interface
  - Build post list with filters and search
  - Add bulk actions (publish, delete, etc.)
  - Show post status indicators
  - _Requirements: 2.1, 3.5_

- [ ] 24.3 Create user management for blog roles
  - Show users with blog permissions
  - Add role assignment interface
  - Display user activity
  - _Requirements: 11.1_

- [ ] 24.4 Create settings page
  - Add blog configuration options
  - Configure social media integrations
  - Set up email templates
  - _Requirements: 14.2, 13.4_

- [ ] 25. Final checkpoint - Integration testing and deployment
- [ ] 25.1 Run comprehensive integration tests
  - Test complete editorial workflow
  - Test publishing and scheduling
  - Test reader-facing pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25.2 Performance optimization
  - Optimize database queries with proper indexes
  - Implement query result caching
  - Add image lazy loading
  - Test page load times

- [ ] 25.3 Security audit
  - Review all API endpoints for proper authentication
  - Verify RBAC implementation
  - Test input validation and sanitization
  - Check for SQL injection vulnerabilities

- [ ] 25.4 Accessibility compliance
  - Verify WCAG 2.1 AA compliance
  - Test with screen readers
  - Ensure keyboard navigation
  - Add proper ARIA labels

- [ ] 25.5 Deploy to staging environment
  - Deploy to Vercel staging
  - Run smoke tests
  - Verify environment variables
  - Test with production-like data

- [ ] 25.6 Production deployment
  - Deploy to Vercel production
  - Monitor error rates and performance
  - Verify all integrations working
  - Document deployment process
