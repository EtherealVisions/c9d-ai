# Authentication Context Documentation

## Overview

The authentication context (`apps/web/lib/contexts/auth-context.tsx`) provides a comprehensive authentication and authorization system built on top of Clerk. It manages user state, organization membership, permissions, and provides a unified interface for authentication-related operations throughout the application.

## Features

### Core Authentication
- **User State Management**: Syncs user data between Clerk and the application database
- **Loading States**: Proper loading indicators during authentication operations
- **Sign-in Status**: Real-time authentication status tracking

### Organization Management
- **Multi-Organization Support**: Users can belong to multiple organizations
- **Organization Switching**: Seamless switching between organizations
- **Current Organization State**: Tracks the active organization context
- **Membership Management**: Manages user roles and permissions within organizations

### Permission System
- **Role-Based Access Control (RBAC)**: Fine-grained permission checking
- **Permission Caching**: Efficient permission lookup and caching
- **Context-Aware Permissions**: Permissions are scoped to the current organization

## API Reference

### AuthContextValue Interface

```typescript
interface AuthContextValue {
  // User state
  user: User | null
  isLoading: boolean
  isSignedIn: boolean
  
  // Organization state
  organizations: Organization[]
  currentOrganization: Organization | null
  currentMembership: OrganizationMembership | null
  
  // Actions
  switchOrganization: (organizationId: string) => Promise<void>
  refreshUser: () => Promise<void>
  refreshOrganizations: () => Promise<void>
  
  // Permissions
  permissions: string[]
  hasPermission: (permission: string) => boolean
}
```

### Provider Component

```typescript
interface AuthProviderProps {
  children: React.ReactNode
}

function AuthProvider({ children }: AuthProviderProps)
```

## Usage Examples

### Basic Setup

```typescript
// app/layout.tsx
import { AuthProvider } from '@/lib/contexts/auth-context'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Using the Auth Hook

```typescript
// components/user-profile.tsx
import { useAuth } from '@/lib/contexts/auth-context'

export function UserProfile() {
  const { user, isLoading, isSignedIn } = useAuth()
  
  if (isLoading) return <div>Loading...</div>
  if (!isSignedIn) return <div>Please sign in</div>
  
  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      <p>Email: {user?.email}</p>
    </div>
  )
}
```

### Organization Management

```typescript
// components/organization-switcher.tsx
import { useAuth } from '@/lib/contexts/auth-context'

export function OrganizationSwitcher() {
  const { 
    organizations, 
    currentOrganization, 
    switchOrganization,
    isLoading 
  } = useAuth()
  
  if (isLoading) return <div>Loading organizations...</div>
  
  return (
    <select 
      value={currentOrganization?.id || ''} 
      onChange={(e) => switchOrganization(e.target.value)}
    >
      {organizations.map(org => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
```

### Permission Checking

```typescript
// components/admin-panel.tsx
import { useAuth } from '@/lib/contexts/auth-context'

export function AdminPanel() {
  const { hasPermission } = useAuth()
  
  if (!hasPermission('admin.access')) {
    return <div>Access denied</div>
  }
  
  return (
    <div>
      <h1>Admin Panel</h1>
      {hasPermission('users.manage') && (
        <button>Manage Users</button>
      )}
      {hasPermission('settings.edit') && (
        <button>Edit Settings</button>
      )}
    </div>
  )
}
```

## Convenience Hooks

The context provides several convenience hooks for common use cases:

### useCurrentUser

```typescript
import { useCurrentUser } from '@/lib/contexts/auth-context'

export function UserBadge() {
  const { user, isLoading } = useCurrentUser()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div className="user-badge">
      <img src={user?.avatarUrl} alt="Avatar" />
      <span>{user?.firstName} {user?.lastName}</span>
    </div>
  )
}
```

### useCurrentOrganization

```typescript
import { useCurrentOrganization } from '@/lib/contexts/auth-context'

export function OrganizationHeader() {
  const { organization, membership, isLoading } = useCurrentOrganization()
  
  if (isLoading) return <div>Loading...</div>
  if (!organization) return <div>No organization selected</div>
  
  return (
    <div className="org-header">
      <h1>{organization.name}</h1>
      <span>Role: {membership?.role}</span>
    </div>
  )
}
```

### usePermissions

```typescript
import { usePermissions } from '@/lib/contexts/auth-context'

export function FeatureToggle({ permission, children }) {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission(permission)) {
    return null
  }
  
  return <>{children}</>
}

// Usage
<FeatureToggle permission="billing.view">
  <BillingSection />
</FeatureToggle>
```

## API Endpoints

The auth context integrates with several API endpoints:

### User Data Sync
- **GET `/api/auth/me`**: Fetches current user data and organizations
- **Response**: `{ user: User, organizations: Organization[] }`

### Organization Membership
- **GET `/api/organizations/{id}/membership`**: Fetches membership and permissions
- **Response**: `{ membership: OrganizationMembership, permissions: string[] }`

### Organization Management
- **GET `/api/organizations`**: Fetches user's organizations
- **Response**: `{ organizations: Organization[] }`

## State Management

### Local Storage
- **Current Organization**: The selected organization ID is persisted in `localStorage`
- **Key**: `currentOrganizationId`
- **Behavior**: Automatically restores the last selected organization on app load

### State Synchronization
- **Clerk Integration**: Automatically syncs when Clerk user state changes
- **API Sync**: Fetches additional user data from the application database
- **Organization Context**: Loads membership and permissions when switching organizations

## Error Handling

The context includes comprehensive error handling:

```typescript
// Graceful error handling
try {
  await syncUserData()
} catch (error) {
  console.error('Failed to sync user data:', error)
  // Context continues to function with cached data
}
```

### Error Scenarios
- **API Failures**: Gracefully handles API errors without breaking the UI
- **Network Issues**: Continues with cached data when network requests fail
- **Invalid Organization**: Handles cases where saved organization no longer exists
- **Permission Errors**: Safely handles permission lookup failures

## Performance Considerations

### Optimization Features
- **Lazy Loading**: Organization data is loaded only when needed
- **Caching**: Permissions and membership data are cached per organization
- **Minimal Re-renders**: Uses proper dependency arrays to prevent unnecessary updates
- **Local Storage**: Persists organization selection to avoid repeated API calls

### Best Practices
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Selective Updates**: Only update specific state slices when data changes
- **Error Boundaries**: Wrap auth-dependent components in error boundaries

## Security Considerations

### Data Protection
- **Sensitive Data**: User data is properly filtered before client-side storage
- **Permission Validation**: Server-side permission validation is required
- **Token Management**: Relies on Clerk's secure token management
- **Organization Isolation**: Ensures users can only access authorized organizations

### Best Practices
- **Server Validation**: Always validate permissions on the server side
- **Minimal Exposure**: Only expose necessary user data to the client
- **Secure Storage**: Use secure storage mechanisms for sensitive data
- **Regular Refresh**: Implement token refresh and data synchronization

## Migration Guide

### From Previous Auth Context

If migrating from a simpler auth context:

1. **Update Imports**:
   ```typescript
   // Old
   import { useAuth } from '@/lib/contexts/auth-context'
   const { isAuthenticated, user } = useAuth()
   
   // New
   import { useAuth } from '@/lib/contexts/auth-context'
   const { isSignedIn, user } = useAuth()
   ```

2. **Organization Support**:
   ```typescript
   // Add organization handling
   const { currentOrganization, switchOrganization } = useAuth()
   ```

3. **Permission Checking**:
   ```typescript
   // Replace manual role checking
   const { hasPermission } = useAuth()
   if (hasPermission('admin.access')) {
     // Show admin features
   }
   ```

## Testing

### Mock Implementation

```typescript
// __tests__/setup/mocks/auth-context.ts
import { vi } from 'vitest'

export const mockAuthContext = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  },
  isLoading: false,
  isSignedIn: true,
  organizations: [
    {
      id: 'test-org-id',
      name: 'Test Organization',
      slug: 'test-org'
    }
  ],
  currentOrganization: {
    id: 'test-org-id',
    name: 'Test Organization',
    slug: 'test-org'
  },
  currentMembership: {
    id: 'test-membership-id',
    role: 'admin',
    userId: 'test-user-id',
    organizationId: 'test-org-id'
  },
  permissions: ['admin.access', 'users.manage'],
  hasPermission: vi.fn((permission: string) => 
    ['admin.access', 'users.manage'].includes(permission)
  ),
  switchOrganization: vi.fn(),
  refreshUser: vi.fn(),
  refreshOrganizations: vi.fn()
}

// Mock the context
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockAuthContext,
  useCurrentUser: () => ({ 
    user: mockAuthContext.user, 
    isLoading: mockAuthContext.isLoading 
  }),
  useCurrentOrganization: () => ({
    organization: mockAuthContext.currentOrganization,
    membership: mockAuthContext.currentMembership,
    isLoading: mockAuthContext.isLoading
  }),
  usePermissions: () => ({
    permissions: mockAuthContext.permissions,
    hasPermission: mockAuthContext.hasPermission
  })
}))
```

### Test Examples

```typescript
// __tests__/components/user-profile.test.tsx
import { render, screen } from '@testing-library/react'
import { UserProfile } from '@/components/user-profile'
import { mockAuthContext } from '../setup/mocks/auth-context'

describe('UserProfile', () => {
  it('displays user information', () => {
    render(<UserProfile />)
    
    expect(screen.getByText('Welcome, Test!')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })
  
  it('shows loading state', () => {
    mockAuthContext.isLoading = true
    
    render(<UserProfile />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

## Troubleshooting

### Common Issues

1. **Context Not Available**
   ```
   Error: useAuth must be used within an AuthProvider
   ```
   **Solution**: Ensure `AuthProvider` wraps your component tree

2. **Organization Not Loading**
   ```
   currentOrganization is null despite having organizations
   ```
   **Solution**: Check localStorage for `currentOrganizationId` and API responses

3. **Permissions Not Working**
   ```
   hasPermission always returns false
   ```
   **Solution**: Verify organization membership API returns correct permissions

4. **Infinite Re-renders**
   ```
   Component re-renders continuously
   ```
   **Solution**: Check dependency arrays in useEffect hooks

### Debug Mode

Enable debug logging by setting localStorage:

```javascript
localStorage.setItem('auth-debug', 'true')
```

This will log auth state changes and API calls to the console.

## Related Documentation

- [Clerk Authentication Setup](./authentication-setup.md)
- [Organization Management API](./api/organizations.md)
- [Permission System](./permissions.md)
- [User Management](./user-management.md)
- [Testing Authentication](./testing/auth-testing.md)