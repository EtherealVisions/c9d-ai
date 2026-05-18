# Implementation Plan

## Current State Analysis

**Existing Infrastructure:**
- ✅ Database schema: `users.preferences` JSONB column exists and is indexed
- ✅ Database schema: `organizations.settings` JSONB column exists
- ✅ Basic theme provider: `components/theme-provider.tsx` using next-themes
- ✅ User preferences validation: `lib/validation/schemas/users.ts` with basic theme/language support
- ✅ API routes: `/api/users/preferences` (GET/PUT/DELETE) and `/api/users/profile/preferences` (PATCH)
- ✅ User service: `lib/services/user-service.ts` with getUserPreferences/updateUserPreferences methods

**Implementation Approach:**
- **No database migrations needed** - Using existing JSONB columns
- **Replace next-themes** - Build custom ThemeProvider with advanced features
- **Extend existing services** - Enhance UserService rather than duplicate
- **Update validation schemas** - Add new theme IDs and locale formats
- **Real testing only** - Integration tests use real Supabase, E2E uses real Clerk auth
- **Vercel KV caching** - Use Vercel's Redis for theme/translation caching

## Tasks

- [ ] 1. Set up core infrastructure and validation schemas
  - Install fast-check library for property-based testing: `pnpm add -D fast-check`
  - Update existing Zod validation schemas at lib/validation/schemas/users.ts to support new theme IDs
  - Create type definitions for UserThemePreferences and OrganizationThemeDefaults at lib/models/types.ts
  - Set up Vercel KV (Redis) caching infrastructure at lib/cache/vercel-kv.ts
  - Create validation schemas for theme customizations at lib/validation/schemas/theme.ts
  - Create validation schemas for locales at lib/validation/schemas/locale.ts
  - _Requirements: 1.4, 2.4, 6.1_
  - _Note: No database migrations needed - using existing users.preferences and organizations.settings JSONB columns_

- [ ] 1.1 Write property test for preference persistence
  - **Property 4: Theme persistence round-trip**
  - **Validates: Requirements 1.4**

- [ ] 1.2 Write property test for language persistence
  - **Property 18: Language persistence round-trip**
  - **Validates: Requirements 2.4**

- [ ] 2. Implement theme engine and core theme system
  - Create ThemeEngine class at lib/theme/engine.ts with theme loading, validation, and application logic
  - Implement theme caching with memory and Vercel KV layers at lib/theme/cache.ts
  - Create base theme structure with CSS custom properties at styles/themes/base.css
  - Implement cursor-light and cursor-dark themes at lib/theme/themes/
  - Add additional theme variants (ocean-breeze, forest-green, sunset-orange, midnight-blue, rose-gold, monochrome)
  - Create theme validator at lib/theme/validator.ts using Zod schemas
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.4_
  - _Note: Replace existing next-themes implementation in components/theme-provider.tsx_

- [ ] 2.1 Write property test for theme validation
  - **Property 6: Theme validation correctness**
  - **Validates: Requirements 3.1**

- [ ] 2.2 Write property test for theme registration
  - **Property 7: Theme registration availability**
  - **Validates: Requirements 3.2**

- [ ] 2.3 Write property test for theme composition
  - **Property 8: Theme composition correctness**
  - **Validates: Requirements 3.4**

- [ ] 2.4 Write property test for immediate theme application
  - **Property 2: Immediate theme application**
  - **Validates: Requirements 1.2**

- [ ] 2.5 Write property test for color palette propagation
  - **Property 3: Color palette propagation**
  - **Validates: Requirements 1.3**



- [ ] 3. Implement ThemeProvider and React integration
  - Replace existing ThemeProvider in components/theme-provider.tsx with custom implementation
  - Create ThemeProvider component with React context at lib/theme/provider.tsx
  - Implement useTheme hook at lib/theme/hooks.ts for accessing theme state
  - Add theme loading from user preferences (users.preferences JSONB) and local storage
  - Implement theme persistence using existing user-service.ts methods
  - Add error handling and fallback to default theme
  - Implement smooth CSS transitions for theme changes
  - _Requirements: 1.2, 1.4, 1.5, 8.1_
  - _Note: Integrate with existing UserService.updateUserPreferences method_

- [ ] 3.1 Write property test for theme restoration
  - **Property 5: Theme restoration on app restart**
  - **Validates: Requirements 1.5**

- [ ] 3.2 Write property test for theme transition smoothness
  - **Property 11: Theme transition smoothness**
  - **Validates: Requirements 8.1**

- [ ] 3.3 Write unit tests for ThemeProvider
  - Test context initialization and state management
  - Test error handling and fallback behavior
  - Test theme loading from different sources
  - _Requirements: 1.2, 1.4, 1.5_

- [ ] 4. Implement i18n engine and translation system
  - Create I18nEngine class with translation loading and caching
  - Implement translation file organization by locale and namespace
  - Add translation caching with memory and Redis layers
  - Implement parameterized translation with proper escaping
  - Add pluralization support with locale-specific rules
  - Implement missing translation fallback and logging
  - _Requirements: 2.2, 4.1, 4.3, 4.4, 4.5_

- [ ] 4.1 Write property test for translation application
  - **Property 16: Translation application completeness**
  - **Validates: Requirements 2.2**

- [ ] 4.2 Write property test for missing translation fallback
  - **Property 21: Missing translation fallback**
  - **Validates: Requirements 4.3**

- [ ] 4.3 Write property test for parameterized translations
  - **Property 22: Parameterized translation correctness**
  - **Validates: Requirements 4.4**

- [ ] 4.4 Write property test for pluralization
  - **Property 23: Pluralization rule correctness**
  - **Validates: Requirements 4.5**

- [ ] 4.5 Write property test for translation caching
  - **Property 28: Translation caching efficiency**
  - **Validates: Requirements 7.5**

- [ ] 5. Implement LanguageProvider and React integration
  - Create LanguageProvider component with React context
  - Implement useTranslation hook for accessing translations
  - Add locale detection from user preferences, local storage, and browser
  - Implement language persistence to database and local storage
  - Add error handling and fallback to default locale
  - Update HTML lang and dir attributes on locale change
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 5.1 Write property test for state preservation during language change
  - **Property 17: State preservation during language change**
  - **Validates: Requirements 2.3**

- [ ] 5.2 Write property test for language restoration
  - **Property 19: Language restoration on app restart**
  - **Validates: Requirements 2.5**

- [ ] 5.3 Write unit tests for LanguageProvider
  - Test context initialization and state management
  - Test locale detection and loading
  - Test translation function behavior
  - _Requirements: 2.2, 2.4, 2.5_



- [ ] 6. Implement RTL (Right-to-Left) language support
  - Add RTL direction detection based on locale
  - Implement automatic direction attribute updates
  - Create RTL-specific CSS with logical properties
  - Add layout mirroring for RTL languages
  - Test bidirectional text handling
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 6.1 Write property test for RTL direction application
  - **Property 24: RTL direction application**
  - **Validates: Requirements 5.1**

- [ ] 6.2 Write property test for RTL layout mirroring
  - **Property 25: RTL layout mirroring**
  - **Validates: Requirements 5.2**

- [ ] 6.3 Write property test for logical CSS property usage
  - **Property 26: Logical CSS property usage**
  - **Validates: Requirements 5.4**

- [ ] 7. Implement PreferencesService for user preference management
  - Create PreferencesService class at lib/services/preferences-service.ts
  - Integrate with existing UserService methods (getUserPreferences, updateUserPreferences)
  - Implement updateThemePreference method that updates users.preferences.theme
  - Implement updateLanguagePreference method that updates users.preferences.locale
  - Implement debounced database updates to reduce write operations
  - Add error handling and retry logic with exponential backoff
  - Add Vercel KV caching layer for frequently accessed preferences
  - _Requirements: 1.4, 2.4, 10.1, 10.2_
  - _Note: Extend existing user-service.ts rather than duplicating functionality_

- [ ] 7.1 Write property test for cross-session theme sync
  - **Property 34: Cross-session theme synchronization**
  - **Validates: Requirements 10.1**

- [ ] 7.2 Write property test for cross-session language sync
  - **Property 35: Cross-session language synchronization**
  - **Validates: Requirements 10.2**

- [ ] 7.3 Write unit tests for PreferencesService
  - Test CRUD operations
  - Test caching behavior
  - Test error handling
  - _Requirements: 1.4, 2.4_

- [ ] 8. Implement organization defaults functionality
  - Create organization-defaults repository at lib/repositories/organization-defaults-repository.ts
  - Implement getOrganizationDefaults method that reads organizations.settings.defaults
  - Add setOrganizationDefaults method that updates organizations.settings.defaults
  - Implement default application for new members in membership-service.ts
  - Add user override capability in preferences-service.ts
  - Implement preference reversion on membership removal in membership-service.ts
  - _Requirements: 6.1, 6.2, 6.4, 6.5_
  - _Note: Use existing organizations.settings JSONB column, no new tables needed_

- [ ] 8.1 Write property test for organization default inheritance
  - **Property 30: Organization default inheritance**
  - **Validates: Requirements 6.1**

- [ ] 8.2 Write property test for user preference override
  - **Property 31: User preference override capability**
  - **Validates: Requirements 6.2**

- [ ] 8.3 Write property test for default application on membership
  - **Property 32: Default application on membership**
  - **Validates: Requirements 6.4**

- [ ] 8.4 Write property test for preference reversion
  - **Property 33: Preference reversion on membership removal**
  - **Validates: Requirements 6.5**

- [ ] 9. Implement cross-session synchronization
  - Create SyncService with WebSocket integration
  - Implement real-time preference broadcasting
  - Add synchronization timing within 5 seconds
  - Implement conflict resolution using timestamps
  - Add offline queue for preference changes
  - Implement sync on connectivity restoration
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 9.1 Write property test for synchronization timing
  - **Property 36: Synchronization timing**
  - **Validates: Requirements 10.3**

- [ ] 9.2 Write property test for conflict resolution
  - **Property 37: Conflict resolution consistency**
  - **Validates: Requirements 10.4**

- [ ] 9.3 Write property test for offline queue and sync
  - **Property 38: Offline queue and sync**
  - **Validates: Requirements 10.5**



- [ ] 10. Create theme UI components
  - Implement ThemeSelector component with visual previews
  - Create ThemePreview component showing theme colors
  - Add ThemeCustomizer for component-level overrides
  - Implement smooth transitions and loading indicators
  - Add keyboard navigation and ARIA attributes
  - Ensure WCAG AA contrast ratios
  - _Requirements: 1.1, 8.3, 11.1, 11.2_

- [ ] 10.1 Write property test for theme display completeness
  - **Property 1: Theme display completeness**
  - **Validates: Requirements 1.1**

- [ ] 10.2 Write property test for loading indicator timing
  - **Property 12: Loading indicator timing**
  - **Validates: Requirements 8.3**

- [ ] 10.3 Write property test for component override application
  - **Property 39: Component override application**
  - **Validates: Requirements 11.1**

- [ ] 10.4 Write property test for override merge correctness
  - **Property 40: Override merge correctness**
  - **Validates: Requirements 11.2**

- [ ] 10.5 Write property test for contrast ratio maintenance
  - **Property 14: Contrast ratio maintenance**
  - **Validates: Requirements 8.5**

- [ ] 10.6 Write property test for override accessibility compliance
  - **Property 41: Override accessibility compliance**
  - **Validates: Requirements 11.4**

- [ ] 10.7 Write unit tests for theme UI components
  - Test ThemeSelector rendering and interaction
  - Test ThemePreview display
  - Test ThemeCustomizer functionality
  - _Requirements: 1.1, 11.1, 11.2_

- [ ] 11. Create language UI components
  - Implement LanguageSelector with native language names
  - Create TranslationPreview for content preview
  - Add missing translation indicators
  - Implement keyboard navigation and ARIA attributes
  - Add screen reader announcements for language changes
  - _Requirements: 2.1, 12.4_

- [ ] 11.1 Write property test for language display completeness
  - **Property 15: Language display completeness**
  - **Validates: Requirements 2.1**

- [ ] 11.2 Write property test for preview translation validation
  - **Property 44: Preview translation validation**
  - **Validates: Requirements 12.4**

- [ ] 11.3 Write unit tests for language UI components
  - Test LanguageSelector rendering and interaction
  - Test TranslationPreview display
  - Test missing translation indicators
  - _Requirements: 2.1, 12.4_

- [ ] 12. Implement preview mode functionality
  - Create PreviewMode component for theme and language testing
  - Implement preview theme switching without persistence
  - Add preview language switching without persistence
  - Display both light and dark theme variants
  - Highlight missing translations in preview
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 12.1 Write property test for preview theme switching
  - **Property 42: Preview theme switching**
  - **Validates: Requirements 12.1, 12.3**

- [ ] 12.2 Write property test for preview language switching
  - **Property 43: Preview language switching**
  - **Validates: Requirements 12.2, 12.3**

- [ ] 12.3 Write property test for preview theme variant display
  - **Property 45: Preview theme variant display**
  - **Validates: Requirements 12.5**



- [ ] 13. Enhance existing API routes for theme and language preferences
  - Update existing /api/users/preferences routes to support new theme IDs and locales
  - Update existing /api/users/profile/preferences PATCH endpoint for theme/language
  - Add POST /api/preferences/sync for cross-session synchronization
  - Implement rate limiting for preference updates using @upstash/ratelimit
  - Update input validation with new Zod schemas
  - _Requirements: 1.4, 2.4, 10.1, 10.2_
  - _Note: Existing routes at /api/users/preferences already handle GET/PUT/DELETE_

- [ ] 13.1 Write integration tests for enhanced preferences API
  - Test existing endpoints with new theme IDs and locales
  - Test PATCH endpoint with theme/language validation
  - Test sync endpoint functionality
  - Test rate limiting behavior
  - _Requirements: 1.4, 2.4_

- [ ] 14. Implement performance optimizations
  - Add theme lazy loading with dynamic imports
  - Implement translation lazy loading by namespace
  - Set up code splitting for theme and i18n modules
  - Optimize CSS custom property updates
  - Add bundle size monitoring
  - _Requirements: 7.3, 7.4_

- [ ] 14.1 Write property test for theme transition performance
  - **Property 9: Theme transition performance**
  - **Validates: Requirements 7.1**

- [ ] 14.2 Write property test for language change performance
  - **Property 27: Language change performance**
  - **Validates: Requirements 7.2**

- [ ] 14.3 Write property test for CSS custom property usage
  - **Property 10: CSS custom property usage**
  - **Validates: Requirements 7.4**

- [ ] 14.4 Write property test for dark mode comprehensiveness
  - **Property 13: Dark mode comprehensiveness**
  - **Validates: Requirements 8.4**

- [ ] 15. Add translation content for supported locales
  - Create translation files for en-US (English)
  - Add translation files for fr-FR (French)
  - Add translation files for es-ES (Spanish)
  - Add translation files for de-DE (German)
  - Add translation files for ja-JP (Japanese)
  - Add translation files for ar-SA (Arabic) with RTL support
  - Organize translations by namespace (common, dashboard, settings, etc.)
  - _Requirements: 2.1, 4.1, 5.1_

- [ ] 15.1 Write property test for translation completeness
  - **Property 29: Translation completeness validation**
  - **Validates: Requirements 9.5**

- [ ] 15.2 Write property test for translation file organization
  - **Property 20: Translation file organization**
  - **Validates: Requirements 4.1**

- [ ] 16. Implement accessibility features
  - Add WCAG AA contrast ratio validation for all themes
  - Implement keyboard navigation for all theme and language controls
  - Add ARIA labels and roles to all interactive elements
  - Implement screen reader announcements for theme and language changes
  - Add focus management for theme and language changes
  - Test with screen readers (NVDA, JAWS, VoiceOver)
  - _Requirements: 8.5, 11.4_

- [ ] 16.1 Write accessibility tests
  - Test keyboard navigation
  - Test ARIA attributes
  - Test screen reader announcements
  - Test focus management
  - _Requirements: 8.5, 11.4_



- [ ] 17. Implement security measures
  - Add input validation for all theme and locale inputs
  - Implement XSS prevention for translation content
  - Add rate limiting for preference update endpoints
  - Implement authorization checks for preference access
  - Add encryption for sensitive customization data
  - Implement CSRF protection for API routes
  - _Requirements: 1.4, 2.4_

- [ ] 17.1 Write security tests
  - Test input validation
  - Test XSS prevention
  - Test rate limiting
  - Test authorization
  - _Requirements: 1.4, 2.4_

- [ ] 18. Create comprehensive integration tests with real Supabase
  - Create test data manager at __tests__/setup/test-data-manager.ts for lifecycle management
  - Create Supabase test client utilities at __tests__/setup/supabase-test-client.ts
  - Test theme persistence and restoration flow with real database
  - Test language switching and persistence flow with real database
  - Test cross-session synchronization with real database
  - Test organization defaults application with real database
  - Test preview mode functionality
  - Test RTL language support
  - _Requirements: 1.4, 1.5, 2.4, 2.5, 5.1, 6.1, 10.1, 10.2, 12.1, 12.2_
  - _Note: MUST use real Supabase, never mocks. Follow Phase.dev testing standards._

- [ ] 18.1 Write integration test for theme persistence flow (Real Supabase)
  - Test complete theme selection, persistence to users.preferences, and restoration
  - Use TestDataManager for unique test user creation and cleanup
  - _Requirements: 1.4, 1.5_

- [ ] 18.2 Write integration test for language switching flow (Real Supabase)
  - Test complete language selection, persistence to users.preferences, and restoration
  - Use TestDataManager for unique test user creation and cleanup
  - _Requirements: 2.4, 2.5_

- [ ] 18.3 Write integration test for cross-session sync (Real Supabase)
  - Test preference synchronization across multiple sessions using real database
  - Verify WebSocket-based sync with real connections
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 18.4 Write integration test for organization defaults (Real Supabase)
  - Test default application from organizations.settings and user overrides
  - Use TestDataManager for unique test organization and user creation
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ] 19. Create E2E tests for user journeys with Clerk authentication
  - Create E2E auth helpers at __tests__/e2e/setup/auth-helpers.ts following Clerk patterns
  - Test complete theme customization user journey with real authentication
  - Test complete language switching user journey with real authentication
  - Test preview mode user journey
  - Test organization admin setting defaults journey
  - Test cross-device synchronization journey
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.4, 6.1, 10.1, 12.1, 12.2_
  - _Note: MUST follow official Clerk E2E authentication patterns_

- [ ] 19.1 Write E2E test for theme customization journey (Clerk Auth)
  - Test user sign-up, theme selection, and persistence across sessions
  - Use unique test users with timestamp + random for parallel execution
  - Clean up test users via API in afterAll hook
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 19.2 Write E2E test for language switching journey (Clerk Auth)
  - Test user sign-up, language selection, and persistence across sessions
  - Use unique test users with timestamp + random for parallel execution
  - Clean up test users via API in afterAll hook
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 19.3 Write E2E test for preview mode journey (Clerk Auth)
  - Test user previewing themes and languages without persistence
  - Verify preview mode doesn't affect saved preferences
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Implement monitoring and observability
  - Add metrics tracking for theme load time, switch time, and error rate
  - Add metrics tracking for translation load time and missing translation rate
  - Implement structured logging for theme and i18n events
  - Set up alerts for high error rates and slow performance
  - Create dashboards for monitoring theme and language usage
  - _Requirements: 7.1, 7.2_

- [ ] 21.1 Write tests for monitoring infrastructure
  - Test metrics collection
  - Test logging functionality
  - Test alert triggers
  - _Requirements: 7.1, 7.2_

- [ ] 22. Create documentation
  - Write developer documentation for theme system at docs/theming-system.md
  - Create developer documentation for i18n system at docs/i18n-system.md
  - Document theme creation process with examples
  - Document translation workflow and file organization
  - Create user guide for theme customization
  - Create user guide for language selection
  - Document API endpoints with OpenAPI/Swagger annotations
  - Document integration with existing UserService and preferences structure
  - _Requirements: All_

- [ ] 23. Implement data migration for existing users
  - Create migration script at scripts/migrate-theme-preferences.ts
  - Map old theme values ('light', 'dark', 'system') to new theme IDs
  - Map old language format ('en', 'fr') to new locale codes ('en-US', 'fr-FR')
  - Update users.preferences JSONB structure in-place (no schema changes)
  - Test migration with sample data from existing database
  - Plan rollback strategy for reverting preferences
  - _Requirements: 1.4, 1.5, 2.4, 2.5_
  - _Note: Migration updates existing JSONB data, no table structure changes_

- [ ] 23.1 Write tests for data migration
  - Test migration script with various existing preference formats
  - Test rollback functionality to restore original preferences
  - Test idempotent migration (running twice produces same result)
  - _Requirements: 1.4, 2.4_

- [ ] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
