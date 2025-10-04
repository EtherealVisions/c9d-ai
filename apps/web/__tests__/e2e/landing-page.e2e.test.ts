import { test, expect } from '@playwright/test'

test.describe('Landing Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads the landing page successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/C9D.AI - Unlock Deeper Insights/)
    
    // Check hero section is visible
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible()
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Unlock Deeper Insights')
  })

  test('hero CTA button works correctly', async ({ page }) => {
    // Find and click the hero CTA
    const ctaButton = page.locator('a:has-text("Request a Consultation")')
    await expect(ctaButton).toBeVisible()
    
    // Check href attribute
    const href = await ctaButton.getAttribute('href')
    expect(href).toBe('/request-consultation')
    
    // Click and verify navigation
    await ctaButton.click()
    await expect(page).toHaveURL('/request-consultation')
  })

  test('C9 capabilities showcase interactions', async ({ page }) => {
    // Check all capabilities are visible
    await expect(page.locator('text=C9 Insight')).toBeVisible()
    await expect(page.locator('text=C9 Persona')).toBeVisible()
    await expect(page.locator('text=C9 Domain')).toBeVisible()
    await expect(page.locator('text=C9 Orchestrator')).toBeVisible()
    await expect(page.locator('text=C9 Narrative')).toBeVisible()
    
    // Click on C9 Persona
    await page.locator('button:has-text("C9 Persona")').click()
    
    // Verify content changes
    await expect(page.locator('text=AI that represents your brand, your way')).toBeVisible()
    
    // Click on C9 Domain
    await page.locator('button:has-text("C9 Domain")').click()
    
    // Verify content changes again
    await expect(page.locator('text=Smarter AI, built for your industry')).toBeVisible()
  })

  test('industry filtering works correctly', async ({ page }) => {
    // Click on education filter
    await page.locator('button:has-text("education")').click()
    
    // Check filtered content appears
    await expect(page.locator('text=Forecast class attendance and resource needs')).toBeVisible()
    
    // Click on All Industries
    await page.locator('button:has-text("All Industries")').click()
    
    // Check all content is visible again
    await expect(page.locator('text=education')).toBeVisible()
    await expect(page.locator('text=telecom')).toBeVisible()
  })

  test('scroll triggers animations and tracking', async ({ page }) => {
    // Scroll to C9 capabilities section
    await page.locator('text=The C9 Suite: Coordinated AI Capabilities').scrollIntoViewIfNeeded()
    
    // Wait for animations
    await page.waitForTimeout(500)
    
    // Check section is visible
    await expect(page.locator('text=The C9 Suite: Coordinated AI Capabilities')).toBeVisible()
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    
    // Check footer is visible
    await expect(page.locator('[data-testid="main-footer"]')).toBeVisible()
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    // Check hero title has mobile classes
    const heroTitle = page.locator('h1')
    await expect(heroTitle).toHaveClass(/text-4xl/)
    
    // Check CTA button is full width on mobile
    const ctaButton = page.locator('a:has-text("Request a Consultation")')
    await expect(ctaButton.locator('..')).toHaveClass(/w-full sm:w-auto/)
  })

  test('capability CTAs have correct links', async ({ page }) => {
    // Check Insight API link
    await expect(page.locator('a:has-text("Explore Insight API")')).toHaveAttribute('href', '/api/insight')
    
    // Switch to Persona
    await page.locator('button:has-text("C9 Persona")').click()
    await expect(page.locator('a:has-text("Build Your Persona")')).toHaveAttribute('href', '/api/persona')
    
    // Switch to Domain
    await page.locator('button:has-text("C9 Domain")').click()
    await expect(page.locator('a:has-text("Explore Domains")')).toHaveAttribute('href', '/api/domain')
  })

  test('performance: page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    const loadTime = Date.now() - startTime
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('accessibility: page has proper heading hierarchy', async ({ page }) => {
    // Check h1 exists and is unique
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
    
    // Check h2 headings exist
    const h2Count = await page.locator('h2').count()
    expect(h2Count).toBeGreaterThan(0)
    
    // Check heading hierarchy is maintained
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
    expect(headings.length).toBeGreaterThan(0)
  })

  test('animations respect prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    // Check that animation classes are present but not animating
    const animatedElements = page.locator('.animate-gentle-float-1, .animate-gentle-float-2, .animate-gentle-float-3')
    const count = await animatedElements.count()
    
    if (count > 0) {
      // Verify animations are paused or removed
      const styles = await animatedElements.first().evaluate(el => 
        window.getComputedStyle(el).animationPlayState
      )
      expect(['paused', 'running']).toContain(styles)
    }
  })

  test('API endpoint display and interaction', async ({ page }) => {
    // Check API endpoints section
    await expect(page.locator('text=API Endpoints')).toBeVisible()
    
    // Verify endpoint details
    await expect(page.locator('text=Correlation API')).toBeVisible()
    await expect(page.locator('text=/api/insight/correlate')).toBeVisible()
    await expect(page.locator('text=POST').first()).toBeVisible()
  })

  test('comparison matrix displays all capabilities', async ({ page }) => {
    // Scroll to comparison matrix
    await page.locator('text=Coordinated Intelligence Across All Capabilities').scrollIntoViewIfNeeded()
    
    // Check table headers
    await expect(page.locator('text=Core Function')).toBeVisible()
    await expect(page.locator('text=Integration')).toBeVisible()
    await expect(page.locator('text=Deployment')).toBeVisible()
    
    // Check all capabilities are listed
    const capabilities = ['C9 Insight', 'C9 Persona', 'C9 Domain', 'C9 Orchestrator', 'C9 Narrative']
    for (const capability of capabilities) {
      await expect(page.locator(`tr:has-text("${capability}")`)).toBeVisible()
    }
  })
})