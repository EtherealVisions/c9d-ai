# Test Commands Reference

This document provides a comprehensive reference for all test commands available in the C9D AI platform, following our testing standards and quality assurance guidelines.

## Overview

The C9D AI platform follows strict testing standards that ensure:
- **100% Test Success Rate**: All tests must pass without skips or failures
- **Graceful Termination**: Tests complete and exit with proper exit codes
- **No Manual Intervention**: Tests never require Ctrl+C to terminate
- **CI/CD Compatibility**: All commands work in automated environments

## Command Standards

### Default Behavior Rules

1. **Default Test Command**: `pnpm test` MUST run tests once and exit (no watch mode)
2. **Explicit Watch Mode**: Watch mode only available through `pnpm test:dev` or `pnpm test:watch`
3. **Graceful Termination**: Tests must complete with proper exit codes
4. **No Manual Intervention**: Never require Ctrl+C to terminate

## Available Test Commands

### Core Test Commands

#### `pnpm test`
**Default test command - runs tests once and exits**

```bash
pnpm test
```

- **Behavior**: Runs all tests once using `vitest run`
- **Exit**: Automatically exits after completion
- **Use Case**: Default testing, CI/CD pipelines
- **Output**: Test results with pass/fail status

#### `pnpm test:run`
**Explicit run mode - same as default but explicit**

```bash
pnpm test:run
```

- **Behavior**: Identical to `pnpm test`
- **Exit**: Automatically exits after completion
- **Use Case**: When you want to be explicit about run-once behavior
- **Output**: Test results with pass/fail status

#### `pnpm test:dev`
**Watch mode for development**

```bash
pnpm test:dev
```

- **Behavior**: Runs tests in watch mode using `vitest --watch`
- **Exit**: Continues running, watches for file changes
- **Use Case**: Active development, debugging tests
- **Output**: Interactive test runner with file watching

#### `pnpm test:watch`
**Alternative watch mode command**

```bash
pnpm test:watch
```

- **Behavior**: Identical to `pnpm test:dev`
- **Exit**: Continues running, watches for file changes
- **Use Case**: Alternative syntax for watch mode
- **Output**: Interactive test runner with file watching

### Specialized Test Commands

#### `pnpm test:unit`
**Run unit tests only**

```bash
pnpm test:unit
```

- **Behavior**: Runs only unit tests matching `**/*.test.{ts,tsx}`
- **Exit**: Automatically exits after completion
- **Use Case**: Testing individual components and functions
- **Output**: Unit test results only

#### `pnpm test:integration`
**Run integration tests only**

```bash
pnpm test:integration
```

- **Behavior**: Runs tests in `__tests__/integration/**/*.test.{ts,tsx}`
- **Exit**: Automatically exits after completion
- **Use Case**: Testing service interactions and API endpoints
- **Output**: Integration test results only

#### `pnpm test:e2e`
**Run end-to-end tests**

```bash
pnpm test:e2e
```

- **Behavior**: Runs tests in `__tests__/e2e/**/*.test.{ts,tsx}`
- **Exit**: Automatically exits after completion
- **Use Case**: Testing complete user workflows
- **Output**: E2E test results only

#### `pnpm test:performance`
**Run performance tests**

```bash
pnpm test:performance
```

- **Behavior**: Runs tests in `__tests__/performance/**/*.test.{ts,tsx}`
- **Exit**: Automatically exits after completion
- **Use Case**: Testing performance benchmarks and load handling
- **Output**: Performance metrics and benchmark results

#### `pnpm test:coverage`
**Run tests with coverage reporting**

```bash
pnpm test:coverage
```

- **Behavior**: Runs all tests with coverage analysis using `vitest run --coverage`
- **Exit**: Automatically exits after completion
- **Use Case**: Code coverage analysis, CI/CD quality gates
- **Output**: Test results plus comprehensive coverage report

**Coverage Output Formats:**
- **Console**: Real-time coverage summary
- **HTML Report**: Interactive coverage report at `./coverage/index.html`
- **JSON**: Machine-readable data at `./coverage/coverage.json`
- **LCOV**: CI/CD integration format at `./coverage/lcov.info`
- **JSON Summary**: Quick stats at `./coverage/coverage-summary.json`

**Coverage Thresholds:**
- **Global Minimum**: 85% (branches, functions, lines, statements)
- **Services**: 100% coverage required (critical business logic)
- **Models**: 95% coverage required (data layer)
- **API Routes**: 90% coverage required (external interfaces)

#### `pnpm test:ui`
**Run tests with UI interface**

```bash
pnpm test:ui
```

- **Behavior**: Opens Vitest UI in browser for interactive testing
- **Exit**: Continues running until manually stopped
- **Use Case**: Visual test debugging and exploration
- **Output**: Web-based test interface

### Workspace-Specific Commands

#### `pnpm test --filter=@c9d/web`
**Run tests for specific workspace**

```bash
pnpm test --filter=@c9d/web
```

- **Behavior**: Runs tests only for the web application
- **Exit**: Automatically exits after completion
- **Use Case**: Testing specific packages in monorepo
- **Output**: Test results for specified workspace only

#### `pnpm test --filter="./apps/*"`
**Run tests for all apps**

```bash
pnpm test --filter="./apps/*"
```

- **Behavior**: Runs tests for all applications in the apps directory
- **Exit**: Automatically exits after completion
- **Use Case**: Testing all applications without packages
- **Output**: Test results for all apps

### Quality Validation Commands

#### `pnpm validate:quick`
**Quick quality validation**

```bash
pnpm validate:quick
```

- **Behavior**: Runs TypeScript compilation check and linting
- **Exit**: Automatically exits after completion
- **Use Case**: Fast pre-commit validation
- **Output**: TypeScript errors and linting issues

#### `pnpm validate:full`
**Full quality validation**

```bash
pnpm validate:full
```

- **Behavior**: Runs typecheck + lint + test:coverage + build
- **Exit**: Automatically exits after completion
- **Use Case**: Complete pre-merge validation
- **Output**: Comprehensive quality report

#### `pnpm validate:coverage`
**Coverage validation with detailed reporting**

```bash
pnpm validate:coverage
```

- **Behavior**: Runs tests with coverage and generates detailed analysis
- **Exit**: Automatically exits after completion
- **Use Case**: Coverage-focused validation
- **Output**: Test results plus detailed coverage analysis and recommendations

#### `pnpm validate:task-completion`
**Complete task validation with quality gates**

```bash
pnpm validate:task-completion
```

- **Behavior**: Runs comprehensive validation including all quality gates
- **Exit**: Automatically exits after completion (blocks if validation fails)
- **Use Case**: Task completion validation before marking work as done
- **Output**: Complete validation report with pass/fail status for all quality gates

### Coverage Analysis Commands

#### `pnpm coverage:report`
**Generate detailed coverage analysis**

```bash
pnpm coverage:report
```

- **Behavior**: Analyzes existing coverage data and provides actionable recommendations
- **Exit**: Automatically exits after completion
- **Use Case**: Understanding coverage gaps and improvement opportunities
- **Output**: Detailed coverage analysis with module-specific recommendations

#### `pnpm coverage:open`
**Open interactive HTML coverage report**

```bash
pnpm coverage:open
```

- **Behavior**: Opens the HTML coverage report in default browser
- **Exit**: Command exits, browser remains open
- **Use Case**: Visual exploration of coverage data
- **Output**: Interactive web-based coverage visualization

#### `pnpm coverage:json`
**Generate JSON coverage report**

```bash
pnpm coverage:json
```

- **Behavior**: Generates machine-readable JSON coverage data
- **Exit**: Automatically exits after completion
- **Use Case**: CI/CD integration and automated analysis
- **Output**: JSON coverage data at `./coverage/coverage.json`

#### `pnpm coverage:lcov`
**Generate LCOV coverage report**

```bash
pnpm coverage:lcov
```

- **Behavior**: Generates LCOV format coverage data
- **Exit**: Automatically exits after completion
- **Use Case**: Integration with external coverage tools and services
- **Output**: LCOV coverage data at `./coverage/lcov.info`

### Code Quality Commands

#### `pnpm format`
**Format code with Prettier**

```bash
pnpm format
```

- **Behavior**: Formats all code files using Prettier configuration
- **Exit**: Automatically exits after completion
- **Use Case**: Code formatting before commits
- **Output**: Formatted files (modifies files in place)

#### `pnpm format:check`
**Check code formatting**

```bash
pnpm format:check
```

- **Behavior**: Checks if code is properly formatted without modifying files
- **Exit**: Automatically exits after completion (non-zero exit if formatting issues found)
- **Use Case**: CI/CD formatting validation
- **Output**: List of files that need formatting

### Advanced Test Commands

#### `pnpm test:comprehensive`
**Run comprehensive test suite**

```bash
pnpm test:comprehensive
```

- **Behavior**: Executes custom test runner with full validation
- **Exit**: Automatically exits after completion
- **Use Case**: Complete system validation
- **Output**: Comprehensive test report

#### `pnpm test:real-integration`
**Run real integration tests**

```bash
pnpm test:real-integration
```

- **Behavior**: Runs integration tests against real services
- **Exit**: Automatically exits after completion
- **Use Case**: Testing with actual external dependencies
- **Output**: Real integration test results

## Usage Examples

### Development Workflow

```bash
# Start development with tests watching
pnpm test:dev

# In another terminal, make changes to code
# Tests will automatically re-run on file changes

# Quick validation during development
pnpm validate:quick

# When ready to commit, run full validation
pnpm validate:full

# Check coverage with detailed analysis
pnpm validate:coverage
```

### Task Completion Workflow

```bash
# Before marking any task as complete, run comprehensive validation
pnpm validate:task-completion

# This command validates:
# - TypeScript compilation (zero errors)
# - Code linting (zero errors/warnings)
# - Test success (100% pass rate)
# - Coverage thresholds (module-specific requirements)
# - Build success (production build)
# - Code quality standards

# If validation fails, address issues and re-run
pnpm validate:task-completion
```

### CI/CD Pipeline

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run comprehensive validation (replaces individual commands)
pnpm validate:full

# Alternative: Run individual commands
pnpm typecheck              # Type checking
pnpm lint                   # Code linting
pnpm test:coverage          # Tests with coverage
pnpm build                  # Production build

# Generate coverage reports for external tools
pnpm coverage:lcov          # For Codecov, Coveralls, etc.
pnpm coverage:json          # For custom analysis tools
```

### Pre-Commit Workflow

```bash
# Quick pre-commit validation
pnpm validate:quick

# Format code if needed
pnpm format

# Full pre-commit validation
pnpm validate:full

# Check coverage impact
pnpm validate:coverage
```

### Debugging Tests

```bash
# Run specific test file
pnpm test user-service.test.ts

# Run tests with UI for debugging
pnpm test:ui

# Run tests in watch mode for active debugging
pnpm test:dev

# Run only unit tests to isolate issues
pnpm test:unit
```

### Performance Validation

```bash
# Run performance benchmarks
pnpm test:performance

# Run load tests
pnpm test:integration

# Check for memory leaks
pnpm test:performance -- --reporter=verbose
```

## Test Configuration

### Vitest Configuration

The test commands use Vitest with comprehensive configuration for coverage, parallel execution, and reporting:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    
    // Coverage configuration
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
        // Critical modules require 100% coverage
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
    },
    
    // Parallel execution settings
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    
    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    maxConcurrency: 4,
    
    // Enhanced reporting
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    }
  }
})
```

### Package.json Scripts

The test and validation commands are defined in `apps/web/package.json`:

```json
{
  "scripts": {
    // Core test commands
    "test": "vitest run",
    "test:run": "vitest run",
    "test:dev": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:unit": "vitest run **/*.test.{ts,tsx}",
    "test:integration": "vitest run __tests__/integration/**/*.test.{ts,tsx}",
    "test:e2e": "vitest run __tests__/e2e/**/*.test.{ts,tsx}",
    "test:performance": "vitest run __tests__/performance/**/*.test.{ts,tsx}",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    
    // Quality validation commands
    "validate:quick": "pnpm typecheck && pnpm lint",
    "validate:full": "pnpm typecheck && pnpm lint && pnpm test:coverage && pnpm build",
    "validate:coverage": "pnpm test:coverage && pnpm coverage:report",
    "validate:task-completion": "node ../../scripts/validate-task-completion.js",
    
    // Coverage analysis commands
    "coverage:report": "node ../../scripts/coverage-reporter.js",
    "coverage:open": "open coverage/index.html",
    "coverage:json": "vitest run --coverage --reporter=json",
    "coverage:lcov": "vitest run --coverage --reporter=lcov",
    
    // Code quality commands
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  }
}
```

## Quality Gates

Before any task or feature is considered complete, it MUST pass all quality gates:

1. **100% Test Success Rate**: All tests must pass without skips or failures
2. **Coverage Requirements**: Minimum 90% code coverage for new code
3. **No Regression**: Existing functionality must remain unaffected
4. **Performance Standards**: Tests must complete within defined time limits
5. **Clean State**: No test artifacts or data pollution after execution

## Troubleshooting

### Common Issues

#### Tests Not Terminating
```bash
# ❌ INCORRECT: This would run in watch mode
vitest

# ✅ CORRECT: This runs once and exits
vitest run
```

#### Watch Mode Not Working
```bash
# ❌ INCORRECT: Default command should not watch
pnpm test

# ✅ CORRECT: Explicit watch mode
pnpm test:dev
```

#### Coverage Not Generated
```bash
# ❌ INCORRECT: Missing coverage flag
pnpm test

# ✅ CORRECT: Explicit coverage command
pnpm test:coverage
```

### Debugging Commands

```bash
# Debug test execution
pnpm test --reporter=verbose

# Debug specific test file
pnpm test user-service.test.ts --reporter=verbose

# Debug with UI
pnpm test:ui

# Debug in watch mode
pnpm test:dev
```

## Best Practices

1. **Use Validation Commands**: Always use `pnpm validate:full` for comprehensive validation
2. **Task Completion**: Use `pnpm validate:task-completion` before marking any task as complete
3. **Quick Feedback**: Use `pnpm validate:quick` during development for fast feedback
4. **Explicit Watch Mode**: Use `pnpm test:dev` when you need file watching
5. **Specific Test Types**: Use specialized commands (`test:unit`, `test:integration`) for focused testing
6. **Coverage Analysis**: Use `pnpm validate:coverage` for detailed coverage insights
7. **Code Formatting**: Use `pnpm format` before committing to ensure consistent style
8. **Performance Validation**: Run `pnpm test:performance` for performance-critical changes

### Quality Gate Enforcement

**CRITICAL**: No task or feature is considered complete unless it passes all quality gates:

```bash
# This command MUST pass before task completion
pnpm validate:task-completion

# Quality gates include:
# ✅ TypeScript compilation (zero errors)
# ✅ Code linting (zero errors/warnings)  
# ✅ Test success (100% pass rate)
# ✅ Coverage thresholds (module-specific requirements)
# ✅ Build success (production build)
# ✅ Code formatting (consistent style)
```

### Command Selection Guide

| Use Case | Command | When to Use |
|----------|---------|-------------|
| Quick development check | `pnpm validate:quick` | During active development |
| Pre-commit validation | `pnpm validate:full` | Before committing changes |
| Task completion | `pnpm validate:task-completion` | Before marking work complete |
| Coverage analysis | `pnpm validate:coverage` | Understanding coverage gaps |
| Watch mode development | `pnpm test:dev` | Active test-driven development |
| CI/CD pipeline | `pnpm validate:full` | Automated quality gates |
| Debugging tests | `pnpm test:ui` | Visual test debugging |
| Performance testing | `pnpm test:performance` | Performance-critical changes |

## Integration with Turbo

All test commands work seamlessly with Turbo's monorepo orchestration:

```bash
# Run tests across all workspaces
pnpm test

# Run tests for specific workspace
pnpm test --filter=@c9d/web

# Run tests in parallel
pnpm test --parallel

# Run tests with concurrency limits
pnpm test --concurrency=4
```

This ensures efficient test execution across the entire monorepo while maintaining isolation and reliability.