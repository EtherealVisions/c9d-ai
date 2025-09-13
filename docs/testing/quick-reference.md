# Test Commands Quick Reference

## Essential Commands

| Command | Behavior | Use Case |
|---------|----------|----------|
| `pnpm test` | ✅ Runs once and exits | Default testing, CI/CD |
| `pnpm test:dev` | 🔄 Watch mode | Active development |
| `pnpm test:run` | ✅ Runs once and exits | Explicit run mode |
| `pnpm test:watch` | 🔄 Watch mode | Alternative watch syntax |

## Quality Validation Commands

| Command | Validation | Use Case |
|---------|------------|----------|
| `pnpm validate:quick` | TypeScript + Lint | Fast pre-commit check |
| `pnpm validate:full` | TypeScript + Lint + Tests + Build | Complete validation |
| `pnpm validate:coverage` | Tests + Coverage Analysis | Coverage-focused validation |
| `pnpm validate:task-completion` | All Quality Gates | **Required before task completion** |

## Specialized Commands

| Command | Target | Description |
|---------|--------|-------------|
| `pnpm test:unit` | Unit tests | Individual components/functions |
| `pnpm test:integration` | Integration tests | Service interactions |
| `pnpm test:e2e` | E2E tests | Complete user workflows |
| `pnpm test:performance` | Performance tests | Benchmarks and load testing |
| `pnpm test:coverage` | All tests + coverage | Code coverage analysis |
| `pnpm test:ui` | All tests + UI | Visual test interface |

## Coverage Analysis Commands

| Command | Output | Description |
|---------|--------|-------------|
| `pnpm coverage:report` | Detailed analysis | Actionable coverage recommendations |
| `pnpm coverage:open` | HTML report | Interactive coverage visualization |
| `pnpm coverage:json` | JSON format | Machine-readable coverage data |
| `pnpm coverage:lcov` | LCOV format | CI/CD integration format |

## Code Quality Commands

| Command | Action | Description |
|---------|--------|-------------|
| `pnpm format` | Format files | Apply Prettier formatting |
| `pnpm format:check` | Check formatting | Validate code formatting |
| `pnpm typecheck` | Type checking | TypeScript compilation check |
| `pnpm lint` | Code linting | ESLint validation |

## Workspace Commands

| Command | Scope | Description |
|---------|-------|-------------|
| `pnpm test --filter=@c9d/web` | Web app only | Test specific workspace |
| `pnpm test --filter="./apps/*"` | All apps | Test all applications |
| `pnpm test --parallel` | All workspaces | Parallel execution |

## Key Rules

### ✅ Correct Usage
- Use `pnpm test` for CI/CD and final validation
- Use `pnpm test:dev` when you need file watching
- All commands terminate gracefully (no Ctrl+C needed)

### ❌ Avoid These
- Don't use `vitest` directly (use pnpm scripts)
- Don't expect `pnpm test` to watch files (use `pnpm test:dev`)
- Don't manually terminate tests (they exit automatically)

## Quick Workflows

### Development
```bash
# Start watching tests
pnpm test:dev

# Quick validation during development
pnpm validate:quick

# Make changes...
# Tests auto-run on file changes
```

### Pre-commit
```bash
# Quick pre-commit validation
pnpm validate:quick

# Format code if needed
pnpm format

# Full pre-commit validation
pnpm validate:full
```

### Task Completion (MANDATORY)
```bash
# Before marking any task complete
pnpm validate:task-completion

# This validates ALL quality gates:
# ✅ TypeScript compilation (zero errors)
# ✅ Code linting (zero errors/warnings)
# ✅ Test success (100% pass rate)
# ✅ Coverage thresholds (module-specific)
# ✅ Build success (production build)
```

### Coverage Analysis
```bash
# Generate detailed coverage analysis
pnpm validate:coverage

# Open interactive coverage report
pnpm coverage:open

# Generate reports for CI/CD
pnpm coverage:lcov
```

### Debugging
```bash
# Visual interface
pnpm test:ui

# Specific test file
pnpm test user-service.test.ts

# Verbose output
pnpm test --reporter=verbose
```

## Standards Compliance

All commands follow our quality enforcement standards:
- **100% Test Success Rate** required
- **Graceful Termination** - no manual intervention needed
- **CI/CD Compatible** - all commands work in automated environments
- **Parallel Execution** supported for performance
- **Tiered Coverage Requirements**:
  - **Services**: 100% coverage (critical business logic)
  - **Models**: 95% coverage (data layer)
  - **API Routes**: 90% coverage (external interfaces)
  - **Global**: 85% minimum coverage

## Quality Gates (MANDATORY)

**CRITICAL**: No task is complete until `pnpm validate:task-completion` passes.

Quality gates enforce:
- Zero TypeScript compilation errors
- Zero linting errors or warnings
- 100% test success rate
- Module-specific coverage thresholds
- Successful production build
- Consistent code formatting

## Command Priority Guide

| Priority | Command | When to Use |
|----------|---------|-------------|
| 🔴 **Critical** | `pnpm validate:task-completion` | Before marking work complete |
| 🟡 **Important** | `pnpm validate:full` | Before committing changes |
| 🟢 **Regular** | `pnpm validate:quick` | During development |
| 🔵 **Optional** | `pnpm test:dev` | Active test development |

For detailed documentation, see:
- [Test Commands Reference](./test-commands.md)
- [Coverage Configuration](./coverage-configuration.md)
- [Coverage Integration Guide](./coverage-integration-guide.md)