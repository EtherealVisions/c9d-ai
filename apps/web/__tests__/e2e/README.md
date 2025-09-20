# End-to-End (E2E) Testing Guide

This directory contains comprehensive E2E tests for the C9D AI platform using Playwright. These tests validate complete user journeys and critical application flows.

## Test Structure

```
__tests__/e2e/
├── setup/                    # Test setup and utilities
│   ├── global-setup.ts      # Global test setup
│   ├── global-teardown.ts   # Global test cleanup
│   └── auth-helpers.ts      # Authentication helpers
├── fixtures/                # Test data and fixtures
│   └── test-data.ts        # Test data generators
├── auth-flows.e2e.test.ts          # Authentication flow tests
├── onboarding-flows.e2e.test.ts    # User onboarding tests
├── dashboard-navigation.e2e.test.ts # Dashboard and navigation tests
├── error-handling.e2e.test.ts      # Error handling and edge cases
├── run-e2e-tests.ts               # Comprehensive test runner
└── README.md                      # This file
```

## Test Coverage

### 🔐 Authentication Flows (`auth-flows.e2e.test.ts`)
- User registration and sign-up
- User sign-in and sign-out
- Password reset flows
- Social authentication (Google, GitHub, Microsoft)
- Session management
- Two-factor authentication
- Remember me functionality
- Error handling for invalid credentials
- Rate limiting scenarios
- Accessibility compliance

### 📋 Onboarding Flows (`onboarding-flows.e2e.test.ts`)
- Profile setup and role selection
- Organization creation and joining
- Team invitation and management
- Interactive tutorials and help systems
- Onboarding completion and progression
- Progress saving and resuming
- Error handling during onboarding
- Accessibility compliance

### 🏠 Dashboard Navigation (`dashboard-navigation.e2e.test.ts`)
- Dashboard layout and components
- Navigation between sections
- User profile management
- Settings and preferences
- Organization switching
- Data persistence across sessions
- Responsive design testing
- Performance validation

### ⚠️ Error Handling (`error-handling.e2e.test.ts`)
- Network failures and offline behavior
- Server errors and API failures
- Invalid data and malformed responses
- Browser compatibility issues
- Session expiration and timeout handling
- Graceful degradation scenarios
- Recovery mechanisms

## Running Tests

### Prerequisites

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Install Playwright Browsers**
   ```bash
   npx playwright install
   ```

3. **Start Development Server**
   ```bash
   pnpm dev
   ```
   The application should be running at `http://localhost:3007`

4. **Environment Variables**
   Ensure these environment variables are set:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

### Test Commands

#### Basic Commands
```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run in headed mode (visible browser)
pnpm test:e2e:headed

# Run in debug mode
pnpm test:e2e:debug
```

#### Advanced Commands
```bash
# Run comprehensive test suite with reporting
pnpm test:e2e:comprehensive

# Run specific test file
npx playwright test auth-flows.e2e.test.ts

# Run tests on specific browser
npx playwright test --project=firefox

# Run tests in parallel
npx playwright test --workers=4
```

#### From Root Directory
```bash
# Run all E2E tests from root
pnpm test:e2e

# Run comprehensive suite from root
pnpm test:e2e:comprehensive
```

### Test Configuration

The tests are configured via `playwright.config.ts` in the root directory:

- **Base URL**: `http://localhost:3007` (configurable)
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Timeouts**: 60s test timeout, 10s action timeout
- **Retries**: 2 retries on CI, 0 locally
- **Reporters**: HTML, JSON, JUnit, List

## Test Data and Fixtures

### Test Users
The tests use predefined test user profiles:
- `ADMIN`: Administrative user with full permissions
- `MEMBER`: Regular member user
- `DEVELOPER`: Developer role user
- `DESIGNER`: Designer role user

### Test Organizations
Predefined organization profiles:
- `TECH_STARTUP`: Small technology startup
- `ENTERPRISE`: Large enterprise organization
- `AGENCY`: Creative agency

### Dynamic Test Data
Test data is generated dynamically to avoid conflicts:
```typescript
// Generate unique test user
const testUser = createTestUser('MEMBER')
// Email: member-1640995200000-abc123@test.c9d.ai

// Generate unique organization
const testOrg = createTestOrganization('TECH_STARTUP')
// Name: Tech Startup 1640995200000
```

## Authentication Helpers

The `auth-helpers.ts` file provides utilities for authentication flows:

```typescript
// Sign up new user
await signUpUser(page, testUser)

// Sign in existing user
await signInUser(page, TEST_USERS.MEMBER)

// Complete onboarding
await completeOnboarding(page, {
  organizationName: 'Test Org',
  role: 'developer',
  skipTutorial: true
})

// Sign out user
await signOutUser(page)

// Wait for authentication state
const authState = await waitForAuthState(page)
```

## Test Patterns

### Page Object Pattern
Tests use data-testid attributes for reliable element selection:
```typescript
// Good: Use data-testid
await page.click('[data-testid="sign-in-button"]')

// Avoid: CSS selectors or text content
await page.click('.btn-primary') // Fragile
await page.click('text=Sign In') // Fragile
```

### Error Handling
Tests include comprehensive error handling:
```typescript
// Handle optional elements
const rememberMe = page.locator('[data-testid="remember-me"]')
if (await rememberMe.isVisible()) {
  await rememberMe.check()
}

// Handle race conditions
await Promise.race([
  page.waitForURL('/dashboard'),
  page.waitForURL('/onboarding/**')
])
```

### Accessibility Testing
Tests validate accessibility compliance:
```typescript
// Check ARIA labels
await expect(page.locator('[data-testid="email-input"]'))
  .toHaveAttribute('aria-label')

// Test keyboard navigation
await page.keyboard.press('Tab')
await expect(page.locator('[data-testid="password-input"]'))
  .toBeFocused()
```

## Debugging Tests

### Visual Debugging
```bash
# Run with visible browser
pnpm test:e2e:headed

# Run with debug mode (step through)
pnpm test:e2e:debug

# Run with UI mode (interactive)
pnpm test:e2e:ui
```

### Screenshots and Videos
Failed tests automatically capture:
- Screenshots on failure
- Videos on failure
- Traces for debugging

Artifacts are saved to `apps/web/test-results/`

### Console Logging
Tests include detailed console logging:
```typescript
console.log('✅ User signed in successfully')
console.log('⚠️  Optional feature not available')
console.log('❌ Test failed with error')
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: pnpm test:e2e
  env:
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: apps/web/test-results/
```

### Test Reports
The comprehensive test runner generates:
- JSON report: `test-results/e2e-test-report.json`
- HTML report: `test-results/e2e-test-report.html`
- Playwright HTML report: `test-results/playwright-report/`

## Best Practices

### 1. Test Independence
- Each test should be independent
- Use unique test data for each test
- Clean up test data after tests

### 2. Realistic Scenarios
- Test complete user journeys
- Use realistic test data
- Test error scenarios and edge cases

### 3. Maintainable Tests
- Use page object patterns
- Extract common functionality to helpers
- Use descriptive test names and comments

### 4. Performance
- Run tests in parallel when possible
- Use appropriate timeouts
- Optimize test data setup

### 5. Reliability
- Handle flaky elements gracefully
- Use proper wait strategies
- Include retry mechanisms

## Troubleshooting

### Common Issues

#### Application Not Starting
```bash
# Check if port 3007 is available
lsof -i :3007

# Start development server
pnpm dev
```

#### Authentication Errors
- Verify Clerk configuration
- Check environment variables
- Ensure test users exist

#### Timeout Errors
- Increase timeouts in playwright.config.ts
- Check network connectivity
- Verify application performance

#### Element Not Found
- Verify data-testid attributes exist
- Check if elements are conditionally rendered
- Use proper wait strategies

### Getting Help

1. Check test logs and screenshots in `test-results/`
2. Run tests in headed mode to see what's happening
3. Use debug mode to step through tests
4. Check the Playwright documentation: https://playwright.dev/

## Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Use the provided helpers and fixtures
3. Include proper error handling
4. Add accessibility checks
5. Update this README if needed

### Test Naming Convention
- File names: `feature-name.e2e.test.ts`
- Test descriptions: Use clear, descriptive names
- Test groups: Use `describe` blocks for organization

### Data-TestId Convention
- Use kebab-case: `data-testid="sign-in-button"`
- Be descriptive: `data-testid="user-profile-form"`
- Include context: `data-testid="dashboard-navigation"`

This comprehensive E2E testing setup ensures that all critical user journeys are validated before deployment, providing confidence in the application's functionality and user experience.