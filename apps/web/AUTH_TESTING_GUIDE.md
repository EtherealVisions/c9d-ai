# Authentication Testing Guide

## Overview

This guide covers the comprehensive testing strategy for the authentication system, including both integration and E2E tests.

## Test Structure

### Integration Tests (`__tests__/integration/auth/`)
- **auth-forms.integration.test.tsx**: Unit and integration tests for sign-in and sign-up forms
  - Form validation
  - Error handling
  - Success flows
  - Accessibility features

### E2E Tests (`e2e/auth/`)
- **auth-flow-complete.spec.ts**: Complete user journey tests
  - Sign in flow
  - Sign up flow
  - Password reset
  - Social authentication
  - Mobile responsiveness
  
- **auth-security.spec.ts**: Security-focused tests
  - XSS prevention
  - CSRF protection
  - SQL injection prevention
  - Brute force protection
  - Session security
  - Password security

- **test-helpers.ts**: Utility functions for auth testing

## Running Tests

### Integration Tests
```bash
# Run all integration tests
pnpm test:integration

# Run auth integration tests specifically
pnpm test:integration auth-forms

# Run with coverage
pnpm test:coverage
```

### E2E Tests
```bash
# Run all E2E tests
pnpm test:e2e

# Run auth E2E tests specifically
pnpm test:e2e auth/

# Run in headed mode (see browser)
pnpm test:e2e:headed auth/

# Run specific test file
pnpm test:e2e auth-flow-complete
```

## Test Coverage

### Sign In Form
- ✅ Empty field validation
- ✅ Email format validation
- ✅ Password length validation
- ✅ Incorrect credentials handling
- ✅ Account not found handling
- ✅ Rate limiting
- ✅ Remember me functionality
- ✅ Social sign in (Google, GitHub, Microsoft)
- ✅ Redirect after sign in
- ✅ Keyboard navigation
- ✅ Screen reader compatibility

### Sign Up Form
- ✅ All field validation
- ✅ Password strength indicator
- ✅ Password confirmation matching
- ✅ Email uniqueness validation
- ✅ Terms acceptance requirement
- ✅ Email verification flow
- ✅ Social sign up
- ✅ Onboarding redirect

### Security Tests
- ✅ XSS prevention in inputs
- ✅ CSRF token validation
- ✅ SQL injection prevention
- ✅ Brute force protection (rate limiting)
- ✅ CAPTCHA after failed attempts
- ✅ Session management
- ✅ Password complexity enforcement
- ✅ Secure cookie settings
- ✅ Account enumeration prevention

### Accessibility Tests
- ✅ Keyboard navigation
- ✅ ARIA labels and roles
- ✅ Screen reader announcements
- ✅ Focus management
- ✅ Skip links
- ✅ High contrast mode support

## Setting Up Test Users

### Create Test Users
```bash
# Run the script to create test users in Clerk
node scripts/create-test-users.js
```

This creates the following test accounts:
- admin@example.com (Admin role)
- user@example.com (Regular user)
- premium@example.com (Premium user)
- test@example.com (Test user)

Test user credentials are saved to `scripts/test-users.json`.

### Using Test Users in E2E Tests
```javascript
import testUsers from '../../scripts/test-users.json'

const adminUser = testUsers.users.find(u => u.email === 'admin@example.com')
await signIn(page, adminUser.email, adminUser.password)
```

## Writing New Tests

### Integration Test Example
```typescript
describe('New Feature', () => {
  it('should validate new field', async () => {
    const user = userEvent.setup()
    render(<SignInForm />)
    
    const newField = screen.getByLabel('New Field')
    await user.type(newField, 'invalid value')
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Test Example
```typescript
test('should handle new auth flow', async ({ page }) => {
  await page.goto('/sign-in')
  
  // Use helper functions
  await fillSignInForm(page, 'test@example.com', 'password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  
  // Assert expected behavior
  await waitForAuthRedirect(page, '/dashboard')
})
```

## Best Practices

### 1. Use Data Attributes
Add `data-testid` attributes to elements for reliable selection:
```tsx
<button data-testid="submit-button">Sign In</button>
```

### 2. Avoid Timing Issues
Use proper wait methods instead of arbitrary timeouts:
```typescript
// Good
await page.waitForSelector('[data-testid="success-message"]')

// Bad
await page.waitForTimeout(3000)
```

### 3. Test User Perspective
Write tests from the user's perspective:
```typescript
// Good
await page.getByRole('button', { name: 'Sign In' })

// Less ideal
await page.locator('.submit-btn')
```

### 4. Clean Up After Tests
Always clean up test data:
```typescript
test.afterEach(async ({ page }) => {
  // Sign out if signed in
  if (await isSignedIn(page)) {
    await signOut(page)
  }
})
```

### 5. Handle Flaky Tests
For potentially flaky tests, use retry logic:
```typescript
test('flaky test', async ({ page }) => {
  test.slow() // Triple the timeout
  
  await test.step('critical step', async () => {
    // Test implementation
  })
})
```

## Debugging Tests

### Integration Tests
```bash
# Run in watch mode
pnpm test:watch auth-forms

# Run with debugging
node --inspect-brk ./node_modules/.bin/vitest run auth-forms
```

### E2E Tests
```bash
# Run with UI mode
pnpm test:e2e:ui

# Debug specific test
pnpm test:e2e:debug auth-flow-complete

# Generate trace
pnpm test:e2e --trace on
```

### View Test Reports
```bash
# View coverage report
open coverage/index.html

# View Playwright report
npx playwright show-report
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Auth Tests
  run: |
    pnpm test:integration auth/
    pnpm test:e2e auth/
```

### Environment Variables
Required for tests:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...
```

## Common Issues

### Issue: Tests fail with "Element not found"
**Solution**: Ensure the dev server is running and accessible at the correct port.

### Issue: Social auth tests fail
**Solution**: Mock the OAuth providers or skip in CI environment.

### Issue: Rate limiting in tests
**Solution**: Add delays between tests or use different email addresses.

### Issue: Database connection errors
**Solution**: Ensure DATABASE_URL is set and database is accessible.

## Maintenance

### Weekly Tasks
- Review and update test user credentials
- Check for deprecated Clerk API usage
- Update security test patterns

### Monthly Tasks
- Review test coverage reports
- Update accessibility tests for new WCAG guidelines
- Performance benchmark auth flows

### Quarterly Tasks
- Security audit of auth tests
- Update test documentation
- Review and refactor test helpers
