# Testing Standards & Best Practices

## 🎯 Testing Philosophy

Our testing approach prioritizes **reliability, maintainability, and robustness** over convenience. We use explicit test identifiers and avoid fragile selectors that break with UI changes.

## 📋 Testing Selector Hierarchy

### ✅ PREFERRED (Most Robust)
1. **`data-testid` attributes** - Explicit test identifiers
2. **`role` attributes** - Semantic HTML roles
3. **`getByText` with exact strings** - For unique text content

### ⚠️ ACCEPTABLE (Use Sparingly)
4. **`getByPlaceholderText`** - For form inputs when testid not available
5. **`getByDisplayValue`** - For form inputs with specific values

### ❌ AVOID (Fragile)
6. **`getByLabelText`** - Breaks when label text changes
7. **CSS selectors** - Breaks with styling changes
8. **Class names** - Breaks with CSS refactoring
9. **Element hierarchy** - Breaks with DOM restructuring

## 🏗️ Implementation Standards

### Component Requirements

Every interactive element MUST have a `data-testid` attribute:

```tsx
// ✅ CORRECT: Explicit test identifiers
<button data-testid="submit-button" onClick={handleSubmit}>
  Submit
</button>

<input 
  data-testid="email-input"
  type="email"
  placeholder="Enter your email"
/>

<div data-testid="error-message" className="error">
  {errorMessage}
</div>

// ❌ INCORRECT: No test identifiers
<button onClick={handleSubmit}>Submit</button>
<input type="email" placeholder="Enter your email" />
<div className="error">{errorMessage}</div>
```

### Test Implementation

```tsx
// ✅ CORRECT: Robust test selectors
describe('LoginForm', () => {
  it('should submit form with valid credentials', async () => {
    render(<LoginForm />)
    
    // Use testid for form interactions
    await user.type(screen.getByTestId('email-input'), 'user@example.com')
    await user.type(screen.getByTestId('password-input'), 'password123')
    await user.click(screen.getByTestId('submit-button'))
    
    // Use testid for assertions
    expect(screen.getByTestId('success-message')).toBeInTheDocument()
  })
  
  it('should show error for invalid email', async () => {
    render(<LoginForm />)
    
    await user.type(screen.getByTestId('email-input'), 'invalid-email')
    await user.click(screen.getByTestId('submit-button'))
    
    expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email format')
  })
})

// ❌ INCORRECT: Fragile selectors
describe('LoginForm', () => {
  it('should submit form', async () => {
    render(<LoginForm />)
    
    // Fragile - breaks if label text changes
    await user.type(screen.getByLabelText('Email Address'), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    
    // Fragile - breaks if button text changes
    await user.click(screen.getByText('Submit Form'))
    
    // Fragile - breaks if success message changes
    expect(screen.getByText('Login successful!')).toBeInTheDocument()
  })
})
```

## 🎨 TestId Naming Conventions

### Format: `{component}-{element}-{action?}`

```tsx
// Form elements
data-testid="email-input"
data-testid="password-input"
data-testid="submit-button"
data-testid="cancel-button"

// Status elements
data-testid="loading-spinner"
data-testid="error-message"
data-testid="success-message"

// Navigation elements
data-testid="next-button"
data-testid="previous-button"
data-testid="close-modal"

// Content elements
data-testid="user-profile"
data-testid="organization-card"
data-testid="progress-indicator"

// Interactive elements
data-testid="dropdown-menu"
data-testid="search-input"
data-testid="filter-button"
```

### Component-Specific Prefixes

```tsx
// Onboarding components
data-testid="onboarding-wizard"
data-testid="onboarding-step-1"
data-testid="onboarding-progress"
data-testid="onboarding-next-button"

// Organization components
data-testid="org-setup-form"
data-testid="org-name-input"
data-testid="org-template-card"

// Team components
data-testid="team-invitation-form"
data-testid="team-member-card"
data-testid="invite-button"
```

## 🔧 Migration Strategy

### Phase 1: Critical Components (Immediate)
- [ ] OnboardingWizard components
- [ ] OrganizationSetupWizard
- [ ] TeamInvitationManager
- [ ] ProgressIndicator

### Phase 2: Form Components (Next)
- [ ] All form inputs and buttons
- [ ] Modal dialogs and overlays
- [ ] Navigation elements

### Phase 3: Content Components (Later)
- [ ] Display components
- [ ] Card components
- [ ] List items

## 📝 Test File Standards

### File Structure
```typescript
describe('ComponentName', () => {
  // Setup and utilities at the top
  const renderComponent = (props = {}) => {
    return render(<ComponentName {...defaultProps} {...props} />)
  }
  
  beforeEach(() => {
    // Reset mocks and state
  })
  
  describe('Rendering', () => {
    it('should render component with required elements', () => {
      renderComponent()
      
      expect(screen.getByTestId('component-container')).toBeInTheDocument()
      expect(screen.getByTestId('component-title')).toBeInTheDocument()
    })
  })
  
  describe('User Interactions', () => {
    it('should handle button click', async () => {
      const mockHandler = vi.fn()
      renderComponent({ onSubmit: mockHandler })
      
      await user.click(screen.getByTestId('submit-button'))
      
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('Error States', () => {
    it('should display error message', () => {
      renderComponent({ error: 'Something went wrong' })
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('Something went wrong')
    })
  })
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderComponent()
      
      expect(screen.getByTestId('submit-button')).toHaveAttribute('aria-label')
    })
  })
})
```

### Test Utilities
```typescript
// test-utils.tsx
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  ...overrides
})

export const createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  ...overrides
})

// Custom render with providers
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider>
        {children}
      </ClerkProvider>
    </QueryClientProvider>
  )
  
  return render(ui, { wrapper: Wrapper, ...options })
}
```

## 🚀 Implementation Checklist

### For Each Component:
- [ ] Add `data-testid` to all interactive elements
- [ ] Add `data-testid` to all assertion targets
- [ ] Update existing tests to use testid selectors
- [ ] Remove fragile selectors (getByLabelText, etc.)
- [ ] Add accessibility tests with proper ARIA attributes
- [ ] Ensure tests are isolated and don't depend on each other

### For Each Test File:
- [ ] Use consistent testid naming conventions
- [ ] Group tests by functionality (Rendering, Interactions, Errors, Accessibility)
- [ ] Use setup utilities for common test scenarios
- [ ] Mock external dependencies properly
- [ ] Test both success and error states
- [ ] Include performance assertions where relevant

## 📊 Quality Gates

### Test Requirements:
- **100% of interactive elements** must have testid attributes
- **Zero usage** of getByLabelText in new tests
- **All tests** must use explicit selectors (testid, role, or exact text)
- **Test isolation** - each test must run independently
- **Accessibility coverage** - ARIA attributes and keyboard navigation tested

### Code Review Checklist:
- [ ] All new components have testid attributes
- [ ] Tests use robust selectors
- [ ] No fragile selectors introduced
- [ ] Test coverage includes error states
- [ ] Accessibility requirements met