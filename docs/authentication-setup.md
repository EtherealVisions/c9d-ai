# Authentication Setup with Clerk

This document describes the authentication integration implemented for the Account Management & Organizational Modeling system.

## Overview

The authentication system uses Clerk for user authentication and JWT token management, with automatic user synchronization to a local Supabase database. The system supports both individual users and organizational contexts.

## Components

### 1. Clerk Integration

- **Provider**: `ClerkProvider` wraps the entire application in `app/layout.tsx`
- **Middleware**: `middleware.ts` protects routes and validates JWT tokens
- **Environment Variables**: Configured in `.env.local`

### 2. User Synchronization Service

**Location**: `lib/services/user-sync.ts`

The `UserSyncService` handles:
- Syncing Clerk users with the local database
- Creating new users when they first authenticate
- Updating existing user information
- Managing user deletion
- Audit logging for user activities

**Key Methods**:
- `syncUser(clerkUser)`: Syncs a Clerk user with the database
- `getUserByClerkId(clerkUserId)`: Retrieves user by Clerk ID
- `getUserWithMemberships(clerkUserId)`: Gets user with organization memberships
- `deleteUser(clerkUserId)`: Removes user and associated data

### 3. Authentication Middleware

**Location**: `lib/middleware/auth.ts`

Provides middleware functions for API routes:
- `withAuth()`: Basic JWT validation
- `withUserSync()`: JWT validation + user synchronization
- Helper functions for extracting user information

**Usage Example**:
```typescript
import { withUserSync } from '@/lib/middleware/auth'

async function handler(req: NextRequest) {
  const user = (req as any).user // User is automatically available
  return NextResponse.json({ user })
}

export const GET = withUserSync(handler)
```

### 4. Enhanced Authentication Context Provider

**Location**: `lib/contexts/auth-context.tsx`

Provides comprehensive client-side authentication state management with enhanced organization support:

**Core Features**:
- User authentication status and loading states
- Multi-organization membership management
- Current organization context with persistence
- Role-based permission system
- Automatic data synchronization with API
- Organization switching with state management

**Available Hooks**:
- `useAuth()`: Complete authentication context with all features
- `useCurrentUser()`: Current user information and loading state
- `useCurrentOrganization()`: Current organization and membership details
- `usePermissions()`: Permission checking and role validation

**New Capabilities**:
- **Organization Persistence**: Remembers selected organization across sessions
- **Permission Caching**: Efficient permission lookup and validation
- **Automatic Sync**: Syncs user data when Clerk state changes
- **Error Handling**: Graceful error handling for API failures
- **Performance Optimized**: Minimal re-renders and efficient state updates

See [Authentication Context Documentation](./authentication-context.md) for detailed usage examples and API reference.

### 5. API Endpoints

#### `/api/auth/me`
Returns current user information and organizations.

#### `/api/organizations/[id]/membership`
Returns user's membership and permissions for a specific organization.

#### `/api/webhooks/clerk`
Handles Clerk webhook events for user lifecycle management.

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 2. Clerk Dashboard Configuration

1. Create a new Clerk application
2. Configure sign-in/sign-up URLs:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/dashboard`
   - After sign-up URL: `/dashboard`
3. Set up webhook endpoint: `/api/webhooks/clerk`
4. Enable the following webhook events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

### 3. Database Setup

Ensure your Supabase database has the required tables from the migration files:
- `users`
- `organizations`
- `organization_memberships`
- `roles`
- `permissions`
- `invitations`
- `audit_logs`

## Usage Examples

### Protecting API Routes

```typescript
import { withAuth } from '@/lib/middleware/auth'

async function handler(req: NextRequest) {
  // Route is automatically protected
  return NextResponse.json({ message: 'Protected route accessed' })
}

export const GET = withAuth(handler)
```

### Using Enhanced Authentication in Components

```typescript
'use client'
import { useAuth, useCurrentUser, useCurrentOrganization } from '@/lib/contexts/auth-context'

export function UserProfile() {
  const { user, isLoading } = useCurrentUser()
  const { organization, membership } = useCurrentOrganization()
  const { organizations, switchOrganization } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Please sign in</div>

  return (
    <div>
      <h1>Welcome, {user.firstName} {user.lastName}!</h1>
      <p>Email: {user.email}</p>
      
      {organization && (
        <div>
          <h2>Current Organization: {organization.name}</h2>
          <p>Your Role: {membership?.role}</p>
        </div>
      )}
      
      <select 
        value={organization?.id || ''} 
        onChange={(e) => switchOrganization(e.target.value)}
      >
        <option value="">Select Organization</option>
        {organizations.map(org => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
    </div>
  )
}
```

### Enhanced Permission Checking

```typescript
'use client'
import { usePermissions } from '@/lib/contexts/auth-context'

export function AdminPanel() {
  const { hasPermission, permissions } = usePermissions()

  if (!hasPermission('admin.access')) {
    return <div>Access denied</div>
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      
      {hasPermission('users.manage') && (
        <section>
          <h2>User Management</h2>
          <button>Manage Users</button>
        </section>
      )}
      
      {hasPermission('settings.edit') && (
        <section>
          <h2>Settings</h2>
          <button>Edit Settings</button>
        </section>
      )}
      
      {hasPermission('billing.view') && (
        <section>
          <h2>Billing</h2>
          <button>View Billing</button>
        </section>
      )}
    </div>
  )
}

// Convenience component for permission-based rendering
export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = usePermissions()
  
  return hasPermission(permission) ? children : fallback
}

// Usage
<PermissionGate permission="billing.view">
  <BillingSection />
</PermissionGate>
```

## Security Features

1. **JWT Token Validation**: All protected routes validate JWT tokens
2. **Tenant Isolation**: Users can only access data from their organizations
3. **Audit Logging**: All user activities are logged
4. **Webhook Verification**: Clerk webhooks are cryptographically verified
5. **Permission-Based Access**: Fine-grained permission system

## Testing

The authentication system can be tested by:

1. Visiting `/sign-up` to create a new account
2. Visiting `/sign-in` to authenticate
3. Accessing `/dashboard` to see user information
4. Making requests to `/api/users` to test API authentication

## Troubleshooting

### Common Issues

1. **Environment Variables**: Ensure all Clerk keys are properly set
2. **Database Connection**: Verify Supabase connection and table structure
3. **Webhook Verification**: Check webhook secret matches Clerk dashboard
4. **CORS Issues**: Ensure Clerk domain is properly configured

### Debug Logging

The system includes comprehensive logging for:
- User synchronization events
- Authentication failures
- Permission checks
- Webhook processing

Check the server console for detailed error messages.