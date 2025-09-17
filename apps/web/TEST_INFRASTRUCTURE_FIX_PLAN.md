# Test Infrastructure Fix Plan

## Current Status: CRITICAL

The test suite has **270 failing tests out of 1597 total tests** (16.9% failure rate), which prevents accurate coverage measurement and blocks development progress.

## Root Cause Analysis

### 1. Authentication Middleware Mocking Issues (HIGH PRIORITY)
**Problem**: `NextResponse.next is not a function` errors
**Affected Files**: All API route tests
**Impact**: 100% API route test failure

**Root Cause**: 
- Incorrect mocking of Next.js server components
- Authentication middleware not properly mocked
- Clerk authentication integration issues

**Solution**:
```typescript
// Proper Next.js mocking pattern
vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(public url: string, public init?: RequestInit) {}
    json() { return Promise.resolve(this.init?.body ? JSON.parse(this.init.body as string) : {}) }
  },
  NextResponse: {
    json: vi.fn((data: any, init?: ResponseInit) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200
    })),
    next: vi.fn(() => ({ status: 200 }))
  }
}))
```

### 2. Database Service Mocking Structure (HIGH PRIORITY)
**Problem**: `mockSupabase.from(...).select(...).eq(...).order(...).mockResolvedValueOnce is not a function`
**Affected Files**: All service layer tests
**Impact**: 95% service test failure

**Root Cause**:
- Incorrect Supabase client mock structure
- Query builder chain not properly mocked
- Mock functions not returning chainable objects

**Solution**: Use the provided `createMockSupabaseClient()` factory from the scaffolds.

### 3. Error Handling Expectations (MEDIUM PRIORITY)
**Problem**: Test expectations don't match actual error formats
**Affected Files**: Error handling tests, service tests
**Impact**: Inconsistent error validation

**Root Cause**:
- Tests expect different error message formats than implementation
- Error codes and structures have changed
- Console logging expectations not aligned

### 4. Component Context Integration (MEDIUM PRIORITY)
**Problem**: Context providers and hooks not properly mocked
**Affected Files**: Organization context tests, component integration tests
**Impact**: Component integration test failures

## Immediate Action Plan

### Phase 1: Critical Infrastructure (Days 1-2)

#### Step 1: Fix Authentication Mocking
- [ ] Update all API route tests to use proper Next.js mocking
- [ ] Fix Clerk authentication mocking patterns
- [ ] Update middleware test expectations
- [ ] Validate users API test specifically

**Files to Update**:
- `__tests__/api/users.api.test.ts` ✅ (scaffold created)
- `__tests__/api/organizations.api.test.ts`
- `__tests__/api/memberships.api.test.ts`
- All other API route tests

#### Step 2: Fix Database Service Mocking
- [ ] Implement standardized Supabase client mocking
- [ ] Update all service tests to use new mock structure
- [ ] Fix query builder chain mocking
- [ ] Validate service method calls

**Files to Update**:
- `lib/services/__tests__/progress-tracker-service.test.ts`
- `lib/services/__tests__/path-engine.test.ts`
- `lib/services/__tests__/onboarding-service.test.ts`
- `lib/services/__tests__/organization-onboarding-service.test.ts`
- All other service tests

#### Step 3: Update Error Expectations
- [ ] Align error message expectations with implementation
- [ ] Fix error code validations
- [ ] Update console logging expectations
- [ ] Standardize error response formats

### Phase 2: Service Layer Coverage (Days 3-4)

#### Step 1: Progress Tracker Service (100% Target)
- [ ] Fix all 25+ failing tests
- [ ] Add missing edge case tests
- [ ] Validate milestone tracking
- [ ] Test analytics generation

#### Step 2: Path Engine Service (100% Target)
- [ ] Fix path generation tests
- [ ] Add path adaptation tests
- [ ] Test alternative path suggestions
- [ ] Validate completion tracking

#### Step 3: Onboarding Service (100% Target)
- [ ] Fix session management tests
- [ ] Add step completion tests
- [ ] Test path switching logic
- [ ] Validate user progress tracking

### Phase 3: API Routes & Integration (Days 5-6)

#### Step 1: API Route Coverage (90% Target)
- [ ] Users API routes
- [ ] Organizations API routes
- [ ] Memberships API routes
- [ ] Authentication flows

#### Step 2: Component Integration (85% Target)
- [ ] Fix context provider tests
- [ ] Update component integration tests
- [ ] Add missing component tests
- [ ] Validate user interactions

## Test Execution Strategy

### 1. Incremental Fixing
```bash
# Fix one module at a time
pnpm test __tests__/scaffolds/auth-middleware-fixed.test.ts
pnpm test __tests__/scaffolds/users-api-fixed.test.ts
pnpm test __tests__/scaffolds/database-service-mocking-guide.test.ts

# Then apply fixes to actual tests
pnpm test __tests__/api/users.api.test.ts
pnpm test lib/services/__tests__/progress-tracker-service.test.ts
```

### 2. Coverage Validation
```bash
# Run coverage validation after each fix
pnpm test:coverage
node __tests__/validate-coverage.ts
```

### 3. Continuous Integration
```bash
# Ensure all tests pass before proceeding
pnpm test
pnpm typecheck
pnpm build
```

## Success Criteria

### Phase 1 Success (Critical Infrastructure)
- [ ] 0 authentication-related test failures
- [ ] 0 database mocking-related test failures
- [ ] All API route tests passing
- [ ] All service tests have proper mocking

### Phase 2 Success (Service Coverage)
- [ ] Services coverage ≥ 100%
- [ ] All service methods tested
- [ ] All error scenarios covered
- [ ] All edge cases tested

### Phase 3 Success (Overall Coverage)
- [ ] Overall coverage ≥ 85%
- [ ] API routes coverage ≥ 90%
- [ ] Models coverage ≥ 95%
- [ ] Components coverage ≥ 85%

## Risk Mitigation

### High Risk Items
1. **Authentication Changes**: May require updates to actual middleware
2. **Database Schema Changes**: May require test data updates
3. **API Contract Changes**: May require response format updates

### Mitigation Strategies
1. **Incremental Testing**: Fix and validate one module at a time
2. **Rollback Plan**: Keep original tests until fixes are validated
3. **Documentation**: Document all changes for future reference

## Resource Requirements

### Time Estimate
- **Phase 1**: 2 days (critical infrastructure)
- **Phase 2**: 2 days (service coverage)
- **Phase 3**: 2 days (integration & validation)
- **Total**: 6 days

### Skills Required
- TypeScript/JavaScript testing expertise
- Next.js and React testing patterns
- Supabase and database mocking
- Authentication flow testing

## Monitoring and Validation

### Daily Checkpoints
1. **Test Failure Count**: Track reduction in failing tests
2. **Coverage Percentage**: Monitor coverage improvements
3. **Build Success Rate**: Ensure builds remain stable

### Success Metrics
- Test failure rate < 5%
- Coverage thresholds met for all modules
- CI/CD pipeline stability
- Developer productivity improvement

## Next Steps

1. **Immediate**: Implement Phase 1 fixes using provided scaffolds
2. **Short-term**: Execute Phase 2 and 3 systematically
3. **Long-term**: Establish automated coverage enforcement
4. **Ongoing**: Maintain test quality standards

## Conclusion

The test infrastructure requires immediate attention to restore development velocity. The provided scaffolds and systematic approach will resolve the critical issues and establish a robust testing foundation.

**CRITICAL**: No new features should be developed until test infrastructure is stable and coverage thresholds are met.