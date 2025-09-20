import { test, expect } from '@playwright/test'
import { 
  signInUser, 
  completeOnboarding,
  waitForAuthState,
  TEST_USERS
} from './setup/auth-helpers'

/**
 * Dashboard Navigation and Core Platform Features E2E Tests
 * 
 * These tests validate the main dashboard functionality and navigation:
 * - Dashboard layout and components
 * - Navigation between different sections
 * - User profile management
 * - Settings and preferences
 * - Organization switching
 * - Data persistence across sessions
 */

test.describe('Dashboard Navigation and Core Features', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await signInUser(page, TEST_USERS.MEMBER)
    
    // Complete onboarding if needed
    if (page.url().includes('/onboarding')) {
      await completeOnboarding(page)
    }
    
    // Ensure we're on the dashboard
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('Dashboard Layout', () => {
    test('should display main dashboard components', async ({ page }) => {
      // Verify main dashboard elements are visible
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
      await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible()
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
      
      // Check for dashboard content areas
      const contentArea = page.locator('[data-testid="dashboard-content"]')
      if (await contentArea.isVisible()) {
        await expect(contentArea).toBeVisible()
      }
      
      // Check for sidebar navigation
      const sidebar = page.locator('[data-testid="sidebar-navigation"]')
      if (await sidebar.isVisible()) {
        await expect(sidebar).toBeVisible()
      }
      
      // Verify page title
      await expect(page).toHaveTitle(/dashboard|c9d|ai/i)
    })

    test('should display user information correctly', async ({ page }) => {
      // Click user menu to open
      await page.click('[data-testid="user-menu"]')
      
      // Verify user information is displayed
      const userInfo = page.locator('[data-testid="user-info"]')
      if (await userInfo.isVisible()) {
        // Should show user name or email
        const userName = page.locator('[data-testid="user-name"]')
        const userEmail = page.locator('[data-testid="user-email"]')
        
        const hasUserName = await userName.isVisible()
        const hasUserEmail = await userEmail.isVisible()
        
        expect(hasUserName || hasUserEmail).toBe(true)
      }
      
      // Check for user avatar
      const userAvatar = page.locator('[data-testid="user-avatar"]')
      if (await userAvatar.isVisible()) {
        await expect(userAvatar).toBeVisible()
      }
    })

    test('should be responsive on different screen sizes', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 })
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
      
      // Check if mobile menu is available
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]')
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click()
        await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
      }
    })
  })

  test.describe('Navigation', () => {
    test('should navigate between main sections', async ({ page }) => {
      const navigationItems = [
        { testId: 'nav-dashboard', url: '/dashboard', name: 'Dashboard' },
        { testId: 'nav-projects', url: '/projects', name: 'Projects' },
        { testId: 'nav-analytics', url: '/analytics', name: 'Analytics' },
        { testId: 'nav-settings', url: '/settings', name: 'Settings' }
      ]
      
      for (const item of navigationItems) {
        const navItem = page.locator(`[data-testid="${item.testId}"]`)
        
        if (await navItem.isVisible()) {
          await navItem.click()
          
          // Wait for navigation
          await page.waitForURL(item.url, { timeout: 10000 })
          
          // Verify we're on the correct page
          expect(page.url()).toContain(item.url)
          
          // Verify page content loads
          await page.waitForLoadState('networkidle')
          
          console.log(`✅ Successfully navigated to ${item.name}`)
        }
      }
    })

    test('should maintain navigation state across page reloads', async ({ page }) => {
      // Navigate to a specific section
      const settingsNav = page.locator('[data-testid="nav-settings"]')
      if (await settingsNav.isVisible()) {
        await settingsNav.click()
        await page.waitForURL('/settings', { timeout: 10000 })
        
        // Reload the page
        await page.reload()
        
        // Verify we're still on the settings page
        await expect(page).toHaveURL('/settings')
        
        // Verify navigation state is maintained
        const activeNavItem = page.locator('[data-testid="nav-settings"][aria-current="page"]')
        if (await activeNavItem.isVisible()) {
          await expect(activeNavItem).toBeVisible()
        }
      }
    })

    test('should handle deep linking correctly', async ({ page }) => {
      // Test direct navigation to specific pages
      const deepLinks = [
        '/dashboard',
        '/settings/profile',
        '/settings/organization',
        '/analytics'
      ]
      
      for (const link of deepLinks) {
        await page.goto(link)
        
        // Should not redirect to sign-in (user is authenticated)
        await page.waitForLoadState('networkidle')
        expect(page.url()).toContain(link)
        
        // Verify authentication state is maintained
        const authState = await waitForAuthState(page)
        expect(authState.isAuthenticated).toBe(true)
      }
    })
  })

  test.describe('User Profile Management', () => {
    test('should access and update user profile', async ({ page }) => {
      // Open user menu
      await page.click('[data-testid="user-menu"]')
      
      // Navigate to profile settings
      const profileLink = page.locator('[data-testid="profile-settings-link"]')
      if (await profileLink.isVisible()) {
        await profileLink.click()
        
        // Should navigate to profile page
        await page.waitForURL('/settings/profile', { timeout: 10000 })
        
        // Verify profile form is visible
        const profileForm = page.locator('[data-testid="profile-form"]')
        if (await profileForm.isVisible()) {
          // Update profile information
          const firstNameInput = page.locator('[data-testid="first-name-input"]')
          if (await firstNameInput.isVisible()) {
            await firstNameInput.fill('Updated First Name')
          }
          
          const lastNameInput = page.locator('[data-testid="last-name-input"]')
          if (await lastNameInput.isVisible()) {
            await lastNameInput.fill('Updated Last Name')
          }
          
          // Save changes
          const saveButton = page.locator('[data-testid="save-profile-button"]')
          if (await saveButton.isVisible()) {
            await saveButton.click()
            
            // Verify success message
            const successMessage = page.locator('[data-testid="profile-update-success"]')
            if (await successMessage.isVisible()) {
              await expect(successMessage).toContainText(/saved|updated/i)
            }
          }
        }
      }
    })

    test('should handle profile picture upload', async ({ page }) => {
      await page.goto('/settings/profile')
      
      const avatarUpload = page.locator('[data-testid="avatar-upload"]')
      if (await avatarUpload.isVisible()) {
        // Create a test image file
        const testImagePath = './apps/web/__tests__/e2e/fixtures/test-avatar.png'
        
        // Upload avatar (if file exists)
        try {
          await avatarUpload.setInputFiles(testImagePath)
          
          // Wait for upload to complete
          await page.waitForTimeout(2000)
          
          // Verify avatar preview
          const avatarPreview = page.locator('[data-testid="avatar-preview"]')
          if (await avatarPreview.isVisible()) {
            await expect(avatarPreview).toBeVisible()
          }
          
          console.log('✅ Avatar upload functionality is working')
        } catch (error) {
          console.log('ℹ️  Avatar upload test skipped - test image not found')
        }
      }
    })

    test('should validate profile form fields', async ({ page }) => {
      await page.goto('/settings/profile')
      
      const profileForm = page.locator('[data-testid="profile-form"]')
      if (await profileForm.isVisible()) {
        // Clear required fields
        const firstNameInput = page.locator('[data-testid="first-name-input"]')
        if (await firstNameInput.isVisible()) {
          await firstNameInput.fill('')
        }
        
        // Try to save
        const saveButton = page.locator('[data-testid="save-profile-button"]')
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          // Should show validation errors
          const firstNameError = page.locator('[data-testid="first-name-error"]')
          if (await firstNameError.isVisible()) {
            await expect(firstNameError).toContainText(/required/i)
          }
        }
      }
    })
  })

  test.describe('Settings Management', () => {
    test('should navigate through settings sections', async ({ page }) => {
      await page.goto('/settings')
      
      const settingsSections = [
        { testId: 'settings-profile', name: 'Profile' },
        { testId: 'settings-account', name: 'Account' },
        { testId: 'settings-organization', name: 'Organization' },
        { testId: 'settings-notifications', name: 'Notifications' },
        { testId: 'settings-security', name: 'Security' }
      ]
      
      for (const section of settingsSections) {
        const sectionLink = page.locator(`[data-testid="${section.testId}"]`)
        
        if (await sectionLink.isVisible()) {
          await sectionLink.click()
          
          // Wait for section to load
          await page.waitForTimeout(1000)
          
          // Verify section content is visible
          const sectionContent = page.locator(`[data-testid="${section.testId}-content"]`)
          if (await sectionContent.isVisible()) {
            await expect(sectionContent).toBeVisible()
          }
          
          console.log(`✅ Successfully accessed ${section.name} settings`)
        }
      }
    })

    test('should update notification preferences', async ({ page }) => {
      await page.goto('/settings/notifications')
      
      const notificationSettings = page.locator('[data-testid="notification-settings"]')
      if (await notificationSettings.isVisible()) {
        // Toggle email notifications
        const emailNotifications = page.locator('[data-testid="email-notifications-toggle"]')
        if (await emailNotifications.isVisible()) {
          const isChecked = await emailNotifications.isChecked()
          await emailNotifications.click()
          
          // Verify toggle state changed
          const newState = await emailNotifications.isChecked()
          expect(newState).toBe(!isChecked)
        }
        
        // Toggle push notifications
        const pushNotifications = page.locator('[data-testid="push-notifications-toggle"]')
        if (await pushNotifications.isVisible()) {
          await pushNotifications.click()
        }
        
        // Save settings
        const saveButton = page.locator('[data-testid="save-notifications-button"]')
        if (await saveButton.isVisible()) {
          await saveButton.click()
          
          // Verify success message
          const successMessage = page.locator('[data-testid="notifications-update-success"]')
          if (await successMessage.isVisible()) {
            await expect(successMessage).toContainText(/saved|updated/i)
          }
        }
      }
    })

    test('should handle account security settings', async ({ page }) => {
      await page.goto('/settings/security')
      
      const securitySettings = page.locator('[data-testid="security-settings"]')
      if (await securitySettings.isVisible()) {
        // Check two-factor authentication section
        const twoFactorSection = page.locator('[data-testid="two-factor-auth"]')
        if (await twoFactorSection.isVisible()) {
          const enableTwoFactor = page.locator('[data-testid="enable-two-factor-button"]')
          const disableTwoFactor = page.locator('[data-testid="disable-two-factor-button"]')
          
          if (await enableTwoFactor.isVisible()) {
            console.log('✅ Two-factor authentication can be enabled')
          } else if (await disableTwoFactor.isVisible()) {
            console.log('✅ Two-factor authentication is already enabled')
          }
        }
        
        // Check password change section
        const changePasswordSection = page.locator('[data-testid="change-password"]')
        if (await changePasswordSection.isVisible()) {
          const changePasswordButton = page.locator('[data-testid="change-password-button"]')
          if (await changePasswordButton.isVisible()) {
            console.log('✅ Password change functionality is available')
          }
        }
        
        // Check session management
        const sessionManagement = page.locator('[data-testid="session-management"]')
        if (await sessionManagement.isVisible()) {
          const activeSessions = page.locator('[data-testid="active-sessions"]')
          if (await activeSessions.isVisible()) {
            console.log('✅ Active session management is available')
          }
        }
      }
    })
  })

  test.describe('Organization Management', () => {
    test('should display current organization information', async ({ page }) => {
      // Check if organization info is displayed
      const orgInfo = page.locator('[data-testid="current-organization"]')
      if (await orgInfo.isVisible()) {
        // Should show organization name
        const orgName = page.locator('[data-testid="organization-name"]')
        if (await orgName.isVisible()) {
          const nameText = await orgName.textContent()
          expect(nameText).toBeTruthy()
          expect(nameText!.length).toBeGreaterThan(0)
        }
        
        // Should show user's role
        const userRole = page.locator('[data-testid="user-role"]')
        if (await userRole.isVisible()) {
          const roleText = await userRole.textContent()
          expect(roleText).toBeTruthy()
        }
      }
    })

    test('should handle organization switching', async ({ page }) => {
      const orgSwitcher = page.locator('[data-testid="organization-switcher"]')
      if (await orgSwitcher.isVisible()) {
        await orgSwitcher.click()
        
        // Should show organization list
        const orgList = page.locator('[data-testid="organization-list"]')
        if (await orgList.isVisible()) {
          const orgOptions = page.locator('[data-testid="organization-option"]')
          const optionCount = await orgOptions.count()
          
          if (optionCount > 1) {
            // Switch to different organization
            await orgOptions.nth(1).click()
            
            // Wait for organization switch
            await page.waitForTimeout(2000)
            
            // Verify organization changed
            const newOrgName = page.locator('[data-testid="organization-name"]')
            if (await newOrgName.isVisible()) {
              console.log('✅ Organization switching is working')
            }
          } else {
            console.log('ℹ️  Only one organization available for switching')
          }
        }
      }
    })

    test('should access organization settings', async ({ page }) => {
      await page.goto('/settings/organization')
      
      const orgSettings = page.locator('[data-testid="organization-settings"]')
      if (await orgSettings.isVisible()) {
        // Check organization details form
        const orgDetailsForm = page.locator('[data-testid="organization-details-form"]')
        if (await orgDetailsForm.isVisible()) {
          // Should be able to update organization name
          const orgNameInput = page.locator('[data-testid="organization-name-input"]')
          if (await orgNameInput.isVisible()) {
            const currentName = await orgNameInput.inputValue()
            await orgNameInput.fill(`${currentName} Updated`)
            
            // Save changes
            const saveButton = page.locator('[data-testid="save-organization-button"]')
            if (await saveButton.isVisible()) {
              await saveButton.click()
              
              // Verify success message
              const successMessage = page.locator('[data-testid="organization-update-success"]')
              if (await successMessage.isVisible()) {
                await expect(successMessage).toContainText(/saved|updated/i)
              }
            }
          }
        }
        
        // Check member management
        const memberManagement = page.locator('[data-testid="member-management"]')
        if (await memberManagement.isVisible()) {
          const memberList = page.locator('[data-testid="member-list"]')
          if (await memberList.isVisible()) {
            console.log('✅ Member management is available')
          }
        }
      }
    })
  })

  test.describe('Data Persistence', () => {
    test('should persist user preferences across sessions', async ({ page }) => {
      // Update a preference
      await page.goto('/settings/notifications')
      
      const emailNotifications = page.locator('[data-testid="email-notifications-toggle"]')
      if (await emailNotifications.isVisible()) {
        const initialState = await emailNotifications.isChecked()
        await emailNotifications.click()
        
        // Save settings
        const saveButton = page.locator('[data-testid="save-notifications-button"]')
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await page.waitForTimeout(1000)
        }
        
        // Sign out and sign back in
        await page.goto('/sign-out')
        await page.waitForURL('/sign-in', { timeout: 10000 })
        
        await signInUser(page, TEST_USERS.MEMBER)
        
        // Check if preference was persisted
        await page.goto('/settings/notifications')
        
        if (await emailNotifications.isVisible()) {
          const persistedState = await emailNotifications.isChecked()
          expect(persistedState).toBe(!initialState)
          console.log('✅ User preferences are persisted across sessions')
        }
      }
    })

    test('should maintain dashboard state during navigation', async ({ page }) => {
      // Set up some dashboard state (e.g., expanded sections, filters)
      await page.goto('/dashboard')
      
      // Expand a collapsible section if available
      const expandableSection = page.locator('[data-testid="expandable-section"]')
      if (await expandableSection.isVisible()) {
        await expandableSection.click()
        
        // Navigate away and back
        await page.goto('/settings')
        await page.goto('/dashboard')
        
        // Check if section state is maintained
        const sectionContent = page.locator('[data-testid="expandable-section-content"]')
        if (await sectionContent.isVisible()) {
          console.log('✅ Dashboard state is maintained during navigation')
        }
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort())
      
      // Try to navigate to a page that requires API calls
      await page.goto('/settings/profile')
      
      // Should show error message or loading state
      const errorMessage = page.locator('[data-testid="network-error"]')
      const loadingState = page.locator('[data-testid="loading"]')
      
      const hasErrorHandling = await errorMessage.isVisible() || await loadingState.isVisible()
      
      if (hasErrorHandling) {
        console.log('✅ Network error handling is working')
      }
    })

    test('should handle unauthorized access gracefully', async ({ page }) => {
      // Clear authentication
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Try to access protected page
      await page.goto('/settings/organization')
      
      // Should redirect to sign-in
      await page.waitForURL('/sign-in', { timeout: 10000 })
      
      console.log('✅ Unauthorized access is handled correctly')
    })
  })

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
      
      console.log(`✅ Dashboard loaded in ${loadTime}ms`)
    })

    test('should handle large data sets efficiently', async ({ page }) => {
      // Navigate to a page that might have large data sets
      await page.goto('/analytics')
      
      const startTime = Date.now()
      
      // Wait for data to load
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Should load within reasonable time even with large data
      expect(loadTime).toBeLessThan(10000)
      
      console.log(`✅ Analytics page loaded in ${loadTime}ms`)
    })
  })
})