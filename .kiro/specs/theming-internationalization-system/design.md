# Design Document

## Overview

This design document outlines the architecture for a comprehensive theming and internationalization (i18n) system for the C9D AI platform. The system provides users with visual customization through predefined themes and color palettes, while supporting multiple languages for global accessibility. The design follows modern React patterns with TypeScript, leveraging Next.js 15+ capabilities, and integrates seamlessly with the existing Clerk authentication and Supabase database infrastructure.

The theming system is inspired by Cursor's approach, offering curated themes with coordinated color palettes that ensure visual consistency and accessibility. The i18n framework provides robust translation management with type safety, RTL support, and efficient content delivery.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │    Pages     │  │  API Routes  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼───────────────┐
│         │    Context Layer│                  │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │    Theme     │  │   Language   │  │  Preferences │      │
│  │   Provider   │  │   Provider   │  │   Service    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼───────────────┐
│         │    Core Layer   │                  │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │    Theme     │  │     i18n     │  │   Storage    │      │
│  │    Engine    │  │    Engine    │  │   Manager    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
┌─────────┼─────────────────┼──────────────────┼───────────────┐
│         │  Persistence    │                  │               │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │   Supabase   │  │    Redis     │  │    Local     │      │
│  │   Database   │  │    Cache     │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

The system follows a layered architecture with clear separation of concerns:

1. **Application Layer**: React components, pages, and API routes that consume theme and i18n services
2. **Context Layer**: React contexts that provide theme and language state to the component tree
3. **Core Layer**: Business logic for theme management, translation, and preference handling
4. **Persistence Layer**: Storage mechanisms for user preferences and cached data



## Components and Interfaces

### Theme System Components

#### ThemeProvider

The ThemeProvider is a React context provider that manages theme state and provides theme utilities to all child components.

```typescript
interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeId
  storageKey?: string
  enableTransitions?: boolean
}

interface ThemeContextValue {
  theme: Theme
  themeId: ThemeId
  setTheme: (themeId: ThemeId) => Promise<void>
  themes: Record<ThemeId, Theme>
  isLoading: boolean
  error: Error | null
}
```

#### Theme Engine

The Theme Engine handles theme loading, validation, and application.

```typescript
interface ThemeEngine {
  loadTheme(themeId: ThemeId): Promise<Theme>
  validateTheme(theme: Theme): ValidationResult
  applyTheme(theme: Theme): void
  getThemeById(themeId: ThemeId): Theme | null
  registerTheme(theme: Theme): void
  unregisterTheme(themeId: ThemeId): void
}
```

#### Theme Configuration

```typescript
interface Theme {
  id: ThemeId
  name: string
  displayName: string
  description: string
  palette: ColorPalette
  typography: Typography
  spacing: Spacing
  shadows: Shadows
  borderRadius: BorderRadius
  transitions: Transitions
  mode: 'light' | 'dark'
  metadata: ThemeMetadata
}

interface ColorPalette {
  primary: ColorScale
  secondary: ColorScale
  accent: ColorScale
  neutral: ColorScale
  success: ColorScale
  warning: ColorScale
  error: ColorScale
  info: ColorScale
  background: BackgroundColors
  text: TextColors
  border: BorderColors
}

interface ColorScale {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string  // Base color
  600: string
  700: string
  800: string
  900: string
  950: string
}
```



### Internationalization (i18n) Components

#### LanguageProvider

The LanguageProvider manages language state and provides translation utilities.

```typescript
interface LanguageProviderProps {
  children: React.ReactNode
  defaultLocale?: Locale
  supportedLocales: Locale[]
  fallbackLocale: Locale
  storageKey?: string
}

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => Promise<void>
  t: TranslationFunction
  supportedLocales: Locale[]
  isLoading: boolean
  error: Error | null
  direction: 'ltr' | 'rtl'
}

type TranslationFunction = (
  key: string,
  params?: Record<string, string | number>,
  options?: TranslationOptions
) => string
```

#### i18n Engine

The i18n Engine handles translation loading, caching, and retrieval.

```typescript
interface I18nEngine {
  loadTranslations(locale: Locale, namespace?: string): Promise<Translations>
  getTranslation(key: string, locale: Locale, params?: Record<string, any>): string
  hasTranslation(key: string, locale: Locale): boolean
  registerTranslations(locale: Locale, namespace: string, translations: Translations): void
  clearCache(locale?: Locale): void
  preloadLocale(locale: Locale): Promise<void>
}

interface Translations {
  [key: string]: string | Translations
}

interface TranslationOptions {
  count?: number
  context?: string
  defaultValue?: string
  fallback?: string
}
```

#### Locale Configuration

```typescript
interface Locale {
  code: string          // e.g., 'en-US', 'fr-FR'
  name: string          // e.g., 'English (United States)'
  nativeName: string    // e.g., 'English (United States)'
  direction: 'ltr' | 'rtl'
  dateFormat: string
  timeFormat: string
  numberFormat: Intl.NumberFormatOptions
  currencyFormat: Intl.NumberFormatOptions
  pluralRules: PluralRules
}

interface PluralRules {
  zero?: string
  one: string
  two?: string
  few?: string
  many?: string
  other: string
}
```



### Preference Management Components

#### PreferencesService

The PreferencesService manages user preferences for themes and languages.

```typescript
interface PreferencesService {
  getUserPreferences(userId: string): Promise<UserPreferences>
  updateThemePreference(userId: string, themeId: ThemeId): Promise<void>
  updateLanguagePreference(userId: string, locale: Locale): Promise<void>
  getOrganizationDefaults(orgId: string): Promise<OrganizationDefaults>
  setOrganizationDefaults(orgId: string, defaults: OrganizationDefaults): Promise<void>
  syncPreferences(userId: string): Promise<void>
}

interface UserPreferences {
  userId: string
  themeId: ThemeId
  locale: string
  customizations?: ThemeCustomizations
  syncEnabled: boolean
  lastSyncedAt: Date
  createdAt: Date
  updatedAt: Date
}

interface OrganizationDefaults {
  organizationId: string
  defaultThemeId: ThemeId
  defaultLocale: string
  allowUserOverrides: boolean
  enforceTheme: boolean
  enforceLanguage: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### StorageManager

The StorageManager handles persistence across multiple storage mechanisms.

```typescript
interface StorageManager {
  saveToLocal(key: string, value: any): void
  loadFromLocal(key: string): any | null
  saveToDatabase(userId: string, preferences: UserPreferences): Promise<void>
  loadFromDatabase(userId: string): Promise<UserPreferences | null>
  saveToCache(key: string, value: any, ttl?: number): Promise<void>
  loadFromCache(key: string): Promise<any | null>
  clearAll(userId: string): Promise<void>
}
```



## Data Models

### Database Schema

**Design Decision**: Store theme and language preferences in the existing `users.preferences` JSONB column rather than creating separate tables. This aligns with the existing schema and reduces database complexity.

**Rationale**:
- The existing `users` table already has a `preferences` JSONB column designed for user settings
- Reduces database joins and improves query performance
- Maintains consistency with existing preference storage patterns
- Simplifies migrations and reduces schema complexity
- JSONB provides flexibility for future preference additions

#### User Preferences Structure (within users.preferences)

```typescript
// Structure stored in users.preferences JSONB column
interface UserPreferences {
  theme: {
    id: ThemeId
    customizations?: Record<string, any>
    lastUpdated: string // ISO timestamp
  }
  locale: {
    code: string // e.g., 'en-US'
    lastUpdated: string // ISO timestamp
  }
  sync: {
    enabled: boolean
    lastSyncedAt?: string // ISO timestamp
  }
}
```

#### Organization Defaults Structure (within organizations.settings)

```typescript
// Structure stored in organizations.settings JSONB column
interface OrganizationSettings {
  defaults: {
    theme: {
      id: ThemeId
      enforced: boolean
    }
    locale: {
      code: string
      enforced: boolean
    }
    allowUserOverrides: boolean
  }
  // ... other organization settings
}
```

**Migration Note**: No new tables required. Existing `users.preferences` and `organizations.settings` JSONB columns will be used.

### Drizzle Schema Extensions

**Design Decision**: Extend existing schemas rather than creating new tables.

```typescript
// lib/db/schema/users.ts - Already exists, no changes needed
// The existing users.preferences JSONB column will store theme/locale preferences

// lib/db/schema/organizations.ts - Already exists, no changes needed
// The existing organizations.settings JSONB column will store default preferences

// Type definitions for preference structures
export interface UserThemePreferences {
  theme: {
    id: ThemeId
    customizations?: Record<string, any>
    lastUpdated: string
  }
  locale: {
    code: string
    lastUpdated: string
  }
  sync: {
    enabled: boolean
    lastSyncedAt?: string
  }
}

export interface OrganizationThemeDefaults {
  defaults: {
    theme: {
      id: ThemeId
      enforced: boolean
    }
    locale: {
      code: string
      enforced: boolean
    }
    allowUserOverrides: boolean
  }
}
```

**Integration with Existing Schema**:
- Uses existing `users.preferences` JSONB column (already indexed)
- Uses existing `organizations.settings` JSONB column (already indexed)
- No database migrations required
- Maintains backward compatibility with existing preferences



### Zod Validation Schemas

```typescript
import { z } from 'zod'

export const ThemeIdSchema = z.enum([
  'cursor-light',
  'cursor-dark',
  'ocean-breeze',
  'forest-green',
  'sunset-orange',
  'midnight-blue',
  'rose-gold',
  'monochrome',
])

export const LocaleSchema = z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Invalid locale format')

export const UserPreferencesSchema = z.object({
  userId: z.string().min(1),
  themeId: ThemeIdSchema,
  locale: LocaleSchema,
  customizations: z.record(z.any()).optional(),
  syncEnabled: z.boolean().default(true),
  lastSyncedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const OrganizationDefaultsSchema = z.object({
  organizationId: z.string().uuid(),
  defaultThemeId: ThemeIdSchema,
  defaultLocale: LocaleSchema,
  allowUserOverrides: z.boolean().default(true),
  enforceTheme: z.boolean().default(false),
  enforceLanguage: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ThemeCustomizationSchema = z.object({
  colors: z.record(z.string()).optional(),
  typography: z.object({
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
  }).optional(),
  spacing: z.record(z.number()).optional(),
})
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Theme System Properties

**Property 1: Theme display completeness**
*For any* set of registered themes, the theme settings UI should display all themes with their visual previews
**Validates: Requirements 1.1**

**Property 2: Immediate theme application**
*For any* theme selection, applying the theme should update CSS custom properties and trigger component re-renders without page navigation
**Validates: Requirements 1.2**

**Property 3: Color palette propagation**
*For any* color palette change, all color-dependent UI elements should reflect the new palette colors
**Validates: Requirements 1.3**

**Property 4: Theme persistence round-trip**
*For any* theme preference, saving it should result in the same theme being retrievable from both database and local storage
**Validates: Requirements 1.4**

**Property 5: Theme restoration on app restart**
*For any* saved theme preference, restarting the application should automatically load and apply that theme
**Validates: Requirements 1.5**

**Property 6: Theme validation correctness**
*For any* theme configuration, validation should correctly identify valid themes and reject invalid ones according to the schema
**Validates: Requirements 3.1**

**Property 7: Theme registration availability**
*For any* registered theme, it should be accessible to all components through the theme provider
**Validates: Requirements 3.2**

**Property 8: Theme composition correctness**
*For any* base theme and extension, the composed theme should properly merge all properties with extensions taking precedence
**Validates: Requirements 3.4**

**Property 9: Theme transition performance**
*For any* theme change, the transition should complete within 300 milliseconds
**Validates: Requirements 7.1**

**Property 10: CSS custom property usage**
*For any* theme application, the system should use CSS custom properties for style updates
**Validates: Requirements 7.4**

**Property 11: Theme transition smoothness**
*For any* theme application, CSS transition properties should be set for smooth color changes
**Validates: Requirements 8.1**

**Property 12: Loading indicator timing**
*For any* theme load operation exceeding 100 milliseconds, a loading indicator should be displayed
**Validates: Requirements 8.3**

**Property 13: Dark mode comprehensiveness**
*For any* component type, applying dark mode should update all components including images and media
**Validates: Requirements 8.4**

**Property 14: Contrast ratio maintenance**
*For any* theme transition, all text-background combinations should maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
**Validates: Requirements 8.5**



### Internationalization Properties

**Property 15: Language display completeness**
*For any* set of supported locales, the language settings should display all locales with their native names
**Validates: Requirements 2.1**

**Property 16: Translation application completeness**
*For any* language selection, all translation keys should resolve to the selected locale
**Validates: Requirements 2.2**

**Property 17: State preservation during language change**
*For any* application state, changing the language should not modify any state values
**Validates: Requirements 2.3**

**Property 18: Language persistence round-trip**
*For any* language preference, saving it should result in the same locale being retrievable from both database and local storage
**Validates: Requirements 2.4**

**Property 19: Language restoration on app restart**
*For any* saved language preference, restarting the application should automatically load and apply that locale
**Validates: Requirements 2.5**

**Property 20: Translation file organization**
*For any* translation addition, it should be organized by locale and namespace in the file system
**Validates: Requirements 4.1**

**Property 21: Missing translation fallback**
*For any* non-existent translation key, the system should return the key itself and log a warning in development mode
**Validates: Requirements 4.3**

**Property 22: Parameterized translation correctness**
*For any* translation with parameters, the system should correctly substitute parameter values and escape special characters
**Validates: Requirements 4.4**

**Property 23: Pluralization rule correctness**
*For any* count value and locale, the system should select the correct plural form according to that locale's pluralization rules
**Validates: Requirements 4.5**

**Property 24: RTL direction application**
*For any* RTL locale selection, the system should set direction attributes and CSS to 'rtl' for all components
**Validates: Requirements 5.1**

**Property 25: RTL layout mirroring**
*For any* RTL language, layout properties should be mirrored appropriately (e.g., flex-direction, text-align)
**Validates: Requirements 5.2**

**Property 26: Logical CSS property usage**
*For any* directional styling, the system should use logical CSS properties (inline-start, inline-end) instead of physical ones (left, right)
**Validates: Requirements 5.4**

**Property 27: Language change performance**
*For any* language change, all visible text should update within 500 milliseconds
**Validates: Requirements 7.2**

**Property 28: Translation caching efficiency**
*For any* translation key, repeated lookups should use cached values without re-fetching
**Validates: Requirements 7.5**

**Property 29: Translation completeness validation**
*For any* required translation key, it should exist in all supported locales
**Validates: Requirements 9.5**



### Organization and Preference Properties

**Property 30: Organization default inheritance**
*For any* new organization member, they should receive the organization's default theme and language preferences
**Validates: Requirements 6.1**

**Property 31: User preference override capability**
*For any* user with organization defaults, setting personal preferences should override the organization defaults
**Validates: Requirements 6.2**

**Property 32: Default application on membership**
*For any* user joining an organization, the organization's default theme and language should be applied
**Validates: Requirements 6.4**

**Property 33: Preference reversion on membership removal**
*For any* user leaving an organization, their preferences should revert to personal or global defaults
**Validates: Requirements 6.5**

**Property 34: Cross-session theme synchronization**
*For any* theme change in one session, all other active sessions for that user should receive the update
**Validates: Requirements 10.1**

**Property 35: Cross-session language synchronization**
*For any* language change in one session, all other active sessions for that user should receive the update
**Validates: Requirements 10.2**

**Property 36: Synchronization timing**
*For any* preference change, all active sessions should reflect the change within 5 seconds
**Validates: Requirements 10.3**

**Property 37: Conflict resolution consistency**
*For any* conflicting preference changes, the system should always use the most recent change based on timestamp
**Validates: Requirements 10.4**

**Property 38: Offline queue and sync**
*For any* preference change while offline, it should be queued and synced when connectivity is restored
**Validates: Requirements 10.5**

### Component Customization Properties

**Property 39: Component override application**
*For any* component-specific theme override, the override should take effect for that component
**Validates: Requirements 11.1**

**Property 40: Override merge correctness**
*For any* component override, it should be properly merged with the global theme with overrides taking precedence
**Validates: Requirements 11.2**

**Property 41: Override accessibility compliance**
*For any* component override, all text-background combinations should maintain WCAG AA contrast ratios
**Validates: Requirements 11.4**

### Preview Mode Properties

**Property 42: Preview theme switching**
*For any* theme in preview mode, it should be applied without persisting the preference
**Validates: Requirements 12.1, 12.3**

**Property 43: Preview language switching**
*For any* language in preview mode, it should be applied without persisting the preference
**Validates: Requirements 12.2, 12.3**

**Property 44: Preview translation validation**
*For any* missing translation in preview mode, it should be visually highlighted
**Validates: Requirements 12.4**

**Property 45: Preview theme variant display**
*For any* theme preview, both light and dark variants should be displayed simultaneously
**Validates: Requirements 12.5**



## Error Handling

### Theme System Error Handling

#### Theme Loading Errors

```typescript
class ThemeLoadError extends AppError {
  readonly statusCode = 500
  readonly isOperational = true
  
  constructor(themeId: string, cause?: Error) {
    super(`Failed to load theme: ${themeId}`, cause)
  }
}
```

**Handling Strategy:**
- Log error with theme ID and stack trace
- Fall back to default theme
- Display user-friendly error message
- Retry loading with exponential backoff
- Cache last successful theme as fallback

#### Theme Validation Errors

```typescript
class ThemeValidationError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true
  
  constructor(public validationErrors: ValidationError[], cause?: Error) {
    super('Theme validation failed', cause)
  }
}
```

**Handling Strategy:**
- Log detailed validation errors
- Reject invalid theme registration
- Provide clear error messages to developers
- Suggest corrections based on schema
- Prevent invalid themes from being applied

#### Theme Persistence Errors

```typescript
class ThemePersistenceError extends AppError {
  readonly statusCode = 500
  readonly isOperational = true
  
  constructor(operation: 'save' | 'load', cause?: Error) {
    super(`Failed to ${operation} theme preference`, cause)
  }
}
```

**Handling Strategy:**
- Retry with exponential backoff
- Fall back to local storage if database fails
- Queue changes for later sync if offline
- Notify user of sync status
- Log errors for monitoring

### i18n System Error Handling

#### Translation Loading Errors

```typescript
class TranslationLoadError extends AppError {
  readonly statusCode = 500
  readonly isOperational = true
  
  constructor(locale: string, namespace: string, cause?: Error) {
    super(`Failed to load translations for ${locale}/${namespace}`, cause)
  }
}
```

**Handling Strategy:**
- Fall back to default locale
- Use cached translations if available
- Display translation keys as fallback
- Log missing translations for review
- Retry loading with exponential backoff

#### Missing Translation Errors

```typescript
class MissingTranslationError extends AppError {
  readonly statusCode = 404
  readonly isOperational = true
  
  constructor(key: string, locale: string) {
    super(`Missing translation: ${key} for locale ${locale}`)
  }
}
```

**Handling Strategy:**
- Return translation key as fallback text
- Log warning in development mode
- Track missing translations for reporting
- Fall back to default locale if available
- Highlight missing translations in preview mode

#### Locale Validation Errors

```typescript
class LocaleValidationError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true
  
  constructor(locale: string, cause?: Error) {
    super(`Invalid locale: ${locale}`, cause)
  }
}
```

**Handling Strategy:**
- Reject invalid locale codes
- Suggest closest valid locale
- Fall back to default locale
- Log validation errors
- Provide clear error messages

### Synchronization Error Handling

#### Sync Conflict Errors

```typescript
class SyncConflictError extends AppError {
  readonly statusCode = 409
  readonly isOperational = true
  
  constructor(
    public localVersion: UserPreferences,
    public remoteVersion: UserPreferences
  ) {
    super('Preference sync conflict detected')
  }
}
```

**Handling Strategy:**
- Use timestamp-based conflict resolution
- Prefer most recent change
- Log conflicts for analysis
- Notify user of resolution
- Maintain conflict history

#### Network Errors

```typescript
class NetworkError extends AppError {
  readonly statusCode = 503
  readonly isOperational = true
  
  constructor(operation: string, cause?: Error) {
    super(`Network error during ${operation}`, cause)
  }
}
```

**Handling Strategy:**
- Queue operations for retry
- Use cached data when available
- Display offline indicator
- Retry with exponential backoff
- Sync when connectivity restored



## Testing Strategy

### Testing Philosophy

**CRITICAL REQUIREMENTS**:
1. **100% Test Pass Rate**: All tests must pass for tasks to be considered complete
2. **Real Service Integration**: Integration tests MUST use real Supabase, never mocks
3. **Test Data Lifecycle**: Tests manage their own data from creation to cleanup
4. **Idempotent Execution**: Tests support parallel execution without conflicts
5. **Clerk E2E Patterns**: E2E tests follow official Clerk authentication guidelines

### Dual Testing Approach

The theming and internationalization system requires both unit testing and property-based testing to ensure comprehensive coverage and correctness.

#### Unit Testing

Unit tests verify specific examples, edge cases, and error conditions:

- **Theme Provider Tests**: Verify context initialization, state updates, and error handling
- **i18n Engine Tests**: Test translation loading, caching, and fallback behavior
- **Storage Manager Tests**: Verify persistence to database, cache, and local storage
- **Validation Tests**: Test schema validation for themes and locales
- **Component Tests**: Verify theme and translation application in React components

**Unit Test Requirements**:
- Use official @clerk/testing utilities for Clerk mocks
- Never mock Phase.dev - use real API calls with PHASE_SERVICE_TOKEN
- Follow memory management standards with NODE_OPTIONS
- Maintain global mock stability (don't clear in beforeEach)

#### Property-Based Testing

Property-based tests verify universal properties across all inputs using **fast-check** library:

- **Theme Properties**: Test theme application, persistence, and synchronization with random themes
- **Translation Properties**: Test translation resolution, caching, and pluralization with random keys and locales
- **Performance Properties**: Verify timing requirements with various theme and language combinations
- **Accessibility Properties**: Test contrast ratios and WCAG compliance across all theme combinations
- **Synchronization Properties**: Test cross-session sync with random preference changes

### Integration Testing with Real Services

**MANDATORY**: Integration tests MUST use real Supabase connections, never mocks.

```typescript
// __tests__/integration/theme-preferences-real.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { loadFromPhase } from '@c9d/config'

describe('Theme Preferences Integration (Real Supabase)', () => {
  let supabase: any
  let testUserId: string
  let createdTestData: string[] = []

  beforeAll(async () => {
    // Load configuration from Phase.dev
    const result = await loadFromPhase(true)
    
    if (!result.success || !result.variables.NEXT_PUBLIC_SUPABASE_URL) {
      console.warn('⚠️  No Supabase configuration. Skipping integration tests.')
      supabase = null
      return
    }

    // Create real Supabase client
    supabase = createClient(
      result.variables.NEXT_PUBLIC_SUPABASE_URL,
      result.variables.SUPABASE_SERVICE_ROLE_KEY
    )
    
    console.log('🔗 Connected to real Supabase for integration testing')
  })

  afterAll(async () => {
    // CRITICAL: Clean up ALL test data
    if (supabase && createdTestData.length > 0) {
      console.log('🧹 Cleaning up test data...')
      
      for (const userId of createdTestData) {
        await supabase.from('users').delete().eq('id', userId)
      }
      
      createdTestData = []
    }
  })

  beforeEach(() => {
    // Skip if no database connection
    if (!supabase) return
  })

  it('should persist theme preferences to real database', async () => {
    if (!supabase) {
      console.log('⏭️  Skipping - no database configuration')
      return
    }

    // Create unique test user
    const testUser = {
      clerk_user_id: `test_theme_${Date.now()}_${Math.random()}`,
      email: `test_${Date.now()}@example.com`,
      preferences: {
        theme: {
          id: 'cursor-dark',
          lastUpdated: new Date().toISOString()
        }
      }
    }

    // Create user in real database
    const { data: user, error } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single()

    expect(error).toBeNull()
    expect(user).toBeDefined()
    
    // Track for cleanup
    createdTestData.push(user.id)

    // Verify preferences persisted
    const { data: retrieved } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single()

    expect(retrieved.preferences.theme.id).toBe('cursor-dark')
  })
})
```

**Integration Test Requirements**:
- Use real Supabase client, never mocks
- Load configuration from Phase.dev
- Create unique test data with timestamps and random IDs
- Track all created data for cleanup
- Clean up in afterAll hook
- Skip gracefully if no configuration available
- Support parallel execution with unique identifiers

### E2E Testing with Clerk Authentication

**MANDATORY**: E2E tests MUST follow Clerk's official authentication patterns.

```typescript
// __tests__/e2e/theme-switching-user-journey.e2e.test.ts
import { test, expect, Page } from '@playwright/test'
import { signInUser, signOutUser, createTestUser } from './setup/auth-helpers'

test.describe('Theme Switching User Journey', () => {
  let testUser: any
  let createdUsers: string[] = []

  test.beforeAll(async () => {
    // Create unique test user for this test suite
    testUser = {
      email: `theme_test_${Date.now()}@test.c9d.ai`,
      password: 'TestPassword123!',
      firstName: 'Theme',
      lastName: 'Tester'
    }
  })

  test.afterAll(async ({ request }) => {
    // CRITICAL: Clean up test users via API
    for (const email of createdUsers) {
      await request.delete(`/api/test/users/${email}`)
    }
  })

  test('should persist theme selection across sessions', async ({ page, context }) => {
    // Sign up new user
    await page.goto('/sign-up')
    await page.fill('[data-testid="email-input"]', testUser.email)
    await page.fill('[data-testid="password-input"]', testUser.password)
    await page.click('[data-testid="sign-up-button"]')
    
    // Track for cleanup
    createdUsers.push(testUser.email)

    // Wait for authentication
    await page.waitForURL('/dashboard', { timeout: 15000 })

    // Navigate to theme settings
    await page.goto('/settings/appearance')
    
    // Select dark theme
    await page.click('[data-testid="theme-cursor-dark"]')
    
    // Verify theme applied
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'cursor-dark')

    // Sign out
    await signOutUser(page)

    // Sign back in
    await signInUser(page, testUser)

    // Verify theme persisted
    await expect(html).toHaveAttribute('data-theme', 'cursor-dark')
  })
})
```

**E2E Test Requirements**:
- Use official Clerk authentication helpers
- Create unique test users with timestamps
- Track all created users for cleanup
- Clean up via API in afterAll
- Support idempotent execution
- Handle authentication state properly
- Use data-testid selectors for reliability

### Property-Based Testing Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Prevent memory leaks
        isolate: true
      }
    },
    testTimeout: 60000,
    hookTimeout: 30000,
  }
})
```

```bash
# Install dependencies
pnpm add -D fast-check @clerk/testing
```

### Test Organization

```
apps/web/__tests__/
├── unit/
│   ├── theme-provider.test.ts
│   ├── theme-engine.test.ts
│   ├── i18n-engine.test.ts
│   ├── preferences-service.test.ts
│   ├── storage-manager.test.ts
│   └── validation-schemas.test.ts
├── integration/                    # MUST use REAL Supabase
│   ├── theme-preferences-real.integration.test.ts
│   ├── language-switching-real.integration.test.ts
│   ├── cross-session-sync-real.integration.test.ts
│   └── organization-defaults-real.integration.test.ts
├── property/
│   ├── theme-properties.test.ts
│   ├── translation-properties.test.ts
│   ├── performance-properties.test.ts
│   ├── accessibility-properties.test.ts
│   └── synchronization-properties.test.ts
├── e2e/                           # MUST follow Clerk patterns
│   ├── theme-user-journey.e2e.test.ts
│   ├── language-user-journey.e2e.test.ts
│   └── preview-mode.e2e.test.ts
└── setup/                         # Test utilities
    ├── auth-helpers.ts            # Clerk E2E auth helpers (existing)
    ├── test-data-manager.ts       # Test data lifecycle management (NEW)
    ├── supabase-test-client.ts    # Real Supabase test utilities (NEW)
    └── clerk-testing-setup.ts     # Official Clerk testing setup (existing)
```

**Test Data Lifecycle Management** (NEW):
```typescript
// __tests__/setup/test-data-manager.ts
export class TestDataManager {
  private createdUsers: string[] = []
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  // Create unique test user (parallel-safe with timestamp + random)
  async createTestUser(overrides: Partial<any> = {}): Promise<any> {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    
    const user = {
      clerk_user_id: `test_${timestamp}_${random}`,
      email: `test_${timestamp}_${random}@test.c9d.ai`,
      preferences: {
        theme: { id: 'cursor-light', lastUpdated: new Date().toISOString() },
        locale: { code: 'en-US', lastUpdated: new Date().toISOString() }
      },
      ...overrides
    }

    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) throw error
    this.createdUsers.push(data.id) // Track for cleanup
    return data
  }

  // CRITICAL: Clean up all created test data
  async cleanup(): Promise<void> {
    for (const userId of this.createdUsers) {
      await this.supabase.from('users').delete().eq('id', userId)
    }
    this.createdUsers = []
  }
}
```

**Idempotent & Parallel-Safe Testing Principles**:
1. **Unique Identifiers**: timestamp + random for all test data
2. **Isolated Data**: Each test creates its own data
3. **Automatic Cleanup**: afterAll hooks clean up everything
4. **Graceful Skipping**: Tests skip if services unavailable
5. **No Mocking**: Integration tests use real Supabase
6. **100% Pass Rate**: All tests must pass for completion
```

### Property Test Examples

#### Theme Application Property

```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { ThemeEngine } from '@/lib/theme/engine'

describe('Theme Properties', () => {
  /**
   * Feature: theming-internationalization-system, Property 2: Immediate theme application
   */
  it('should apply any theme immediately without page navigation', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.constantFrom('cursor-light', 'cursor-dark', 'ocean-breeze'),
          palette: fc.record({
            primary: fc.hexaString({ minLength: 6, maxLength: 6 }),
            background: fc.hexaString({ minLength: 6, maxLength: 6 }),
          })
        }),
        (theme) => {
          const engine = new ThemeEngine()
          engine.applyTheme(theme)
          
          // Verify CSS custom properties are set
          const root = document.documentElement
          const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary')
          
          expect(primaryColor).toBeTruthy()
          expect(window.location.href).not.toContain('reload')
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

#### Translation Round-Trip Property

```typescript
/**
 * Feature: theming-internationalization-system, Property 18: Language persistence round-trip
 */
it('should persist and retrieve any language preference correctly', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.constantFrom('en-US', 'fr-FR', 'es-ES', 'de-DE', 'ja-JP'),
      fc.string({ minLength: 10, maxLength: 20 }), // userId
      async (locale, userId) => {
        const service = new PreferencesService()
        
        // Save preference
        await service.updateLanguagePreference(userId, locale)
        
        // Retrieve from database
        const dbPrefs = await service.getUserPreferences(userId)
        expect(dbPrefs.locale).toBe(locale)
        
        // Retrieve from local storage
        const localPrefs = localStorage.getItem(`user-prefs-${userId}`)
        expect(JSON.parse(localPrefs).locale).toBe(locale)
      }
    ),
    { numRuns: 100 }
  )
})
```

#### Contrast Ratio Property

```typescript
/**
 * Feature: theming-internationalization-system, Property 14: Contrast ratio maintenance
 */
it('should maintain WCAG AA contrast ratios for any theme', () => {
  fc.assert(
    fc.property(
      fc.record({
        textColor: fc.hexaString({ minLength: 6, maxLength: 6 }),
        backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }),
      }),
      (colors) => {
        const contrastRatio = calculateContrastRatio(
          colors.textColor,
          colors.backgroundColor
        )
        
        // WCAG AA requires 4.5:1 for normal text
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5)
      }
    ),
    { numRuns: 100 }
  )
})
```

### Coverage Requirements

Following the tiered coverage enforcement standards:

- **Services (`lib/services/preferences-service.ts`)**: 100% coverage
- **Core Logic (`lib/theme/engine.ts`, `lib/i18n/engine.ts`)**: 100% coverage
- **Repositories (`lib/repositories/*-repository.ts`)**: 95% coverage
- **API Routes (`app/api/preferences/**`)**: 90% coverage
- **Components (`components/theme/**`, `components/i18n/**`)**: 85% coverage

### Test Execution

```bash
# Run all tests with coverage
NODE_OPTIONS="--max-old-space-size=8192" pnpm test --coverage

# Run property-based tests only
NODE_OPTIONS="--max-old-space-size=8192" pnpm test property/

# Run integration tests
NODE_OPTIONS="--max-old-space-size=8192" pnpm test integration/

# Run E2E tests
pnpm test:e2e
```



## Performance Considerations

### Theme System Performance

#### CSS Custom Properties

Using CSS custom properties for theme values enables efficient style updates:

```css
:root {
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a8a;
  /* ... other theme variables */
}

[data-theme="dark"] {
  --color-primary-50: #1e3a8a;
  --color-primary-500: #3b82f6;
  --color-primary-900: #eff6ff;
}
```

**Benefits:**
- No JavaScript required for style updates
- Browser-optimized rendering
- Smooth transitions with CSS
- Minimal reflow/repaint

#### Theme Lazy Loading

Themes are lazy-loaded to minimize initial bundle size:

```typescript
const themes = {
  'cursor-light': () => import('./themes/cursor-light'),
  'cursor-dark': () => import('./themes/cursor-dark'),
  'ocean-breeze': () => import('./themes/ocean-breeze'),
  // ... other themes
}

async function loadTheme(themeId: ThemeId): Promise<Theme> {
  const loader = themes[themeId]
  if (!loader) throw new ThemeLoadError(themeId)
  
  const module = await loader()
  return module.default
}
```

#### Theme Caching

Loaded themes are cached in memory and Redis:

```typescript
class ThemeCache {
  private memoryCache = new Map<ThemeId, Theme>()
  private redis = createRedisClient()
  
  async get(themeId: ThemeId): Promise<Theme | null> {
    // Check memory cache first
    if (this.memoryCache.has(themeId)) {
      return this.memoryCache.get(themeId)!
    }
    
    // Check Redis cache
    const cached = await this.redis.get(`theme:${themeId}`)
    if (cached) {
      const theme = JSON.parse(cached)
      this.memoryCache.set(themeId, theme)
      return theme
    }
    
    return null
  }
  
  async set(themeId: ThemeId, theme: Theme): Promise<void> {
    this.memoryCache.set(themeId, theme)
    await this.redis.setex(
      `theme:${themeId}`,
      3600, // 1 hour TTL
      JSON.stringify(theme)
    )
  }
}
```

### i18n System Performance

#### Translation Caching

Translations are cached at multiple levels:

```typescript
class TranslationCache {
  private memoryCache = new Map<string, string>()
  private redis = createRedisClient()
  
  getCacheKey(locale: string, key: string): string {
    return `i18n:${locale}:${key}`
  }
  
  async get(locale: string, key: string): Promise<string | null> {
    const cacheKey = this.getCacheKey(locale, key)
    
    // L1: Memory cache
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!
    }
    
    // L2: Redis cache
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.memoryCache.set(cacheKey, cached)
      return cached
    }
    
    return null
  }
}
```

#### Translation Preloading

Critical translations are preloaded during app initialization:

```typescript
async function preloadCriticalTranslations(locale: Locale): Promise<void> {
  const criticalNamespaces = ['common', 'navigation', 'errors']
  
  await Promise.all(
    criticalNamespaces.map(namespace =>
      i18nEngine.loadTranslations(locale, namespace)
    )
  )
}
```

#### Lazy Translation Loading

Non-critical translations are loaded on demand:

```typescript
const translationModules = {
  'en-US': {
    common: () => import('./locales/en-US/common.json'),
    dashboard: () => import('./locales/en-US/dashboard.json'),
    settings: () => import('./locales/en-US/settings.json'),
  },
  // ... other locales
}

async function loadTranslations(
  locale: Locale,
  namespace: string
): Promise<Translations> {
  const loader = translationModules[locale]?.[namespace]
  if (!loader) throw new TranslationLoadError(locale, namespace)
  
  const module = await loader()
  return module.default
}
```

### Synchronization Performance

#### Debounced Preference Updates

Preference changes are debounced to reduce database writes:

```typescript
class PreferencesService {
  private updateQueue = new Map<string, UserPreferences>()
  private flushTimer: NodeJS.Timeout | null = null
  
  async updateThemePreference(
    userId: string,
    themeId: ThemeId
  ): Promise<void> {
    // Update local state immediately
    this.updateLocalState(userId, { themeId })
    
    // Queue database update
    this.queueUpdate(userId, { themeId })
  }
  
  private queueUpdate(userId: string, update: Partial<UserPreferences>): void {
    const existing = this.updateQueue.get(userId) || {}
    this.updateQueue.set(userId, { ...existing, ...update })
    
    // Debounce flush
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => this.flushQueue(), 1000)
  }
  
  private async flushQueue(): Promise<void> {
    const updates = Array.from(this.updateQueue.entries())
    this.updateQueue.clear()
    
    await Promise.all(
      updates.map(([userId, prefs]) =>
        this.saveToDatabase(userId, prefs)
      )
    )
  }
}
```

#### WebSocket-Based Sync

Real-time preference synchronization uses WebSockets:

```typescript
class PreferenceSyncService {
  private ws: WebSocket
  
  constructor() {
    this.ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!)
    this.setupListeners()
  }
  
  private setupListeners(): void {
    this.ws.on('preference-update', (data: PreferenceUpdate) => {
      // Update local state
      this.applyRemoteUpdate(data)
    })
  }
  
  broadcastUpdate(userId: string, update: Partial<UserPreferences>): void {
    this.ws.send(JSON.stringify({
      type: 'preference-update',
      userId,
      update,
      timestamp: Date.now()
    }))
  }
}
```

### Bundle Size Optimization

#### Code Splitting

Theme and i18n code is split into separate chunks:

```typescript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      cacheGroups: {
        theme: {
          test: /[\\/]lib[\\/]theme[\\/]/,
          name: 'theme',
          chunks: 'all',
          priority: 10,
        },
        i18n: {
          test: /[\\/]lib[\\/]i18n[\\/]/,
          name: 'i18n',
          chunks: 'all',
          priority: 10,
        },
      },
    }
    return config
  },
}
```

#### Tree Shaking

Unused theme and translation code is eliminated:

```typescript
// Export only what's needed
export { ThemeProvider, useTheme } from './theme-provider'
export { LanguageProvider, useTranslation } from './language-provider'
export type { Theme, Locale, UserPreferences } from './types'
```



## Security Considerations

### Input Validation

All user inputs for themes and locales are validated:

```typescript
// Validate theme ID
function validateThemeId(themeId: string): ThemeId {
  const result = ThemeIdSchema.safeParse(themeId)
  if (!result.success) {
    throw new ValidationError('Invalid theme ID', result.error)
  }
  return result.data
}

// Validate locale
function validateLocale(locale: string): Locale {
  const result = LocaleSchema.safeParse(locale)
  if (!result.success) {
    throw new ValidationError('Invalid locale', result.error)
  }
  return result.data
}
```

### XSS Prevention

Translation content is sanitized to prevent XSS attacks:

```typescript
import DOMPurify from 'isomorphic-dompurify'

function sanitizeTranslation(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
  })
}

function getTranslation(key: string, params?: Record<string, any>): string {
  let text = translations[key] || key
  
  // Sanitize before parameter substitution
  text = sanitizeTranslation(text)
  
  // Safely substitute parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      const sanitizedValue = sanitizeTranslation(String(value))
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), sanitizedValue)
    })
  }
  
  return text
}
```

### Authorization

Theme and language preferences are protected by user authentication:

```typescript
// API route protection
export async function PUT(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const { themeId, locale } = body
  
  // Validate ownership
  const preferences = await PreferencesService.getUserPreferences(userId)
  if (preferences.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Update preferences
  await PreferencesService.updateThemePreference(userId, themeId)
  await PreferencesService.updateLanguagePreference(userId, locale)
  
  return NextResponse.json({ success: true })
}
```

### Rate Limiting

Preference updates are rate-limited to prevent abuse:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
})

export async function PUT(request: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check rate limit
  const { success, limit, remaining } = await ratelimit.limit(
    `preferences:${userId}`
  )
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        }
      }
    )
  }
  
  // Process request...
}
```

### Data Privacy

User preferences are encrypted at rest:

```typescript
import { encrypt, decrypt } from '@/lib/crypto'

async function savePreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  // Encrypt sensitive customizations
  const encrypted = {
    ...preferences,
    customizations: preferences.customizations
      ? encrypt(JSON.stringify(preferences.customizations))
      : null,
  }
  
  await db.insert(userPreferences).values(encrypted)
}

async function loadPreferences(userId: string): Promise<UserPreferences> {
  const prefs = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)
  
  if (!prefs[0]) return null
  
  // Decrypt customizations
  return {
    ...prefs[0],
    customizations: prefs[0].customizations
      ? JSON.parse(decrypt(prefs[0].customizations))
      : null,
  }
}
```

## Accessibility Considerations

### WCAG Compliance

All themes must meet WCAG AA standards:

```typescript
function validateThemeAccessibility(theme: Theme): ValidationResult {
  const errors: string[] = []
  
  // Check contrast ratios
  const textColors = Object.values(theme.palette.text)
  const bgColors = Object.values(theme.palette.background)
  
  textColors.forEach(textColor => {
    bgColors.forEach(bgColor => {
      const ratio = calculateContrastRatio(textColor, bgColor)
      
      // WCAG AA requires 4.5:1 for normal text
      if (ratio < 4.5) {
        errors.push(
          `Insufficient contrast: ${textColor} on ${bgColor} (${ratio.toFixed(2)}:1)`
        )
      }
    })
  })
  
  return {
    valid: errors.length === 0,
    errors,
  }
}
```

### Keyboard Navigation

Theme and language selectors are fully keyboard accessible:

```typescript
function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme()
  
  return (
    <div role="radiogroup" aria-label="Theme selection">
      {Object.entries(themes).map(([id, themeData]) => (
        <button
          key={id}
          role="radio"
          aria-checked={theme.id === id}
          onClick={() => setTheme(id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setTheme(id)
            }
          }}
          className="theme-option"
        >
          <span className="theme-preview" style={{ backgroundColor: themeData.palette.primary[500] }} />
          <span className="theme-name">{themeData.displayName}</span>
        </button>
      ))}
    </div>
  )
}
```

### Screen Reader Support

Theme and language changes are announced to screen readers:

```typescript
function useThemeAnnouncement() {
  const { theme } = useTheme()
  const { announce } = useAnnouncement()
  
  useEffect(() => {
    announce(`Theme changed to ${theme.displayName}`)
  }, [theme.id])
}

function useLanguageAnnouncement() {
  const { locale } = useLanguage()
  const { announce } = useAnnouncement()
  
  useEffect(() => {
    const localeName = SUPPORTED_LOCALES.find(l => l.code === locale)?.name
    announce(`Language changed to ${localeName}`)
  }, [locale])
}
```

### Focus Management

Focus is managed appropriately during theme and language changes:

```typescript
function ThemeSettings() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { setTheme } = useTheme()
  
  const handleThemeChange = async (themeId: ThemeId) => {
    await setTheme(themeId)
    
    // Return focus to trigger button
    buttonRef.current?.focus()
  }
  
  return (
    <button ref={buttonRef} onClick={() => handleThemeChange('cursor-dark')}>
      Apply Theme
    </button>
  )
}
```



## Implementation Details

### File Structure

```
apps/web/
├── lib/
│   ├── theme/
│   │   ├── engine.ts                 # Theme loading and application
│   │   ├── provider.tsx              # React context provider
│   │   ├── hooks.ts                  # useTheme, useThemePreview
│   │   ├── cache.ts                  # Theme caching layer
│   │   ├── validator.ts              # Theme validation
│   │   └── themes/
│   │       ├── cursor-light.ts
│   │       ├── cursor-dark.ts
│   │       ├── ocean-breeze.ts
│   │       └── index.ts
│   ├── i18n/
│   │   ├── engine.ts                 # Translation engine
│   │   ├── provider.tsx              # Language context provider
│   │   ├── hooks.ts                  # useTranslation, useLocale
│   │   ├── cache.ts                  # Translation caching
│   │   ├── validator.ts              # Locale validation
│   │   └── locales/
│   │       ├── en-US/
│   │       │   ├── common.json
│   │       │   ├── dashboard.json
│   │       │   └── settings.json
│   │       ├── fr-FR/
│   │       └── index.ts
│   ├── services/
│   │   ├── preferences-service.ts    # User preference management
│   │   └── sync-service.ts           # Cross-session synchronization
│   ├── repositories/
│   │   ├── preferences-repository.ts # Database operations
│   │   └── organization-defaults-repository.ts
│   └── validation/
│       └── schemas/
│           ├── theme.ts              # Theme validation schemas
│           └── locale.ts             # Locale validation schemas
├── components/
│   ├── theme/
│   │   ├── theme-selector.tsx        # Theme selection UI
│   │   ├── theme-preview.tsx         # Theme preview component
│   │   └── theme-customizer.tsx      # Theme customization UI
│   ├── i18n/
│   │   ├── language-selector.tsx     # Language selection UI
│   │   └── translation-preview.tsx   # Translation preview
│   └── settings/
│       ├── appearance-settings.tsx   # Combined theme/language settings
│       └── preview-mode.tsx          # Preview mode UI
├── app/
│   └── api/
│       └── preferences/
│           ├── route.ts              # GET/PUT user preferences
│           ├── theme/route.ts        # Theme-specific endpoint
│           ├── language/route.ts     # Language-specific endpoint
│           └── sync/route.ts         # Sync endpoint
└── styles/
    ├── themes/
    │   ├── base.css                  # Base theme styles
    │   ├── cursor-light.css
    │   ├── cursor-dark.css
    │   └── variables.css             # CSS custom properties
    └── rtl.css                       # RTL-specific styles
```

### Key Implementation Patterns

#### Theme Provider Implementation

```typescript
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ThemeEngine } from './engine'
import { PreferencesService } from '@/lib/services/preferences-service'
import { useAuth } from '@clerk/nextjs'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children, defaultTheme = 'cursor-light' }: ThemeProviderProps) {
  const { userId } = useAuth()
  const [theme, setThemeState] = useState<Theme | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const engine = useMemo(() => new ThemeEngine(), [])
  
  // Load initial theme
  useEffect(() => {
    async function loadInitialTheme() {
      try {
        setIsLoading(true)
        
        let themeId = defaultTheme
        
        // Load user preference if authenticated
        if (userId) {
          const prefs = await PreferencesService.getUserPreferences(userId)
          if (prefs?.themeId) {
            themeId = prefs.themeId
          }
        } else {
          // Load from local storage
          const stored = localStorage.getItem('theme-preference')
          if (stored) {
            themeId = stored
          }
        }
        
        const loadedTheme = await engine.loadTheme(themeId)
        setThemeState(loadedTheme)
        engine.applyTheme(loadedTheme)
      } catch (err) {
        setError(err as Error)
        // Fall back to default theme
        const fallback = await engine.loadTheme(defaultTheme)
        setThemeState(fallback)
        engine.applyTheme(fallback)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadInitialTheme()
  }, [userId, defaultTheme, engine])
  
  // Set theme with persistence
  const setTheme = useCallback(async (themeId: ThemeId) => {
    try {
      const newTheme = await engine.loadTheme(themeId)
      setThemeState(newTheme)
      engine.applyTheme(newTheme)
      
      // Persist preference
      if (userId) {
        await PreferencesService.updateThemePreference(userId, themeId)
      } else {
        localStorage.setItem('theme-preference', themeId)
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [userId, engine])
  
  const value: ThemeContextValue = {
    theme: theme!,
    themeId: theme?.id || defaultTheme,
    setTheme,
    themes: engine.getAllThemes(),
    isLoading,
    error,
  }
  
  if (isLoading || !theme) {
    return <div className="theme-loading">Loading theme...</div>
  }
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
```

#### Language Provider Implementation

```typescript
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { I18nEngine } from './engine'
import { PreferencesService } from '@/lib/services/preferences-service'
import { useAuth } from '@clerk/nextjs'

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ 
  children, 
  defaultLocale = 'en-US',
  supportedLocales,
  fallbackLocale = 'en-US'
}: LanguageProviderProps) {
  const { userId } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const engine = useMemo(() => new I18nEngine(fallbackLocale), [fallbackLocale])
  
  // Load initial locale
  useEffect(() => {
    async function loadInitialLocale() {
      try {
        setIsLoading(true)
        
        let userLocale = defaultLocale
        
        // Load user preference if authenticated
        if (userId) {
          const prefs = await PreferencesService.getUserPreferences(userId)
          if (prefs?.locale) {
            userLocale = prefs.locale
          }
        } else {
          // Load from local storage or browser
          const stored = localStorage.getItem('language-preference')
          if (stored) {
            userLocale = stored
          } else {
            // Detect browser language
            const browserLang = navigator.language
            if (supportedLocales.includes(browserLang)) {
              userLocale = browserLang
            }
          }
        }
        
        await engine.preloadLocale(userLocale)
        setLocaleState(userLocale)
        
        // Set HTML lang attribute
        document.documentElement.lang = userLocale
        
        // Set direction
        const direction = LOCALE_CONFIG[userLocale]?.direction || 'ltr'
        document.documentElement.dir = direction
      } catch (err) {
        setError(err as Error)
        setLocaleState(fallbackLocale)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadInitialLocale()
  }, [userId, defaultLocale, supportedLocales, fallbackLocale, engine])
  
  // Set locale with persistence
  const setLocale = useCallback(async (newLocale: Locale) => {
    try {
      await engine.preloadLocale(newLocale)
      setLocaleState(newLocale)
      
      // Update HTML attributes
      document.documentElement.lang = newLocale
      const direction = LOCALE_CONFIG[newLocale]?.direction || 'ltr'
      document.documentElement.dir = direction
      
      // Persist preference
      if (userId) {
        await PreferencesService.updateLanguagePreference(userId, newLocale)
      } else {
        localStorage.setItem('language-preference', newLocale)
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [userId, engine])
  
  // Translation function
  const t = useCallback((
    key: string,
    params?: Record<string, string | number>,
    options?: TranslationOptions
  ): string => {
    return engine.getTranslation(key, locale, params, options)
  }, [locale, engine])
  
  const value: LanguageContextValue = {
    locale,
    setLocale,
    t,
    supportedLocales,
    isLoading,
    error,
    direction: LOCALE_CONFIG[locale]?.direction || 'ltr',
  }
  
  if (isLoading) {
    return <div className="language-loading">Loading translations...</div>
  }
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider')
  }
  return context
}
```



## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1)

1. **Schema Extensions** (No migrations needed)
   - Define TypeScript interfaces for preferences structure
   - Create Zod schemas for validation
   - Document JSONB structure in existing tables
   - Add helper functions for preference access

2. **Core Libraries**
   - Implement ThemeEngine with basic theme loading
   - Implement I18nEngine with translation loading
   - Set up caching infrastructure (Redis via Vercel KV)
   - Create validation schemas with Zod
   - Integrate with existing Supabase client patterns

3. **Testing Infrastructure**
   - Set up property-based testing with fast-check
   - Install @clerk/testing for official Clerk mocks
   - Create real Supabase integration test utilities
   - Implement test data lifecycle management
   - Create E2E auth helpers following Clerk patterns
   - Configure parallel test execution support

### Phase 2: Theme System (Week 2)

1. **Theme Implementation**
   - Create base theme structure
   - Implement cursor-light and cursor-dark themes
   - Add additional theme variants
   - Implement CSS custom property system

2. **Theme Provider**
   - Implement ThemeProvider with context
   - Add theme loading and caching
   - Implement theme persistence
   - Add error handling and fallbacks

3. **Theme UI Components**
   - Create ThemeSelector component
   - Implement ThemePreview component
   - Add theme customization UI
   - Implement smooth transitions

### Phase 3: i18n System (Week 3)

1. **Translation Infrastructure**
   - Set up translation file structure
   - Implement translation loading
   - Add translation caching
   - Create translation utilities

2. **Language Provider**
   - Implement LanguageProvider with context
   - Add locale detection and loading
   - Implement translation function
   - Add RTL support

3. **Translation UI Components**
   - Create LanguageSelector component
   - Implement translation preview
   - Add missing translation indicators
   - Create translation management tools

### Phase 4: Integration (Week 4)

1. **Preferences Service**
   - Implement PreferencesService
   - Add database operations
   - Implement cross-session sync
   - Add organization defaults

2. **API Routes**
   - Create preferences API endpoints
   - Add theme-specific endpoints
   - Add language-specific endpoints
   - Implement sync endpoints

3. **Component Integration**
   - Update existing components to use themes
   - Add translation keys to all text
   - Implement RTL layouts
   - Test accessibility

### Phase 5: Testing & Optimization (Week 5)

1. **Comprehensive Testing**
   - Write property-based tests
   - Add integration tests
   - Create E2E test scenarios
   - Achieve coverage targets

2. **Performance Optimization**
   - Optimize theme loading
   - Improve translation caching
   - Reduce bundle size
   - Optimize synchronization

3. **Documentation**
   - Write developer documentation
   - Create user guides
   - Document theme creation
   - Document translation workflow

### Rollout Strategy

#### Beta Testing (Week 6)

1. **Internal Testing**
   - Enable for internal users
   - Gather feedback
   - Fix critical issues
   - Monitor performance

2. **Limited Rollout**
   - Enable for 10% of users
   - Monitor error rates
   - Track performance metrics
   - Collect user feedback

#### Full Rollout (Week 7)

1. **Gradual Rollout**
   - Increase to 25% of users
   - Increase to 50% of users
   - Increase to 100% of users
   - Monitor at each stage

2. **Post-Rollout**
   - Monitor error rates
   - Track usage metrics
   - Gather user feedback
   - Plan improvements

### Backward Compatibility

During migration, maintain backward compatibility:

```typescript
// Support both old and new theme systems
function getThemeValue(key: string): string {
  // Try new theme system first
  if (window.__THEME_SYSTEM__) {
    return window.__THEME_SYSTEM__.getValue(key)
  }
  
  // Fall back to old system
  return getLegacyThemeValue(key)
}

// Support both old and new i18n systems
function translate(key: string): string {
  // Try new i18n system first
  if (window.__I18N_SYSTEM__) {
    return window.__I18N_SYSTEM__.t(key)
  }
  
  // Fall back to old system
  return getLegacyTranslation(key)
}
```

### Data Migration

Migrate existing user preferences:

```typescript
async function migrateUserPreferences(): Promise<void> {
  // Get all users with old preference format
  const users = await db
    .select()
    .from(users)
    .where(isNotNull(users.oldPreferences))
  
  for (const user of users) {
    try {
      // Parse old preferences
      const oldPrefs = JSON.parse(user.oldPreferences)
      
      // Map to new format
      const newPrefs: UserPreferences = {
        userId: user.clerkUserId,
        themeId: mapOldThemeToNew(oldPrefs.theme),
        locale: mapOldLocaleToNew(oldPrefs.language),
        customizations: {},
        syncEnabled: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      // Save new preferences
      await db.insert(userPreferences).values(newPrefs)
      
      // Clear old preferences
      await db
        .update(users)
        .set({ oldPreferences: null })
        .where(eq(users.id, user.id))
    } catch (err) {
      console.error(`Failed to migrate preferences for user ${user.id}:`, err)
    }
  }
}
```

## Vercel Deployment Integration

### Deployment Architecture

**Design Decision**: Leverage Vercel's edge capabilities and existing deployment patterns.

**Rationale**:
- Use Vercel KV (Redis) for theme and translation caching
- Deploy API routes as serverless functions with appropriate timeouts
- Leverage edge middleware for theme/locale detection
- Use Vercel's CDN for static theme assets
- Integrate with existing Vercel deployment pipeline

### Edge Middleware for Locale Detection

```typescript
// middleware.ts - Edge middleware for theme/locale detection
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  const detectedLocale = detectLocale(acceptLanguage)
  
  // Set locale cookie if not present
  if (!request.cookies.get('locale')) {
    response.cookies.set('locale', detectedLocale)
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### Vercel KV Integration

```typescript
// lib/cache/vercel-kv.ts
import { kv } from '@vercel/kv'

export class VercelKVCache {
  static async get<T>(key: string): Promise<T | null> {
    return await kv.get<T>(key)
  }
  
  static async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await kv.setex(key, ttl, value)
  }
  
  static async invalidate(pattern: string): Promise<void> {
    const keys = await kv.keys(pattern)
    if (keys.length > 0) {
      await kv.del(...keys)
    }
  }
}
```

### API Route Configuration

```typescript
// app/api/preferences/route.ts
export const runtime = 'nodejs' // Use Node.js runtime for database access
export const maxDuration = 10 // 10 second timeout for preference updates

// app/api/preferences/sync/route.ts
export const runtime = 'edge' // Use edge runtime for WebSocket sync
export const maxDuration = 30 // 30 second timeout for sync operations
```

### Environment Variables

**Managed via Phase.dev** (AI.C9d.Web context):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase database URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server operations
- `KV_URL` - Vercel KV Redis URL (auto-configured by Vercel)
- `KV_REST_API_URL` - Vercel KV REST API URL (auto-configured)
- `KV_REST_API_TOKEN` - Vercel KV REST API token (auto-configured)

### Turbo and pnpm Integration

**Build Configuration**:
```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "env": ["NEXT_PUBLIC_SUPABASE_URL", "KV_URL"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Package Scripts** (with Phase.dev integration):
```json
{
  "scripts": {
    "dev": "phase run --context AI.C9d.Web -- next dev",
    "build": "phase run --context AI.C9d.Web -- next build",
    "test": "NODE_OPTIONS=\"--max-old-space-size=8192\" phase run --context AI.C9d.Web -- vitest run",
    "test:integration": "NODE_OPTIONS=\"--max-old-space-size=8192\" phase run --context AI.C9d.Web -- vitest run __tests__/integration/",
    "test:e2e": "phase run --context AI.C9d.Web -- playwright test"
  }
}
```

## Monitoring and Observability

### Metrics to Track

1. **Theme Metrics**
   - Theme load time
   - Theme switch time
   - Theme cache hit rate
   - Theme error rate
   - Most popular themes

2. **i18n Metrics**
   - Translation load time
   - Translation cache hit rate
   - Missing translation rate
   - Language switch time
   - Most used languages

3. **Sync Metrics**
   - Sync latency
   - Sync success rate
   - Conflict rate
   - Queue size

4. **Performance Metrics**
   - Bundle size impact
   - Initial load time
   - Time to interactive
   - Memory usage

### Logging

Implement structured logging:

```typescript
import { logger } from '@/lib/logger'

// Theme events
logger.info('theme.loaded', {
  themeId,
  userId,
  loadTime: duration,
  source: 'cache' | 'database' | 'default',
})

logger.error('theme.load.failed', {
  themeId,
  userId,
  error: error.message,
  stack: error.stack,
})

// i18n events
logger.info('translation.loaded', {
  locale,
  namespace,
  loadTime: duration,
  source: 'cache' | 'file' | 'fallback',
})

logger.warn('translation.missing', {
  key,
  locale,
  fallback: fallbackValue,
})

// Sync events
logger.info('preferences.synced', {
  userId,
  changes: ['theme', 'locale'],
  syncTime: duration,
})
```

### Alerting

Set up alerts for critical issues:

```typescript
// Alert on high error rate
if (themeErrorRate > 0.05) {
  alert('High theme error rate', {
    rate: themeErrorRate,
    threshold: 0.05,
    severity: 'high',
  })
}

// Alert on slow performance
if (themeLoadTime > 500) {
  alert('Slow theme loading', {
    loadTime: themeLoadTime,
    threshold: 500,
    severity: 'medium',
  })
}

// Alert on missing translations
if (missingTranslationRate > 0.01) {
  alert('High missing translation rate', {
    rate: missingTranslationRate,
    threshold: 0.01,
    severity: 'low',
  })
}
```

## Conclusion

This design provides a comprehensive, performant, and accessible theming and internationalization system for the C9D AI platform. The system follows modern React patterns, integrates seamlessly with existing infrastructure, and provides a solid foundation for future enhancements.

Key benefits:
- **User Experience**: Smooth theme transitions and instant language switching
- **Developer Experience**: Type-safe APIs and comprehensive testing utilities
- **Performance**: Optimized loading, caching, and synchronization
- **Accessibility**: WCAG AA compliance and full keyboard/screen reader support
- **Scalability**: Efficient architecture ready for growth
- **Maintainability**: Clear separation of concerns and comprehensive documentation

