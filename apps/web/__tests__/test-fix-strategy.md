# Test Fix Strategy

## Critical Issues Identified

### 1. Jest vs Vitest Compatibility Issues
- **Problem**: Tests using `jest.mock()` instead of `vi.mock()`
- **Files Affected**: `hooks/__tests__/use-organization.test.tsx`
- **Fix**: Replace all jest references with vitest equivalents

### 2. Database Mock Issues
- **Problem**: Missing `createSupabaseClient` export in database mocks
- **Files Affected**: 
  - `lib/services/__tests__/rbac-integration.test.ts`
  - `lib/services/__tests__/rbac-service.test.ts`
- **Fix**: Properly mock the database module

### 3. Response Constructor Issues
- **Problem**: Invalid status codes (204 with body)
- **Files Affected**: `__tests__/api/memberships.api.test.ts`
- **Fix**: Use proper status codes for responses

### 4. Mock Implementation Issues
- **Problem**: `vi.mocked(...).mockImplementation is not a function`
- **Files Affected**: Various service tests
- **Fix**: Proper mock setup and implementation

## Fix Priority

1. **High Priority**: Database mocks and service layer tests
2. **Medium Priority**: API route tests and response handling
3. **Low Priority**: Component tests and integration tests

## Implementation Plan

1. Fix database mocking setup
2. Update jest references to vitest
3. Fix API response status codes
4. Standardize mock implementations
5. Run tests and iterate on remaining failures