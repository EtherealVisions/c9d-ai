# Phase.dev Testing Standards

## Overview
This document defines mandatory testing standards for Phase.dev integration. These standards ensure that Phase.dev functionality is tested with real API calls and proper authentication, never with mocks.

## Core Principle: No Mocking of Phase.dev

**CRITICAL RULE**: Phase.dev integration must NEVER be mocked in tests. All Phase.dev functionality requires real API calls with valid PHASE_SERVICE_TOKEN.

### Why No Mocking?
- Phase.dev integration is a critical external dependency
- Mocking hides real API behavior, authentication issues, and network problems
- Real integration testing ensures the system works in production
- Phase.dev API responses and error handling must be tested with actual service

## Required Environment Setup

### PHASE_SERVICE_TOKEN Requirement
All tests involving Phase.dev functionality MUST have a valid PHASE_SERVICE_TOKEN:

```typescript
// ✅ CORRECT: Check for real token before running Phase.dev tests
describe('Phase.dev Integration', () => {
  beforeAll(() => {
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN is required for Phase.dev integration tests')
    }
  })
  
  // Real integration tests here
})
```

```typescript
// ❌ FORBIDDEN: Never mock Phase.dev API calls
const mockFetch = vi.fn()
global.fetch = mockFetch // This breaks real Phase.dev testing
```

### Test Environment Configuration
- Tests must use real Phase.dev service endpoints
- Tests must authenticate with actual service tokens
- Tests must handle real API responses and errors
- Tests must respect Phase.dev rate limits and service availability

## Test Categories and Requirements

### Integration Tests (MANDATORY)
All Phase.dev functionality must have integration tests that:

1. **Use Real API Calls**: No mocking of fetch, HTTP clients, or Phase.dev responses
2. **Require Valid Token**: Tests fail fast if PHASE_SERVICE_TOKEN is not available
3. **Test Real Scenarios**: Actual environment variable loading, caching, error handling
4. **Handle Service Unavailability**: Graceful degradation when Phase.dev is unreachable

### Test Structure Requirements

```typescript
// ✅ CORRECT: Real Phase.dev integration test
describe('Phase.dev Environment Loading', () => {
  beforeAll(() => {
    // Ensure we have a real service token
    if (!process.env.PHASE_SERVICE_TOKEN) {
      throw new Error('PHASE_SERVICE_TOKEN required for Phase.dev tests')
    }
  })
  
  it('should load environment variables from Phase.dev', async () => {
    // This makes a real API call
    const result = await loadFromPhase()
    
    // Test real behavior
    expect(result.success).toBe(true)
    expect(result.source).toBe('phase.dev')
  })
  
  it('should handle Phase.dev service errors gracefully', async () => {
    // Test with invalid config to trigger real error
    const result = await loadFromPhase(false, { 
      serviceToken: 'invalid-token',
      appName: 'NonExistentApp'
    })
    
    // Test real error handling
    expect(result.success).toBe(false)
    expect(result.error).toContain('Phase.dev API error')
  })
})
```

### Forbidden Patterns

```typescript
// ❌ FORBIDDEN: Mocking fetch for Phase.dev tests
vi.mock('fetch')
global.fetch = vi.fn()

// ❌ FORBIDDEN: Mocking Phase.dev responses
mockFetch.mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([])
})

// ❌ FORBIDDEN: Stubbing Phase.dev API calls
vi.mock('../phase', () => ({
  loadFromPhase: vi.fn().mockResolvedValue({ success: true })
}))

// ❌ FORBIDDEN: Skipping tests due to missing token
it.skip('should load from Phase.dev', () => {
  // Never skip Phase.dev tests - fail fast instead
})
```

## Error Handling Requirements

### Real Error Testing
Phase.dev error scenarios must be tested with real conditions:

```typescript
// ✅ CORRECT: Test real error conditions
it('should handle invalid service token', async () => {
  const result = await loadFromPhase(false, {
    serviceToken: 'invalid-token-12345',
    appName: 'TestApp'
  })
  
  expect(result.success).toBe(false)
  expect(result.error).toMatch(/Phase\.dev API error: 40[13]/)
})

it('should handle non-existent app', async () => {
  const result = await loadFromPhase(false, {
    serviceToken: process.env.PHASE_SERVICE_TOKEN,
    appName: 'NonExistentApp12345'
  })
  
  expect(result.success).toBe(false)
  expect(result.error).toContain('not found')
})
```

### Network Error Testing
```typescript
// ✅ CORRECT: Test real network conditions
it('should handle Phase.dev service unavailability', async () => {
  // Use invalid endpoint to test network error handling
  const originalFetch = global.fetch
  global.fetch = async () => {
    throw new Error('Network error: ECONNREFUSED')
  }
  
  try {
    const result = await loadFromPhase()
    expect(result.success).toBe(false)
    expect(result.error).toContain('Network error')
  } finally {
    global.fetch = originalFetch
  }
})
```

## CI/CD Integration

### Environment Variable Requirements
CI/CD pipelines must provide real Phase.dev credentials:

```yaml
# ✅ CORRECT: CI configuration with real credentials
env:
  PHASE_SERVICE_TOKEN: ${{ secrets.PHASE_SERVICE_TOKEN }}
  NODE_ENV: test

# Test execution
- name: Run Phase.dev Integration Tests
  run: pnpm test:phase-integration
  env:
    PHASE_SERVICE_TOKEN: ${{ secrets.PHASE_SERVICE_TOKEN }}
```

### Test Execution Strategy
```bash
# ✅ CORRECT: Conditional test execution based on token availability
if [ -n "$PHASE_SERVICE_TOKEN" ]; then
  echo "Running Phase.dev integration tests with real API"
  pnpm test:phase-integration
else
  echo "Skipping Phase.dev tests - no service token available"
  exit 1  # Fail the build if token is required
fi
```

## Development Workflow

### Local Development
Developers must have real Phase.dev credentials for testing:

1. **Setup**: Obtain valid PHASE_SERVICE_TOKEN from Phase.dev console
2. **Configuration**: Add token to local environment (.env.local)
3. **Testing**: Run integration tests with real API calls
4. **Debugging**: Use real Phase.dev responses for troubleshooting

### Test Data Management
```typescript
// ✅ CORRECT: Use real test environments in Phase.dev
const testConfig = {
  serviceToken: process.env.PHASE_SERVICE_TOKEN,
  appName: 'AI.C9d.Test', // Real test app in Phase.dev
  environment: 'test'
}
```

## Monitoring and Observability

### Test Execution Monitoring
- Track Phase.dev API response times in tests
- Monitor test failure rates due to Phase.dev unavailability
- Alert on authentication failures
- Log real API interactions for debugging

### Performance Testing
```typescript
// ✅ CORRECT: Real performance testing
it('should load Phase.dev variables within acceptable time', async () => {
  const startTime = Date.now()
  
  const result = await loadFromPhase()
  
  const duration = Date.now() - startTime
  expect(duration).toBeLessThan(5000) // 5 second timeout
  expect(result.success).toBe(true)
})
```

## Compliance and Validation

### Pre-commit Validation
```bash
# Check for Phase.dev mocking in tests
if grep -r "vi\.mock.*phase\|mockFetch.*phase\|global\.fetch.*vi\.fn" __tests__/; then
  echo "❌ ERROR: Phase.dev mocking detected in tests"
  echo "Phase.dev integration must use real API calls"
  exit 1
fi
```

### Code Review Checklist
- [ ] No mocking of Phase.dev API calls
- [ ] Real PHASE_SERVICE_TOKEN required for tests
- [ ] Proper error handling for real API failures
- [ ] Integration tests cover real Phase.dev scenarios
- [ ] Performance tests use real API response times

## Exception Handling

### When Mocking is Acceptable
Phase.dev mocking is ONLY acceptable for:

1. **Unit tests of non-Phase.dev code** that happens to call Phase.dev functions
2. **Component tests** where Phase.dev is not the focus
3. **Isolated utility function tests** that don't test Phase.dev integration

Even in these cases, prefer dependency injection over mocking:

```typescript
// ✅ PREFERRED: Dependency injection
function createUserService(phaseLoader: PhaseLoader) {
  return {
    async getUser(id: string) {
      const config = await phaseLoader.loadConfig()
      // Use config...
    }
  }
}

// Test with mock loader, not mocked Phase.dev
const mockLoader = { loadConfig: () => Promise.resolve({}) }
const service = createUserService(mockLoader)
```

## Enforcement

This standard is enforced through:
1. **Pre-commit hooks** that detect Phase.dev mocking
2. **CI/CD validation** that requires real service tokens
3. **Code review guidelines** that reject Phase.dev mocks
4. **Test execution** that fails fast without proper credentials

**Remember**: Phase.dev integration is critical infrastructure. Test it like production depends on it - because it does.