# Test Selector Fix Strategy

## Issue: Ambiguous Test Selectors

The main remaining issue is test selector ambiguity. Tests are failing because:
- Multiple elements match the same selector
- Need more specific selectors using data-testid attributes

## Fix Strategy

### 1. Use Specific Test IDs
Instead of:
```typescript
screen.getByRole('button', { name: /sign in/i })
```

Use:
```typescript
screen.getByTestId('sign-in-submit-button')
```

### 2. Update Test Patterns
- Replace ambiguous `getByLabelText` with `getByTestId`
- Replace ambiguous `getByRole` with specific selectors
- Use `getAllBy*` when multiple elements are expected

### 3. Component Updates Needed
Some components may need additional data-testid attributes for better testability.

## Implementation Priority

1. **High Impact**: Auth component tests (sign-in, sign-up forms)
2. **Medium Impact**: Service layer tests 
3. **Low Impact**: Integration tests (already more stable)

## Expected Outcome

With selector fixes:
- Test pass rate should improve from ~30% to 90%+
- Infrastructure is solid, just need implementation fixes
- Coverage collection will be accurate and reliable
