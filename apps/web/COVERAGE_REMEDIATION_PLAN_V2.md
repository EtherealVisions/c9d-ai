# Coverage Remediation Plan V2 - Critical Infrastructure Repair

## Executive Summary

**Status**: 🚨 CRITICAL - 509 test failures blocking all coverage goals  
**Current Coverage**: 0.96% (Target: 85% minimum, 100% for services)  
**Priority**: IMMEDIATE ACTION REQUIRED

## Root Cause Analysis

### Primary Issues
1. **Mock Infrastructure Failure**: Supabase client mocking is fundamentally broken
2. **Import Path Issues**: Database module imports failing in tests
3. **Method Chaining Problems**: Mock methods not properly chainable
4. **Network Error Handling**: Unhandled fetch failures in services

### Impact Assessment
- **Service Layer**: 0% coverage (Required: 100%)
- **API Routes**: 0% coverage (Required: 90%)
- **Models**: 0% coverage (Required: 95%)
- **Overall**: 0.96% coverage (Required: 85%)

## Immediate Repair Strategy (Next 4 Hours)

### Phase 1: Infrastructure Repair (1 Hour)

#### 1.1 Fix Mock Infrastructure
```bash
# Replace broken mock with fixed version
cp __tests__/setup/mocks/supabase-client-fixed-v2.ts __tests__/setup/mocks/supabase-client.ts
```

#### 1.2 Update Database Import Paths
```typescript
// Fix import in all test files
// FROM: require('../../database')
// TO: import { createSupabaseClient } from '@/lib/database'
```

#### 1.3 Apply Fixed Mock Pattern
```typescript
// Use new pattern in all service tests
const testSetup = createServiceTestSetup()
vi.mocked(createSupabaseClient).mockReturnValue(testSetup.client as any)
```

### Phase 2: Service Layer Repair (2 Hours)

#### 2.1 ProgressTrackerService (Priority 1)
- **Failing Tests**: 30+
- **Action**: Apply fixed mock pattern from scaffold
- **Target**: 100% coverage

#### 2.2 PathEngine (Priority 2)
- **Failing Tests**: 15+
- **Action**: Fix error message assertions and mock setup
- **Target**: 100% coverage

#### 2.3 RoleBasedOnboardingService (Priority 3)
- **Failing Tests**: 10+
- **Action**: Fix database integration and error handling
- **Target**: 100% coverage

### Phase 3: Critical Test Additions (1 Hour)

#### 3.1 API Route Coverage
```typescript
// Add tests for critical API routes
- /api/auth/me
- /api/auth/onboarding
- /api/users
- /api/organizations
```

#### 3.2 Integration Tests
```typescript
// Add real integration tests
- Database operations
- Authentication flows
- Error handling scenarios
```

## Detailed Repair Instructions

### Step 1: Fix Mock Infrastructure

```typescript
// 1. Update all service test files with this pattern:
import { createServiceTestSetup } from '../setup/mocks/supabase-client-fixed-v2'

// 2. Replace broken mock setup:
beforeEach(async () => {
  testSetup = createServiceTestSetup()
  const { createSupabaseClient } = await import('@/lib/database')
  vi.mocked(createSupabaseClient).mockReturnValue(testSetup.client as any)
})

// 3. Use proper mock methods:
const query = testSetup.client._mocks.setupTable('table_name')
query.single.mockResolvedValue({ data: mockData, error: null })
```

### Step 2: Fix Import Issues

```bash
# Find and replace in all test files
find __tests__ -name "*.test.ts" -exec sed -i '' 's/require.*database.*createSupabaseClient/import { createSupabaseClient } from "@\/lib\/database"/g' {} \;
```

### Step 3: Apply Service Test Fixes

#### ProgressTrackerService
```typescript
// Fix method chaining issues
const progressQuery = testSetup.client._mocks.setupTable('user_progress')
progressQuery.single
  .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
  .mockResolvedValueOnce({ data: mockProgress, error: null })
```

#### PathEngine
```typescript
// Fix error assertion issues
await expect(PathEngine.generatePersonalizedPath('user-123', mockContext))
  .rejects.toThrow('Failed to generate personalized path') // Use actual error message
```

### Step 4: Add Missing API Tests

```typescript
// Create comprehensive API route tests
describe('/api/auth/me', () => {
  it('should return user data for authenticated request', async () => {
    // Test implementation
  })
  
  it('should return 401 for unauthenticated request', async () => {
    // Test implementation
  })
})
```

## Coverage Targets by Module

### Critical Modules (100% Required)
- `lib/services/progress-tracker-service.ts`
- `lib/services/path-engine.ts`
- `lib/services/onboarding-service.ts`
- `lib/services/role-based-onboarding-service.ts`

### High Priority (95% Required)
- `lib/models/database.ts`
- `lib/models/schemas.ts`
- `lib/models/transformers.ts`

### Medium Priority (90% Required)
- `app/api/auth/me/route.ts`
- `app/api/auth/onboarding/route.ts`
- `app/api/users/route.ts`
- `app/api/organizations/route.ts`

## Test Execution Plan

### Validation Commands
```bash
# 1. Run fixed service tests
pnpm test lib/services/__tests__/progress-tracker-service.test.ts

# 2. Run coverage on critical modules
pnpm test:coverage --include="lib/services/**"

# 3. Validate overall coverage
pnpm test:coverage
```

### Success Criteria
- [ ] All service tests passing (100%)
- [ ] Service coverage ≥ 100%
- [ ] API route coverage ≥ 90%
- [ ] Overall coverage ≥ 85%
- [ ] Zero test failures

## Risk Mitigation

### Rollback Plan
If repairs fail:
1. Revert to previous working mock setup
2. Focus on sign-in form tests (currently working)
3. Implement minimal coverage for critical paths only

### Monitoring
- Run tests after each fix
- Monitor coverage metrics continuously
- Track test execution time for performance

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Infrastructure Repair | 1 hour | Fixed mock system |
| Service Layer Repair | 2 hours | 100% service coverage |
| API Test Addition | 1 hour | 90% API coverage |
| Validation | 30 min | All tests passing |

**Total Time**: 4.5 hours  
**Target Completion**: Today by 4:00 PM

## Success Metrics

### Before Repair
- Test Success Rate: 78.2%
- Coverage: 0.96%
- Failing Tests: 509

### After Repair (Target)
- Test Success Rate: 100%
- Coverage: ≥85% overall, 100% services
- Failing Tests: 0

## Next Steps

1. **IMMEDIATE**: Apply mock infrastructure fixes
2. **URGENT**: Repair service layer tests
3. **HIGH**: Add API route coverage
4. **MEDIUM**: Implement integration tests

**CRITICAL**: Block all merges until coverage thresholds are met.