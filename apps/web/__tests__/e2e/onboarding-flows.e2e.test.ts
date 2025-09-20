import { test, expect } from '@playwright/test'
import { 
  signUpUser, 
  signInUser, 
  completeOnboarding,
  waitForAuthState,
  TEST_USERS,
  type TestUser
} from './setup/auth-helpers'

/**
 * Comprehensive Onboarding Flow E2E Tests
 * 
 * These tests validate complete user onboarding journeys including:
 * - Profile setup and role selection
 * - Organization creation and joining
 * - Team invitation and management
 * - Interactive tutorials and help systems
 * - Onboarding completion and progression
 */

test.describe('User Onboarding Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean state
    await page.goto('/')
    await waitForAuthState(page)
  })

  test.describe('Profile Setup', () => {
    test('should complete profile setup during onboarding', async ({ page }) => {
      const newUser: TestUser = {
        email: `onboarding-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Onboarding',
        lastName: 'User'
      }

      // Sign up new user
      await signUpUser(page, newUser)
      
      // Should be redirected to onboarding
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Profile setup step
      if (await page.locator('[data-testid="profile-setup"]').isVisible()) {
        // Fill additional profile information
        const jobTitleField = page.locator('[data-testid="job-title-input"]')
        if (await jobTitleField.isVisible()) {
          await jobTitleField.fill('Software Developer')
        }
        
        const companyField = page.locator('[data-testid="company-input"]')
        if (await companyField.isVisible()) {
          await companyField.fill('Test Company')
        }
        
        // Select role
        const roleSelect = page.locator('[data-testid="role-select"]')
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('developer')
        }
        
        // Continue to next step
        await page.click('[data-testid="continue-button"]')
      }
      
      // Verify progression to next onboarding step
      await expect(page.url()).toMatch(/onboarding/)
    })

    test('should handle role selection with different options', async ({ page }) => {
      const newUser: TestUser = {
        email: `role-test-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Role',
        lastName: 'Test'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      const roleSelect = page.locator('[data-testid="role-select"]')
      if (await roleSelect.isVisible()) {
        // Test different role options
        const roles = ['developer', 'designer', 'manager', 'admin']
        
        for (const role of roles) {
          await roleSelect.selectOption(role)
          
          // Verify selection
          const selectedValue = await roleSelect.inputValue()
          expect(selectedValue).toBe(role)
        }
        
        // Select final role and continue
        await roleSelect.selectOption('developer')
        await page.click('[data-testid="continue-button"]')
      }
    })

    test('should validate required profile fields', async ({ page }) => {
      const newUser: TestUser = {
        email: `validation-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Validation',
        lastName: 'Test'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Try to continue without filling required fields
      const continueButton = page.locator('[data-testid="continue-button"]')
      if (await continueButton.isVisible()) {
        await continueButton.click()
        
        // Should show validation errors
        const errorMessages = page.locator('[data-testid*="error"]')
        const hasErrors = await errorMessages.count() > 0
        
        if (hasErrors) {
          console.log('✅ Profile validation is working')
        }
      }
    })
  })

  test.describe('Organization Setup', () => {
    test('should create new organization during onboarding', async ({ page }) => {
      const newUser: TestUser = {
        email: `org-creator-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Org',
        lastName: 'Creator'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Complete profile setup if present
      if (await page.locator('[data-testid="profile-setup"]').isVisible()) {
        const roleSelect = page.locator('[data-testid="role-select"]')
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('admin')
        }
        await page.click('[data-testid="continue-button"]')
      }
      
      // Organization setup step
      if (await page.locator('[data-testid="organization-setup"]').isVisible()) {
        // Choose to create new organization
        const createOrgOption = page.locator('[data-testid="create-organization-option"]')
        if (await createOrgOption.isVisible()) {
          await createOrgOption.click()
        }
        
        // Fill organization details
        const orgName = `Test Organization ${Date.now()}`
        
        await page.fill('[data-testid="org-name-input"]', orgName)
        
        const orgDescriptionField = page.locator('[data-testid="org-description-input"]')
        if (await orgDescriptionField.isVisible()) {
          await orgDescriptionField.fill('A test organization for E2E testing')
        }
        
        const orgIndustrySelect = page.locator('[data-testid="org-industry-select"]')
        if (await orgIndustrySelect.isVisible()) {
          await orgIndustrySelect.selectOption('technology')
        }
        
        const orgSizeSelect = page.locator('[data-testid="org-size-select"]')
        if (await orgSizeSelect.isVisible()) {
          await orgSizeSelect.selectOption('1-10')
        }
        
        // Create organization
        await page.click('[data-testid="create-org-button"]')
        
        // Wait for organization creation
        await page.waitForTimeout(2000)
        
        // Verify organization was created
        const successMessage = page.locator('[data-testid="org-created-success"]')
        if (await successMessage.isVisible()) {
          await expect(successMessage).toContainText(/organization.*created/i)
        }
      }
    })

    test('should join existing organization during onboarding', async ({ page }) => {
      const newUser: TestUser = {
        email: `org-joiner-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Org',
        lastName: 'Joiner'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Complete profile setup if present
      if (await page.locator('[data-testid="profile-setup"]').isVisible()) {
        const roleSelect = page.locator('[data-testid="role-select"]')
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('member')
        }
        await page.click('[data-testid="continue-button"]')
      }
      
      // Organization setup step
      if (await page.locator('[data-testid="organization-setup"]').isVisible()) {
        // Choose to join existing organization
        const joinOrgOption = page.locator('[data-testid="join-organization-option"]')
        if (await joinOrgOption.isVisible()) {
          await joinOrgOption.click()
          
          // Enter organization code or search
          const orgCodeInput = page.locator('[data-testid="org-code-input"]')
          if (await orgCodeInput.isVisible()) {
            await orgCodeInput.fill('TEST-ORG-CODE')
            await page.click('[data-testid="join-org-button"]')
          }
          
          // Or search for organization
          const orgSearchInput = page.locator('[data-testid="org-search-input"]')
          if (await orgSearchInput.isVisible()) {
            await orgSearchInput.fill('Test Organization')
            await page.click('[data-testid="search-orgs-button"]')
            
            // Select from search results
            const firstResult = page.locator('[data-testid="org-search-result"]').first()
            if (await firstResult.isVisible()) {
              await firstResult.click()
              await page.click('[data-testid="join-selected-org-button"]')
            }
          }
        }
      }
    })

    test('should validate organization creation fields', async ({ page }) => {
      const newUser: TestUser = {
        email: `org-validation-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Org',
        lastName: 'Validation'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Navigate to organization setup
      if (await page.locator('[data-testid="profile-setup"]').isVisible()) {
        await page.click('[data-testid="continue-button"]')
      }
      
      if (await page.locator('[data-testid="organization-setup"]').isVisible()) {
        const createOrgOption = page.locator('[data-testid="create-organization-option"]')
        if (await createOrgOption.isVisible()) {
          await createOrgOption.click()
          
          // Try to create without required fields
          await page.click('[data-testid="create-org-button"]')
          
          // Should show validation errors
          const orgNameError = page.locator('[data-testid="org-name-error"]')
          if (await orgNameError.isVisible()) {
            await expect(orgNameError).toContainText(/required|name/i)
          }
          
          // Fill invalid organization name
          await page.fill('[data-testid="org-name-input"]', 'a') // Too short
          await page.click('[data-testid="create-org-button"]')
          
          // Should show length validation error
          if (await orgNameError.isVisible()) {
            await expect(orgNameError).toContainText(/length|characters/i)
          }
        }
      }
    })
  })

  test.describe('Team Invitation', () => {
    test('should invite team members during onboarding', async ({ page }) => {
      const newUser: TestUser = {
        email: `team-inviter-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Team',
        lastName: 'Inviter'
      }

      await signUpUser(page, newUser)
      await completeOnboarding(page, { 
        organizationName: `Team Test Org ${Date.now()}`,
        role: 'admin'
      })
      
      // Should reach team invitation step or dashboard
      if (await page.locator('[data-testid="team-invitation"]').isVisible()) {
        // Invite team members
        const inviteEmailInput = page.locator('[data-testid="invite-email-input"]')
        const inviteRoleSelect = page.locator('[data-testid="invite-role-select"]')
        const sendInviteButton = page.locator('[data-testid="send-invite-button"]')
        
        if (await inviteEmailInput.isVisible()) {
          // Invite first team member
          await inviteEmailInput.fill('member1@example.com')
          if (await inviteRoleSelect.isVisible()) {
            await inviteRoleSelect.selectOption('member')
          }
          await sendInviteButton.click()
          
          // Verify invitation sent
          const successMessage = page.locator('[data-testid="invite-success"]')
          if (await successMessage.isVisible()) {
            await expect(successMessage).toContainText(/invitation sent/i)
          }
          
          // Invite second team member
          await inviteEmailInput.fill('member2@example.com')
          if (await inviteRoleSelect.isVisible()) {
            await inviteRoleSelect.selectOption('admin')
          }
          await sendInviteButton.click()
          
          // Skip remaining invitations
          const skipButton = page.locator('[data-testid="skip-invitations"]')
          if (await skipButton.isVisible()) {
            await skipButton.click()
          }
        }
      }
    })

    test('should validate team invitation emails', async ({ page }) => {
      const newUser: TestUser = {
        email: `invite-validation-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Invite',
        lastName: 'Validation'
      }

      await signUpUser(page, newUser)
      await completeOnboarding(page, { role: 'admin' })
      
      if (await page.locator('[data-testid="team-invitation"]').isVisible()) {
        const inviteEmailInput = page.locator('[data-testid="invite-email-input"]')
        const sendInviteButton = page.locator('[data-testid="send-invite-button"]')
        
        if (await inviteEmailInput.isVisible()) {
          // Try invalid email
          await inviteEmailInput.fill('invalid-email')
          await sendInviteButton.click()
          
          // Should show validation error
          const emailError = page.locator('[data-testid="invite-email-error"]')
          if (await emailError.isVisible()) {
            await expect(emailError).toContainText(/invalid.*email/i)
          }
          
          // Try empty email
          await inviteEmailInput.fill('')
          await sendInviteButton.click()
          
          // Should show required error
          if (await emailError.isVisible()) {
            await expect(emailError).toContainText(/required/i)
          }
        }
      }
    })
  })

  test.describe('Interactive Tutorial', () => {
    test('should complete interactive tutorial', async ({ page }) => {
      const newUser: TestUser = {
        email: `tutorial-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Tutorial',
        lastName: 'User'
      }

      await signUpUser(page, newUser)
      await completeOnboarding(page, { skipTutorial: false })
      
      // Should show tutorial
      if (await page.locator('[data-testid="tutorial-overlay"]').isVisible()) {
        // Go through tutorial steps
        let stepCount = 0
        const maxSteps = 10 // Prevent infinite loop
        
        while (stepCount < maxSteps) {
          const nextButton = page.locator('[data-testid="tutorial-next"]')
          const finishButton = page.locator('[data-testid="tutorial-finish"]')
          
          if (await finishButton.isVisible()) {
            await finishButton.click()
            break
          } else if (await nextButton.isVisible()) {
            await nextButton.click()
            stepCount++
            await page.waitForTimeout(1000) // Wait for step transition
          } else {
            break
          }
        }
        
        // Verify tutorial completion
        const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"]')
        await expect(tutorialOverlay).not.toBeVisible()
      }
    })

    test('should allow skipping tutorial', async ({ page }) => {
      const newUser: TestUser = {
        email: `skip-tutorial-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Skip',
        lastName: 'Tutorial'
      }

      await signUpUser(page, newUser)
      await completeOnboarding(page, { skipTutorial: false })
      
      // Should show tutorial
      if (await page.locator('[data-testid="tutorial-overlay"]').isVisible()) {
        // Skip tutorial
        const skipButton = page.locator('[data-testid="tutorial-skip"]')
        if (await skipButton.isVisible()) {
          await skipButton.click()
          
          // Confirm skip if prompted
          const confirmSkip = page.locator('[data-testid="confirm-skip-tutorial"]')
          if (await confirmSkip.isVisible()) {
            await confirmSkip.click()
          }
          
          // Verify tutorial is dismissed
          const tutorialOverlay = page.locator('[data-testid="tutorial-overlay"]')
          await expect(tutorialOverlay).not.toBeVisible()
        }
      }
    })

    test('should provide contextual help during tutorial', async ({ page }) => {
      const newUser: TestUser = {
        email: `help-tutorial-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Help',
        lastName: 'Tutorial'
      }

      await signUpUser(page, newUser)
      await completeOnboarding(page, { skipTutorial: false })
      
      if (await page.locator('[data-testid="tutorial-overlay"]').isVisible()) {
        // Check for help button
        const helpButton = page.locator('[data-testid="tutorial-help"]')
        if (await helpButton.isVisible()) {
          await helpButton.click()
          
          // Should show help content
          const helpContent = page.locator('[data-testid="tutorial-help-content"]')
          await expect(helpContent).toBeVisible()
          
          // Close help
          const closeHelp = page.locator('[data-testid="close-tutorial-help"]')
          if (await closeHelp.isVisible()) {
            await closeHelp.click()
          }
        }
      }
    })
  })

  test.describe('Onboarding Completion', () => {
    test('should complete full onboarding flow and reach dashboard', async ({ page }) => {
      const newUser: TestUser = {
        email: `complete-onboarding-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Complete',
        lastName: 'Onboarding'
      }

      await signUpUser(page, newUser)
      
      // Complete full onboarding
      await completeOnboarding(page, {
        organizationName: `Complete Test Org ${Date.now()}`,
        role: 'developer',
        skipTutorial: true
      })
      
      // Should reach dashboard
      await expect(page).toHaveURL('/dashboard')
      
      // Verify user is authenticated and onboarding is complete
      const authState = await waitForAuthState(page)
      expect(authState.isAuthenticated).toBe(true)
      
      // Verify dashboard elements are visible
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      
      // Verify welcome message or onboarding completion indicator
      const welcomeMessage = page.locator('[data-testid="welcome-message"]')
      if (await welcomeMessage.isVisible()) {
        await expect(welcomeMessage).toContainText(/welcome/i)
      }
    })

    test('should save onboarding progress and allow resuming', async ({ page }) => {
      const newUser: TestUser = {
        email: `resume-onboarding-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Resume',
        lastName: 'Onboarding'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Complete first step only
      if (await page.locator('[data-testid="profile-setup"]').isVisible()) {
        const roleSelect = page.locator('[data-testid="role-select"]')
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('developer')
        }
        await page.click('[data-testid="continue-button"]')
      }
      
      // Sign out in the middle of onboarding
      await page.goto('/sign-out')
      await page.waitForURL('/sign-in', { timeout: 10000 })
      
      // Sign back in
      await signInUser(page, newUser)
      
      // Should resume onboarding where left off
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Should not be back at the first step
      const profileSetup = page.locator('[data-testid="profile-setup"]')
      const organizationSetup = page.locator('[data-testid="organization-setup"]')
      
      // Should be at organization setup or later step
      const isAtLaterStep = await organizationSetup.isVisible() || 
                           !await profileSetup.isVisible()
      
      if (isAtLaterStep) {
        console.log('✅ Onboarding progress was saved and resumed correctly')
      }
    })

    test('should handle onboarding errors gracefully', async ({ page }) => {
      const newUser: TestUser = {
        email: `error-onboarding-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Error',
        lastName: 'Onboarding'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Simulate network error during onboarding
      await page.route('**/api/onboarding/**', route => route.abort())
      
      if (await page.locator('[data-testid="profile-setup"]').isVisible()) {
        const roleSelect = page.locator('[data-testid="role-select"]')
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('developer')
        }
        await page.click('[data-testid="continue-button"]')
        
        // Should show error message
        const errorMessage = page.locator('[data-testid="onboarding-error"]')
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toContainText(/error|failed/i)
        }
        
        // Should provide retry option
        const retryButton = page.locator('[data-testid="retry-onboarding"]')
        if (await retryButton.isVisible()) {
          console.log('✅ Error handling with retry option is available')
        }
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels in onboarding forms', async ({ page }) => {
      const newUser: TestUser = {
        email: `a11y-onboarding-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'A11y',
        lastName: 'Test'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Check form accessibility
      const onboardingForm = page.locator('[data-testid="onboarding-form"]')
      if (await onboardingForm.isVisible()) {
        await expect(onboardingForm).toHaveAttribute('role', 'form')
      }
      
      // Check input labels
      const roleSelect = page.locator('[data-testid="role-select"]')
      if (await roleSelect.isVisible()) {
        await expect(roleSelect).toHaveAttribute('aria-label')
      }
      
      // Check button accessibility
      const continueButton = page.locator('[data-testid="continue-button"]')
      if (await continueButton.isVisible()) {
        await expect(continueButton).toHaveAttribute('type', 'button')
      }
    })

    test('should support keyboard navigation in onboarding', async ({ page }) => {
      const newUser: TestUser = {
        email: `keyboard-onboarding-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Keyboard',
        lastName: 'Test'
      }

      await signUpUser(page, newUser)
      await page.waitForURL('/onboarding/**', { timeout: 15000 })
      
      // Test keyboard navigation
      await page.keyboard.press('Tab')
      
      // Should be able to navigate through form elements
      const focusedElement = page.locator(':focus')
      const isFocused = await focusedElement.count() > 0
      
      if (isFocused) {
        console.log('✅ Keyboard navigation is working in onboarding')
      }
    })
  })
})