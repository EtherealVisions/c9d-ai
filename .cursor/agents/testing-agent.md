# Testing Agent

## Purpose

This agent specializes in creating and maintaining comprehensive test suites for the Coordinated.App application, ensuring all common flows work correctly across desktop and mobile platforms.

## Testing Strategy

### Testing Pyramid

```
         ╱╲
        ╱E2E╲       ← 10% - Critical user journeys
       ╱Tests╲
      ╱────────╲
     ╱Integration╲   ← 30% - API & component integration
    ╱    Tests    ╲
   ╱────────────────╲
  ╱   Unit Tests     ╲ ← 60% - Business logic & utilities
 ╱────────────────────╲
```

## Test Structure

### Directory Layout

```
v0-swim-instructor/
├── tests/
│   ├── e2e/                      # Playwright E2E tests
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── signup.spec.ts
│   │   │   └── sso.spec.ts
│   │   ├── booking/
│   │   │   ├── search.spec.ts
│   │   │   ├── booking.spec.ts
│   │   │   └── payment.spec.ts
│   │   ├── fixtures/
│   │   │   ├── users.json
│   │   │   └── test-data.ts
│   │   └── helpers/
│   │       ├── auth.helper.ts
│   │       └── db.helper.ts
│   ├── integration/              # API integration tests
│   │   ├── api/
│   │   └── db/
│   └── unit/                     # Unit tests
│       ├── components/
│       ├── hooks/
│       └── utils/
├── playwright.config.ts
├── jest.config.js
└── vitest.config.ts
```

## E2E Test Templates

### Authentication Flow Test

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { DashboardPage } from "../pages/dashboard.page";

test.describe("Authentication Flow", () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    // Arrange
    const testUser = {
      email: "parent@test.com",
      password: "TestPassword123!",
    };

    // Act
    await loginPage.fillEmail(testUser.email);
    await loginPage.fillPassword(testUser.password);
    await loginPage.submit();

    // Assert
    await expect(page).toHaveURL("/parent/dashboard");
    await expect(dashboardPage.welcomeMessage).toBeVisible();
    await expect(dashboardPage.welcomeMessage).toContainText("Welcome back");
  });

  test("invalid credentials show error message", async ({ page }) => {
    // Arrange
    const invalidUser = {
      email: "wrong@test.com",
      password: "wrongpassword",
    };

    // Act
    await loginPage.fillEmail(invalidUser.email);
    await loginPage.fillPassword(invalidUser.password);
    await loginPage.submit();

    // Assert
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText("Invalid email or password");
    await expect(page).toHaveURL("/login");
  });

  test("SSO login works correctly", async ({ page, context }) => {
    // Mock OAuth response
    await context.route("**/oauth/authorize", (route) => {
      route.fulfill({
        status: 302,
        headers: {
          Location: "/sso-callback?code=mock-auth-code",
        },
      });
    });

    // Act
    await loginPage.clickGoogleSSO();

    // Assert
    await page.waitForURL("/parent/dashboard");
    await expect(dashboardPage.welcomeMessage).toBeVisible();
  });
});

test.describe("Mobile Authentication", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("mobile login form is responsive", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Check mobile-specific styling
    await expect(loginPage.form).toHaveCSS("padding", "16px");
    await expect(loginPage.submitButton).toHaveCSS("width", "100%");

    // Test touch interactions
    await loginPage.emailInput.tap();
    await expect(loginPage.emailInput).toBeFocused();
  });
});
```

### Page Object Model

```typescript
// tests/e2e/pages/login.page.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly googleSSOButton: Locator;
  readonly errorMessage: Locator;
  readonly form: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign In" });
    this.googleSSOButton = page.getByRole("button", { name: "Continue with Google" });
    this.errorMessage = page.getByRole("alert");
    this.form = page.getByRole("form");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async clickGoogleSSO() {
    await this.googleSSOButton.click();
  }
}
```

### Booking Flow Test

```typescript
// tests/e2e/booking/booking.spec.ts
import { test, expect } from "@playwright/test";
import { authenticateUser } from "../helpers/auth.helper";
import { createTestInstructor } from "../helpers/db.helper";

test.describe("Booking Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create test data and authenticate
    await createTestInstructor({
      name: "John Instructor",
      specialty: "Beginner Swimming",
      location: "Test City",
    });
    await authenticateUser(page, "parent");
  });

  test("complete booking flow", async ({ page }) => {
    // 1. Search for instructors
    await page.goto("/parent/find-instructor");
    await page.getByPlaceholder("Enter location").fill("Test City");
    await page.getByRole("button", { name: "Search" }).click();

    // 2. Select instructor
    const instructorCard = page.getByTestId("instructor-card").first();
    await expect(instructorCard).toContainText("John Instructor");
    await instructorCard.getByRole("button", { name: "View Profile" }).click();

    // 3. Check availability
    await expect(page).toHaveURL(/\/instructor\/[\w-]+/);
    await page.getByRole("button", { name: "Check Availability" }).click();

    // 4. Select time slot
    const calendar = page.getByTestId("availability-calendar");
    await calendar.getByRole("button", { name: "15" }).click(); // Select 15th
    await page.getByRole("button", { name: "2:00 PM" }).click();

    // 5. Confirm booking
    await page.getByRole("button", { name: "Book Session" }).click();

    // 6. Fill booking details
    await page.getByLabel("Child").selectOption("Emma (Age 6)");
    await page.getByLabel("Session Type").selectOption("Individual");
    await page.getByLabel("Special Notes").fill("First time swimmer");

    // 7. Payment
    await page.getByRole("button", { name: "Proceed to Payment" }).click();

    // Mock Stripe payment
    await page
      .frameLocator('iframe[name="stripe"]')
      .getByLabel("Card number")
      .fill("4242 4242 4242 4242");
    await page.frameLocator('iframe[name="stripe"]').getByLabel("Expiry").fill("12/25");
    await page.frameLocator('iframe[name="stripe"]').getByLabel("CVC").fill("123");

    await page.getByRole("button", { name: "Pay $50" }).click();

    // 8. Verify confirmation
    await expect(page).toHaveURL("/booking/confirmation");
    await expect(page.getByRole("heading")).toContainText("Booking Confirmed!");
    await expect(page.getByTestId("booking-details")).toContainText("John Instructor");
    await expect(page.getByTestId("booking-details")).toContainText("2:00 PM");
  });

  test("booking validation errors", async ({ page }) => {
    await page.goto("/booking/new");

    // Try to submit without required fields
    await page.getByRole("button", { name: "Book Session" }).click();

    // Check validation messages
    await expect(page.getByText("Please select a child")).toBeVisible();
    await expect(page.getByText("Please select a time slot")).toBeVisible();
  });
});

test.describe("Mobile Booking", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
  });

  test("mobile calendar is touch-friendly", async ({ page }) => {
    await authenticateUser(page, "parent");
    await page.goto("/instructor/john-doe");

    const calendar = page.getByTestId("availability-calendar");

    // Test swipe navigation
    await calendar.swipe({ direction: "left" });
    await expect(calendar).toContainText("Next Month");

    // Test touch selection
    const dateCell = calendar.getByRole("button", { name: "15" });
    await dateCell.tap();
    await expect(dateCell).toHaveClass(/selected/);

    // Verify mobile-optimized layout
    await expect(calendar).toHaveCSS("display", "grid");
    await expect(dateCell).toHaveCSS("min-height", "44px");
  });
});
```

### Cross-Browser Testing

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Desktop browsers
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile browsers
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    // Tablet
    {
      name: "iPad",
      use: { ...devices["iPad Pro"] },
    },
  ],

  webServer: {
    command: "pnpm dev:test",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Helpers

### Authentication Helper

```typescript
// tests/e2e/helpers/auth.helper.ts
import { Page } from "@playwright/test";

export async function authenticateUser(page: Page, role: "parent" | "instructor" | "admin") {
  // Set auth cookie directly for faster tests
  const authToken = await generateTestToken(role);

  await page.context().addCookies([
    {
      name: "__session",
      value: authToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Verify authentication
  await page.goto(`/${role}/dashboard`);
  await page.waitForSelector('[data-testid="user-menu"]');
}

async function generateTestToken(role: string): Promise<string> {
  // In real implementation, this would use Clerk's testing tokens
  return `test-token-${role}`;
}
```

### Database Helper

```typescript
// tests/e2e/helpers/db.helper.ts
import { prisma } from "@/lib/db";

export async function createTestInstructor(data: {
  name: string;
  specialty: string;
  location: string;
}) {
  const user = await prisma.user.create({
    data: {
      email: `${data.name.toLowerCase().replace(" ", ".")}@test.com`,
      role: "INSTRUCTOR",
      onboardingComplete: true,
      instructorProfile: {
        create: {
          firstName: data.name.split(" ")[0],
          lastName: data.name.split(" ")[1],
          bio: "Test instructor bio",
          hourlyRate: 50,
          specialties: [data.specialty],
          location: data.location,
        },
      },
    },
  });

  return user;
}

export async function cleanupTestData() {
  // Clean up in correct order to respect foreign keys
  await prisma.booking.deleteMany({ where: { user: { email: { endsWith: "@test.com" } } } });
  await prisma.instructorProfile.deleteMany({
    where: { user: { email: { endsWith: "@test.com" } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: "@test.com" } } });
}
```

## Visual Regression Testing

### Setup Percy

```yaml
# .github/workflows/visual-tests.yml
name: Visual Tests
on: [push, pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: pnpm install

      - name: Run visual tests
        run: pnpm percy exec -- pnpm test:e2e
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

### Visual Test Example

```typescript
// tests/e2e/visual/homepage.spec.ts
import { test, expect } from "@playwright/test";
import percySnapshot from "@percy/playwright";

test.describe("Visual Regression", () => {
  test("homepage appearance", async ({ page }) => {
    await page.goto("/");

    // Wait for dynamic content
    await page.waitForSelector('[data-testid="hero-section"]');

    // Take Percy snapshot
    await percySnapshot(page, "Homepage");
  });

  test("responsive homepage", async ({ page }) => {
    await page.goto("/");

    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await percySnapshot(page, "Homepage - Desktop");

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await percySnapshot(page, "Homepage - Tablet");

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await percySnapshot(page, "Homepage - Mobile");
  });
});
```

## Performance Testing

### Lighthouse CI

```yaml
# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm build && pnpm start',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/parent/dashboard',
        'http://localhost:3000/find-instructor'
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

## Accessibility Testing

### Axe Integration

```typescript
// tests/e2e/a11y/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("homepage has no accessibility violations", async ({ page }) => {
    await page.goto("/");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("forms are accessible", async ({ page }) => {
    await page.goto("/login");

    // Check form labels
    const emailInput = page.getByRole("textbox", { name: "Email" });
    await expect(emailInput).toHaveAttribute("aria-required", "true");

    // Check error messages
    await page.getByRole("button", { name: "Sign In" }).click();
    const errorMessage = page.getByRole("alert");
    await expect(errorMessage).toHaveAttribute("aria-live", "polite");

    // Run axe scan
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("keyboard navigation works", async ({ page }) => {
    await page.goto("/");

    // Tab through navigation
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAttribute("href", "/");

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveText("Find Instructor");

    // Activate with Enter
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/find-instructor");
  });
});
```

## Test Data Management

### Fixtures

```typescript
// tests/e2e/fixtures/users.ts
export const testUsers = {
  parent: {
    email: "parent@example.com",
    password: "TestParent123!",
    firstName: "Sarah",
    lastName: "Johnson",
    children: [
      { name: "Emma", dateOfBirth: "2017-05-15", skillLevel: "beginner" },
      { name: "Liam", dateOfBirth: "2019-08-22", skillLevel: "none" },
    ],
  },
  instructor: {
    email: "instructor@example.com",
    password: "TestInstructor123!",
    firstName: "John",
    lastName: "Smith",
    certifications: ["Red Cross WSI", "CPR/AED"],
    hourlyRate: 75,
    bio: "Experienced swim instructor with 10 years of teaching.",
  },
  admin: {
    email: "admin@example.com",
    password: "TestAdmin123!",
    firstName: "Admin",
    lastName: "User",
  },
};
```

### Seed Script

```typescript
// tests/e2e/fixtures/seed.ts
import { PrismaClient } from "@prisma/client";
import { testUsers } from "./users";

const prisma = new PrismaClient();

export async function seedTestData() {
  // Clear existing test data
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@example.com" } },
  });

  // Create test users
  for (const [role, userData] of Object.entries(testUsers)) {
    await prisma.user.create({
      data: {
        email: userData.email,
        role: role.toUpperCase(),
        onboardingComplete: true,
        // Add profile data based on role
      },
    });
  }
}

export async function teardownTestData() {
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@example.com" } },
  });
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Setup test database
        run: |
          pnpm db:push
          pnpm db:seed:test

      - name: Install Playwright
        run: pnpm playwright install --with-deps ${{ matrix.browser }}

      - name: Run E2E tests
        run: pnpm test:e2e --project=${{ matrix.browser }}
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.TEST_CLERK_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
          retention-days: 30
```

## Test Reporting

### Custom Reporter

```typescript
// tests/e2e/reporters/slack-reporter.ts
import { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

export default class SlackReporter implements Reporter {
  private failed = 0;
  private passed = 0;

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === "passed") {
      this.passed++;
    } else if (result.status === "failed") {
      this.failed++;
    }
  }

  async onEnd() {
    const message = {
      text: `Test Run Complete`,
      attachments: [
        {
          color: this.failed > 0 ? "danger" : "good",
          fields: [
            { title: "Passed", value: this.passed.toString(), short: true },
            { title: "Failed", value: this.failed.toString(), short: true },
          ],
        },
      ],
    };

    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: "POST",
      body: JSON.stringify(message),
    });
  }
}
```

## Mobile-Specific Testing

### Touch Gestures

```typescript
// tests/e2e/mobile/gestures.spec.ts
test("swipe to delete booking", async ({ page }) => {
  await page.goto("/parent/bookings");

  const bookingItem = page.getByTestId("booking-item").first();

  // Swipe left to reveal delete button
  await bookingItem.swipe({ direction: "left", distance: 100 });

  // Delete button should be visible
  const deleteButton = bookingItem.getByRole("button", { name: "Delete" });
  await expect(deleteButton).toBeVisible();

  await deleteButton.tap();

  // Confirm deletion
  await page.getByRole("button", { name: "Confirm" }).tap();

  // Booking should be removed
  await expect(bookingItem).not.toBeVisible();
});
```

### Device Emulation

```typescript
// tests/e2e/devices/device-tests.spec.ts
import { devices } from "@playwright/test";

const mobileDevices = ["iPhone 12", "iPhone SE", "Pixel 5", "Galaxy S21"];

for (const deviceName of mobileDevices) {
  test.describe(`${deviceName} tests`, () => {
    test.use({ ...devices[deviceName] });

    test("responsive navigation menu", async ({ page }) => {
      await page.goto("/");

      // Mobile menu should be visible
      const mobileMenu = page.getByTestId("mobile-menu-button");
      await expect(mobileMenu).toBeVisible();

      // Desktop menu should be hidden
      const desktopMenu = page.getByTestId("desktop-menu");
      await expect(desktopMenu).not.toBeVisible();

      // Open mobile menu
      await mobileMenu.tap();
      const drawer = page.getByTestId("mobile-drawer");
      await expect(drawer).toBeVisible();
    });
  });
}
```

## Test Utilities

### Custom Commands

```typescript
// tests/e2e/support/commands.ts
import { Page } from "@playwright/test";

declare module "@playwright/test" {
  interface Page {
    loginAs(role: "parent" | "instructor" | "admin"): Promise<void>;
    waitForAppReady(): Promise<void>;
    mockStripePayment(): Promise<void>;
  }
}

// Extend Page with custom methods
export async function extendPage(page: Page) {
  page.loginAs = async (role) => {
    await authenticateUser(page, role);
  };

  page.waitForAppReady = async () => {
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-app-ready="true"]');
  };

  page.mockStripePayment = async () => {
    await page.addInitScript(() => {
      window.Stripe = () => ({
        createToken: () => Promise.resolve({ token: { id: "tok_visa" } }),
        elements: () => ({
          create: () => ({ mount: () => {}, on: () => {} }),
        }),
      });
    });
  };
}
```
