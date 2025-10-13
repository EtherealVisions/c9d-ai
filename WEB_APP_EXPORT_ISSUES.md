# Web App Export Issues Summary

## Overview
The web app has several categories of export-related TypeScript errors that need to be resolved.

## 1. Validation Module Export Conflicts (9 errors)

**File**: `lib/validation/index.ts`

**Issue**: Multiple modules are exporting the same members, causing ambiguity.

**Conflicting exports**:
- `createErrorResponse` - exported from both `./utils` and `./schemas`
- `createSuccessResponse` - exported from both `./utils` and `./schemas`
- `safeValidate` - exported from multiple modules
- `errorResponseSchema` - exported from multiple modules
- `transformZodError` - exported from multiple modules
- `isValidationError` - exported from multiple modules

**Fix**: Use explicit re-exports instead of `export *`:
```typescript
// Instead of:
export * from './schemas'
export * from './utils'

// Use:
export { 
  specificExport1,
  specificExport2 
} from './schemas'
```

## 2. Web Vitals Import Issues (5 errors)

**File**: `lib/performance/__tests__/web-vitals.test.ts`

**Issue**: Using old web-vitals v4 API instead of v5.

**Missing exports**:
- `getCLS` → should be `onCLS`
- `getFID` → should be `onINP` (FID is deprecated)
- `getFCP` → should be `onFCP`
- `getLCP` → should be `onLCP`
- `getTTFB` → should be `onTTFB`

**Fix**: Update imports to web-vitals v5 API.

## 3. Model Type Export Issues (7 errors)

**File**: `lib/models/__tests__/types-comprehensive.test.ts`

**Missing exports**:
- `OnboardingSessionType`
- `OnboardingSessionStatus`
- `OnboardingStepType`
- `UserProgressStatus`
- `TeamInvitationStatus` (should be `InvitationStatus`)
- `OnboardingContentType`
- `OnboardingMilestoneType`

**Fix**: These types need to be exported from the models/types module or tests need to be updated to use correct type names.

## 4. Validation Schema Export Issues (13 errors)

**File**: `__tests__/unit/validation-schemas-comprehensive.test.ts`

**Incorrect or missing schema exports**:
- `userResponseSchema` → should be `userApiResponseSchema`
- `organizationResponseSchema` → should be `organizationApiResponseSchema`
- `organizationMembershipSchema` → should be `selectOrganizationMembershipSchema`
- `roleResponseSchema` → should be `roleApiResponseSchema`
- `permissionSchema` → should be `PermissionSearch`
- `createContentSchema` → should be `CreateContent`
- `updateContentSchema` → should be `UpdateContent`
- `invitationResponseSchema` → should be `invitationApiResponseSchema`
- `teamInvitationSchema` → should be `baseInvitationSchema`
- `onboardingStepSchema` → should be `createOnboardingStepSchema`

**Missing completely**:
- `contentResponseSchema`
- `businessRuleSchema`
- `validationRuleSchema`

## 5. Integration Test Import Issues (10 errors)

Various integration test files are importing non-existent exports:

- `__tests__/integration/two-factor-flow.integration.test.tsx` - missing auth component exports
- `__tests__/integration/password-reset-flow.integration.test.tsx` - missing auth component exports
- `__tests__/integration/api/user-profile-management.integration.test.ts` - missing API client exports
- `__tests__/integration/real-database-integration.test.ts` - missing database exports
- `__tests__/integration/real-clerk-integration.test.ts` - missing Clerk exports
- `__tests__/integration/phase-environment-integration.test.ts` - missing Phase exports

## Summary

**Total export issues**: ~44 errors

**Categories**:
1. Validation module conflicts: 9
2. Web vitals outdated imports: 5
3. Model type exports: 7
4. Validation schema naming: 13
5. Integration test imports: 10

**Priority fixes**:
1. Resolve validation module export conflicts (affects production code)
2. Update schema export names in tests
3. Export missing model types
4. Update web-vitals imports
5. Fix integration test imports

Most of these are test file issues and won't affect production builds, but the validation module conflicts should be resolved for code clarity.