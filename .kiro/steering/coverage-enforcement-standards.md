---
inclusion: always
---

# Coverage Enforcement Standards

## Overview
This document defines mandatory coverage enforcement standards based on proven methodologies from Task 3.2. These standards ensure exceptional coverage through tiered requirements that reflect code criticality and business impact.

## Core Principle: Tiered Coverage Requirements

**CRITICAL RULE**: Coverage requirements are tiered based on code criticality, not uniform across all code.

### Why Tiered Coverage?
- **Business Logic**: Critical services require 100% coverage (zero tolerance)
- **Data Layer**: Models require 95% coverage (high reliability)
- **External Interfaces**: API routes require 90% coverage (user-facing)
- **Supporting Code**: General code requires 85% minimum (quality baseline)

## Tiered Coverage Requirements (MANDATORY)

### Tier 1: Critical Business Logic (100% Required)
**Path**: `lib/services/**`
**Enforcement**: Build fails if coverage < 100%
**Rationale**: Core business logic must be fully tested

```typescript
// vitest.config.ts - Service layer enforcement
coverage: {
  thresholds: {
    'lib/services/**': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
}
```

### Tier 2: Data Layer (95% Required)
**Path**: `lib/models/**`
**Enforcement**: Build fails if coverage < 95%
**Rationale**: Data integrity is critical for application reliability

```typescript
// vitest.config.ts - Model layer enforcement
coverage: {
  thresholds: {
    'lib/models/**': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  }
}
```

### Tier 3: External Interfaces (90% Required)
**Path**: `app/api/**`
**Enforcement**: Build fails if coverage < 90%
**Rationale**: API reliability is essential for user experience

```typescript
// vitest.config.ts - API layer enforcement
coverage: {
  thresholds: {
    'app/api/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
}
```

### Tier 4: General Code (85% Required)
**Path**: All other included files
**Enforcement**: Warning if coverage < 85%
**Rationale**: Maintain overall code quality baseline

```typescript
// vitest.config.ts - Global baseline
coverage: {
  thresholds: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
}
```

## Complete Vitest Configuration (MANDATORY)

### Coverage Provider Configuration
```typescript
// vitest.config.ts - Complete coverage setup
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      
      // Tiered threshold enforcement
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
      
      // Proper exclusions
      exclude: [
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.d.ts',
        '**/dist/**',
        '**/.next/**',
        '**/middleware.ts',
        '**/instrumentation.ts'
      ]
    }
  }
})
```

## Coverage Validation Process

### Automated Enforcement
Coverage thresholds are enforced automatically during test execution:

```bash
# Coverage validation with proper memory allocation
NODE_OPTIONS="--max-old-space-size=16384" pnpm test --coverage

# Build fails automatically if thresholds not met
# No manual intervention required
```

### Coverage Reports
Multiple report formats for different use cases:

- **Text**: Console output for immediate feedback
- **JSON**: Machine-readable for CI/CD integration
- **HTML**: Detailed browser-based analysis

### Threshold Validation Examples

#### ✅ Successful Coverage Validation
```bash
# Example output when thresholds are met
✓ Coverage thresholds met:
  - lib/services/**: 100% (required: 100%)
  - lib/models/**: 96% (required: 95%)
  - app/api/**: 92% (required: 90%)
  - Global: 87% (required: 85%)
```

#### ❌ Failed Coverage Validation
```bash
# Example output when thresholds not met
✗ Coverage thresholds not met:
  - lib/services/user-service.ts: 98% (required: 100%)
  - lib/models/user.ts: 93% (required: 95%)
  
ERROR: Build failed due to insufficient coverage
```

## Coverage Achievement Strategies

### Service Layer (100% Target)
```typescript
// ✅ CORRECT: Comprehensive service testing
describe('UserService', () => {
  // Test all public methods
  describe('create', () => {
    it('should create user successfully', async () => {
      // Test success path
    })
    
    it('should handle validation errors', async () => {
      // Test error path
    })
    
    it('should handle database errors', async () => {
      // Test database failure
    })
  })
  
  // Test all edge cases and error scenarios
  // Achieve 100% branch coverage
})
```

### Model Layer (95% Target)
```typescript
// ✅ CORRECT: Model validation testing
describe('User Model', () => {
  describe('validation', () => {
    it('should validate required fields', () => {
      // Test validation logic
    })
    
    it('should handle edge cases', () => {
      // Test boundary conditions
    })
  })
  
  describe('transformations', () => {
    it('should transform data correctly', () => {
      // Test data transformations
    })
  })
})
```

### API Layer (90% Target)
```typescript
// ✅ CORRECT: API route testing
describe('/api/users', () => {
  describe('GET', () => {
    it('should return users for authenticated request', async () => {
      // Test success case
    })
    
    it('should return 401 for unauthenticated request', async () => {
      // Test auth failure
    })
    
    it('should handle server errors', async () => {
      // Test error handling
    })
  })
})
```

## Exclusion Patterns

### What to Exclude from Coverage
```typescript
// Proper exclusions in vitest.config.ts
exclude: [
  '**/__tests__/**',        // Test files themselves
  '**/__mocks__/**',        // Mock implementations
  '**/node_modules/**',     // Third-party code
  '**/*.config.*',          // Configuration files
  '**/coverage/**',         // Coverage reports
  '**/*.d.ts',             // Type definitions
  '**/dist/**',            // Build outputs
  '**/.next/**',           // Next.js build cache
  '**/middleware.ts',      // Framework middleware
  '**/instrumentation.ts'  // Framework instrumentation
]
```

### What NOT to Exclude
```typescript
// ❌ FORBIDDEN: Don't exclude business logic
// Don't add these to exclusions:
// - 'lib/services/**'     // Business logic must be covered
// - 'lib/models/**'       // Data models must be covered
// - 'app/api/**'          // API routes must be covered
// - 'components/**'       // UI components should be covered
```

## Validation and Compliance

### Pre-commit Coverage Check
```bash
#!/bin/bash
# Validate coverage before commit

echo "🔍 Running coverage validation..."

# Run coverage with proper memory allocation
NODE_OPTIONS="--max-old-space-size=16384" pnpm test --coverage

if [ $? -eq 0 ]; then
  echo "✅ Coverage thresholds met"
else
  echo "❌ Coverage thresholds not met"
  echo "Please add tests to meet coverage requirements"
  exit 1
fi
```

### CI/CD Integration
```yaml
# .github/workflows/ci.yml
- name: Run Coverage Validation
  run: |
    NODE_OPTIONS="--max-old-space-size=16384" pnpm test --coverage
  env:
    NODE_ENV: test

- name: Upload Coverage Reports
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
```

## Coverage Monitoring

### Tracking Coverage Trends
- Monitor coverage percentage over time
- Track coverage by module and tier
- Identify coverage regressions early
- Set up alerts for threshold violations

### Coverage Quality Metrics
- **Line Coverage**: Percentage of executable lines tested
- **Branch Coverage**: Percentage of code branches tested
- **Function Coverage**: Percentage of functions tested
- **Statement Coverage**: Percentage of statements tested

## Forbidden Patterns

### ❌ Never Do These
```typescript
// ❌ FORBIDDEN: Uniform coverage requirements
coverage: {
  thresholds: {
    global: { lines: 90 } // Ignores code criticality
  }
}

// ❌ FORBIDDEN: Excluding business logic
exclude: [
  'lib/services/**' // Critical code must be covered
]

// ❌ FORBIDDEN: Lowering thresholds to pass
'lib/services/**': {
  lines: 80 // Should be 100% for services
}
```

## Success Criteria

### Infrastructure Excellence
- ✅ V8 coverage provider configured
- ✅ Tiered thresholds enforced automatically
- ✅ Proper exclusions configured
- ✅ Multiple report formats generated
- ✅ CI/CD integration working

### Coverage Achievement
- ✅ Services: 100% coverage maintained
- ✅ Models: 95% coverage maintained
- ✅ API Routes: 90% coverage maintained
- ✅ Global: 85% baseline maintained
- ✅ No coverage regressions

### Developer Experience
- ✅ Clear feedback on coverage gaps
- ✅ Automated threshold enforcement
- ✅ Detailed coverage reports available
- ✅ Fast coverage collection with memory optimization

## Conclusion

These coverage enforcement standards ensure:
- **Quality Assurance**: Critical code is fully tested
- **Risk Management**: Tiered approach based on business impact
- **Automation**: Thresholds enforced without manual intervention
- **Visibility**: Clear reporting and trend monitoring
- **Scalability**: Framework ready for large codebases

**Always enforce tiered coverage requirements based on code criticality.**