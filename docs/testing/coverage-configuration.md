# Coverage Configuration & Enforcement

This document details the comprehensive code coverage configuration implemented in the C9D AI platform, including tiered coverage requirements, reporting formats, and enforcement mechanisms.

## Overview

The project uses Vitest with V8 coverage provider to ensure comprehensive test coverage across all critical code paths. Coverage requirements are tiered based on code criticality, with the most critical business logic requiring 100% coverage.

## Coverage Configuration

### Vitest Configuration

The coverage configuration is defined in `apps/web/vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
  reportsDirectory: './coverage',
  
  // Comprehensive exclusions
  exclude: [
    'node_modules/**',
    '__tests__/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/*.config.{ts,js}',
    '**/coverage/**',
    '**/.next/**',
    '**/dist/**',
    '**/*.d.ts',
    'vitest.setup.ts',
    'next.config.js',
    'tailwind.config.js',
    'postcss.config.js',
    'demo-*.{ts,tsx,html}',
    '**/examples/**',
    '**/fixtures/**',
    '**/mocks/**'
  ],
  
  // Explicit inclusions
  include: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}'
  ],
  
  // Tiered coverage thresholds
  thresholds: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'lib/services/**': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'lib/models/**': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'app/api/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  skipFull: false,
  all: true
}
```

## Coverage Tiers

### Tier 1: Critical Business Logic (100% Coverage)

**Path**: `lib/services/**`

**Requirements**:
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%
- **Statements**: 100%

**Rationale**: Services contain core business logic that directly impacts user experience and data integrity. Any untested code path could lead to critical failures.

**Examples**:
- User authentication and authorization
- Data validation and transformation
- External API integrations
- Payment processing
- Security-critical operations

### Tier 2: Data Layer (95% Coverage)

**Path**: `lib/models/**`

**Requirements**:
- **Branches**: 95%
- **Functions**: 95%
- **Lines**: 95%
- **Statements**: 95%

**Rationale**: Models handle data transformation and database interactions. High coverage ensures data integrity and prevents corruption.

**Examples**:
- Database schema definitions
- Data transformers and serializers
- Type validation functions
- Database query builders

### Tier 3: External Interfaces (90% Coverage)

**Path**: `app/api/**`

**Requirements**:
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%
- **Statements**: 90%

**Rationale**: API routes are external interfaces that must be reliable. High coverage ensures proper error handling and response formatting.

**Examples**:
- REST API endpoints
- GraphQL resolvers
- Webhook handlers
- Authentication endpoints

### Tier 4: Global Minimum (85% Coverage)

**Path**: All other included files

**Requirements**:
- **Branches**: 85%
- **Functions**: 85%
- **Lines**: 85%
- **Statements**: 85%

**Rationale**: General application code should have good coverage while allowing some flexibility for UI components and utility functions.

**Examples**:
- React components
- Custom hooks
- Utility functions
- Configuration files

## Coverage Metrics Explained

### Branches
Measures whether each branch of conditional statements (if/else, switch, ternary) has been executed.

```typescript
// Both branches must be tested for 100% branch coverage
function validateUser(user: User) {
  if (user.email) {  // Branch 1: truthy
    return true
  } else {           // Branch 2: falsy
    return false
  }
}
```

### Functions
Measures whether each function has been called during tests.

```typescript
// All functions must be called for 100% function coverage
export class UserService {
  static async getById(id: string) { /* ... */ }     // Must be tested
  static async create(data: UserData) { /* ... */ }  // Must be tested
  static async update(id: string, data: Partial<UserData>) { /* ... */ } // Must be tested
}
```

### Lines
Measures whether each executable line of code has been executed.

```typescript
function processUser(user: User) {
  const validated = validateUser(user)  // Line 1: Must be executed
  if (validated) {                      // Line 2: Must be executed
    return saveUser(user)               // Line 3: Must be executed
  }
  throw new Error('Invalid user')       // Line 4: Must be executed
}
```

### Statements
Measures whether each statement has been executed (similar to lines but more granular).

## Coverage Reports

### Report Formats

#### 1. Console Output (text)
Real-time coverage summary displayed during test execution:

```
 % Coverage report from v8
-----------------------|---------|----------|---------|---------|-------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|----------|---------|---------|-------------------
All files              |   87.5  |    85.2  |   89.1  |   87.8  |
 lib/services          |  100.0  |   100.0  |  100.0  |  100.0  |
 lib/models            |   95.2  |    94.8  |   95.5  |   95.1  |
 app/api               |   91.3  |    89.7  |   92.1  |   91.0  |
 components            |   85.8  |    83.2  |   87.4  |   85.9  |
-----------------------|---------|----------|---------|---------|-------------------
```

#### 2. HTML Report (html)
Interactive web-based report at `./coverage/index.html`:

- **File Explorer**: Navigate through project structure
- **Line-by-Line**: See exactly which lines are covered
- **Branch Visualization**: Visual indicators for branch coverage
- **Search and Filter**: Find specific files or functions
- **Coverage Heatmap**: Color-coded coverage indicators

#### 3. JSON Report (json)
Machine-readable coverage data at `./coverage/coverage.json`:

```json
{
  "total": {
    "lines": { "total": 1000, "covered": 875, "pct": 87.5 },
    "functions": { "total": 200, "covered": 178, "pct": 89.0 },
    "statements": { "total": 1200, "covered": 1050, "pct": 87.5 },
    "branches": { "total": 300, "covered": 255, "pct": 85.0 }
  },
  "files": {
    "lib/services/user-service.ts": {
      "lines": { "total": 50, "covered": 50, "pct": 100 },
      "functions": { "total": 10, "covered": 10, "pct": 100 },
      "statements": { "total": 60, "covered": 60, "pct": 100 },
      "branches": { "total": 15, "covered": 15, "pct": 100 }
    }
  }
}
```

#### 4. LCOV Report (lcov)
Industry-standard format at `./coverage/lcov.info` for CI/CD integration:

```
TN:
SF:lib/services/user-service.ts
FN:10,getUserById
FN:25,createUser
FNDA:5,getUserById
FNDA:3,createUser
FNF:2
FNH:2
LF:20
LH:20
BRF:8
BRH:8
end_of_record
```

#### 5. JSON Summary (json-summary)
Quick statistics at `./coverage/coverage-summary.json`:

```json
{
  "total": {
    "lines": { "pct": 87.5 },
    "statements": { "pct": 87.5 },
    "functions": { "pct": 89.0 },
    "branches": { "pct": 85.0 }
  }
}
```

### Test Results Reports

Additional test execution reports are generated in `./test-results/`:

#### JSON Results (`./test-results/results.json`)
Detailed test execution data including:
- Test suite results
- Individual test outcomes
- Execution times
- Error details
- Performance metrics

#### HTML Results (`./test-results/index.html`)
Interactive test results dashboard with:
- Test suite navigation
- Failure analysis
- Performance charts
- Coverage integration

## Coverage Exclusions

### Rationale for Exclusions

#### Build and Configuration Files
```
**/*.config.{ts,js}
next.config.js
tailwind.config.js
postcss.config.js
```
**Reason**: Configuration files contain static settings and build instructions, not business logic.

#### Build Outputs
```
**/.next/**
**/dist/**
**/coverage/**
```
**Reason**: Generated files should not be included in coverage analysis.

#### Test Infrastructure
```
__tests__/**
**/*.test.{ts,tsx}
**/*.spec.{ts,tsx}
**/fixtures/**
**/mocks/**
vitest.setup.ts
```
**Reason**: Test files and test utilities should not be included in coverage metrics.

#### Development Files
```
demo-*.{ts,tsx,html}
**/examples/**
**/*.d.ts
```
**Reason**: Demo files, examples, and type definitions are not production code.

### Explicit Inclusions

Only the following directories are included in coverage analysis:

```
app/**/*.{ts,tsx}      # Next.js app directory (API routes, pages)
components/**/*.{ts,tsx} # React components
lib/**/*.{ts,tsx}      # Core business logic
hooks/**/*.{ts,tsx}    # Custom React hooks
```

## Enforcement Mechanisms

### Build-Time Enforcement

Coverage thresholds are enforced during the build process:

```bash
# Coverage validation in CI/CD
pnpm test:coverage
# Exits with code 1 if thresholds not met
```

### Pre-Commit Hooks

Coverage validation runs before commits:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm test:coverage"
    }
  }
}
```

### CI/CD Pipeline Integration

GitHub Actions workflow enforces coverage:

```yaml
- name: Run tests with coverage
  run: pnpm test:coverage
  
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
    fail_ci_if_error: true
```

### Quality Gates

Different enforcement levels based on module criticality:

#### Critical Modules (Services)
- **Enforcement**: Build fails if coverage < 100%
- **Action**: Must fix before merge
- **Notification**: Immediate failure notification

#### Important Modules (Models, APIs)
- **Enforcement**: Build fails if coverage < threshold
- **Action**: Must address before merge
- **Notification**: Coverage report in PR

#### General Code
- **Enforcement**: Warning if coverage < 85%
- **Action**: Encouraged to improve
- **Notification**: Coverage trend tracking

## Best Practices

### Writing Testable Code

#### 1. Single Responsibility
```typescript
// Good: Single responsibility, easy to test
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Avoid: Multiple responsibilities, harder to test
function processUser(userData: any) {
  // Validation, transformation, saving all in one function
}
```

#### 2. Dependency Injection
```typescript
// Good: Dependencies injected, easy to mock
class UserService {
  constructor(private db: Database, private logger: Logger) {}
  
  async getUser(id: string) {
    this.logger.info(`Fetching user ${id}`)
    return this.db.users.findById(id)
  }
}

// Avoid: Hard dependencies, difficult to test
class UserService {
  async getUser(id: string) {
    console.log(`Fetching user ${id}`) // Hard to test
    return database.users.findById(id) // Hard to mock
  }
}
```

#### 3. Pure Functions
```typescript
// Good: Pure function, predictable testing
function calculateTax(amount: number, rate: number): number {
  return amount * rate
}

// Avoid: Side effects, unpredictable testing
function calculateTax(amount: number): number {
  const rate = getCurrentTaxRate() // External dependency
  logCalculation(amount, rate)    // Side effect
  return amount * rate
}
```

### Achieving High Coverage

#### 1. Test All Branches
```typescript
// Function with multiple branches
function getUserStatus(user: User): string {
  if (!user.email) return 'incomplete'
  if (!user.verified) return 'unverified'
  if (user.suspended) return 'suspended'
  return 'active'
}

// Test all branches
describe('getUserStatus', () => {
  it('returns incomplete for user without email', () => {
    expect(getUserStatus({ email: '' })).toBe('incomplete')
  })
  
  it('returns unverified for user with unverified email', () => {
    expect(getUserStatus({ email: 'test@example.com', verified: false })).toBe('unverified')
  })
  
  it('returns suspended for suspended user', () => {
    expect(getUserStatus({ email: 'test@example.com', verified: true, suspended: true })).toBe('suspended')
  })
  
  it('returns active for normal user', () => {
    expect(getUserStatus({ email: 'test@example.com', verified: true, suspended: false })).toBe('active')
  })
})
```

#### 2. Test Error Paths
```typescript
// Service method with error handling
async function createUser(userData: UserData): Promise<User> {
  try {
    const validated = validateUserData(userData)
    return await database.users.create(validated)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new BadRequestError('Invalid user data')
    }
    throw new InternalServerError('Failed to create user')
  }
}

// Test both success and error paths
describe('createUser', () => {
  it('creates user with valid data', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' }
    const result = await createUser(userData)
    expect(result).toHaveProperty('id')
  })
  
  it('throws BadRequestError for invalid data', async () => {
    const invalidData = { email: 'invalid' }
    await expect(createUser(invalidData)).rejects.toThrow(BadRequestError)
  })
  
  it('throws InternalServerError for database failures', async () => {
    mockDatabase.users.create.mockRejectedValue(new Error('DB Error'))
    await expect(createUser(validData)).rejects.toThrow(InternalServerError)
  })
})
```

#### 3. Test Async Operations
```typescript
// Async function with multiple outcomes
async function fetchUserData(id: string): Promise<UserData | null> {
  try {
    const response = await api.get(`/users/${id}`)
    return response.data
  } catch (error) {
    if (error.status === 404) {
      return null
    }
    throw error
  }
}

// Test all async paths
describe('fetchUserData', () => {
  it('returns user data when found', async () => {
    mockApi.get.mockResolvedValue({ data: { id: '1', name: 'Test' } })
    const result = await fetchUserData('1')
    expect(result).toEqual({ id: '1', name: 'Test' })
  })
  
  it('returns null when user not found', async () => {
    mockApi.get.mockRejectedValue({ status: 404 })
    const result = await fetchUserData('999')
    expect(result).toBeNull()
  })
  
  it('throws error for other failures', async () => {
    mockApi.get.mockRejectedValue({ status: 500 })
    await expect(fetchUserData('1')).rejects.toThrow()
  })
})
```

## Monitoring and Reporting

### Coverage Trends

Track coverage trends over time:

```bash
# Generate coverage report with timestamp
pnpm test:coverage --reporter=json > coverage-$(date +%Y%m%d).json

# Compare coverage between branches
git checkout main && pnpm test:coverage --reporter=json-summary > main-coverage.json
git checkout feature-branch && pnpm test:coverage --reporter=json-summary > feature-coverage.json
```

### Coverage Badges

Add coverage badges to README:

```markdown
[![Coverage](https://img.shields.io/codecov/c/github/username/repo)](https://codecov.io/gh/username/repo)
```

### Automated Reporting

Set up automated coverage reporting:

```yaml
# .github/workflows/coverage.yml
name: Coverage Report
on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      
      - name: Upload to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          
      - name: Comment PR
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          recreate: true
          path: coverage/coverage-summary.json
```

## Troubleshooting

### Common Coverage Issues

#### 1. Uncovered Lines in Conditional Logic
```typescript
// Problem: Ternary operator not fully covered
const status = user.active ? 'active' : 'inactive'

// Solution: Test both conditions
it('returns active for active user', () => {
  expect(getStatus({ active: true })).toBe('active')
})

it('returns inactive for inactive user', () => {
  expect(getStatus({ active: false })).toBe('inactive')
})
```

#### 2. Uncovered Error Handling
```typescript
// Problem: Catch block not covered
try {
  await riskyOperation()
} catch (error) {
  logger.error(error) // Not covered
  throw error
}

// Solution: Test error scenarios
it('logs and rethrows errors', async () => {
  mockRiskyOperation.mockRejectedValue(new Error('Test error'))
  await expect(myFunction()).rejects.toThrow('Test error')
  expect(mockLogger.error).toHaveBeenCalled()
})
```

#### 3. Uncovered Default Cases
```typescript
// Problem: Default case not covered
switch (userType) {
  case 'admin': return 'Administrator'
  case 'user': return 'User'
  default: return 'Unknown' // Not covered
}

// Solution: Test default case
it('returns Unknown for unrecognized user type', () => {
  expect(getUserTypeLabel('invalid')).toBe('Unknown')
})
```

### Coverage Debugging

#### 1. Identify Uncovered Code
```bash
# Generate detailed HTML report
pnpm test:coverage

# Open coverage report
open coverage/index.html

# Look for red (uncovered) lines
```

#### 2. Analyze Coverage Data
```bash
# Generate JSON report for analysis
pnpm test:coverage --reporter=json

# Use jq to analyze specific files
cat coverage/coverage.json | jq '.["lib/services/user-service.ts"]'
```

#### 3. Debug Test Execution
```bash
# Run tests with verbose output
pnpm test --reporter=verbose

# Run specific test file
pnpm test user-service.test.ts

# Debug with Node.js inspector
node --inspect-brk node_modules/.bin/vitest run
```

## Conclusion

The comprehensive coverage configuration ensures code quality and reliability across the C9D AI platform. By implementing tiered coverage requirements, multiple reporting formats, and robust enforcement mechanisms, we maintain high standards while providing flexibility for different types of code.

Key benefits:
- **Risk Mitigation**: Critical business logic is fully tested
- **Quality Assurance**: Consistent coverage standards across the codebase
- **Developer Experience**: Clear feedback and actionable reports
- **CI/CD Integration**: Automated enforcement and reporting
- **Continuous Improvement**: Trend tracking and optimization opportunities

For questions or issues with coverage configuration, refer to the [Testing Standards](./comprehensive-test-guide.md) or create an issue in the project repository.