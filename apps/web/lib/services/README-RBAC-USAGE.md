# RBAC System Usage Guide

This document provides examples and best practices for using the Role-Based Access Control (RBAC) system in the C9d.ai platform.

## Overview

The RBAC system provides:
- **Permission checking**: Verify if users have specific permissions
- **Role management**: Create, assign, and manage roles within organizations
- **Middleware protection**: Protect API routes with permission requirements
- **Resource access validation**: Validate access to specific resources and actions

## Core Components

### RBACService

The main service class that handles all RBAC operations.

```typescript
import { rbacService } from '../services/rbac-service'

// Check if user has a specific permission
const canWriteUsers = await rbacService.hasPermission(userId, organizationId, 'users:write')

// Check multiple permissions
const permissions = await rbacService.hasPermissions(userId, organizationId, [
  'users:read', 'users:write', 'organizations:admin'
])

// Get user's roles and permissions
const userRoles = await rbacService.getUserRoles(userId, organizationId)
const userPermissions = await rbacService.getUserPermissions(userId, organizationId)
```

### RBAC Middleware

Protect API routes with authentication and permission requirements.

```typescript
import { rbacMiddleware } from '../middleware/rbac'

// Require organization membership
export const GET = rbacMiddleware.organizationMember()(
  async (request) => {
    // User is authenticated and is a member of the organization
    return NextResponse.json({ message: 'Access granted' })
  }
)

// Require specific permissions
export const POST = rbacMiddleware.requirePermissions(['users:write'])(
  async (request) => {
    // User has the required permissions
    return NextResponse.json({ message: 'User creation allowed' })
  }
)

// Require admin permissions
export const DELETE = rbacMiddleware.organizationAdmin()(
  async (request) => {
    // User is an admin of the organization
    return NextResponse.json({ message: 'Admin access granted' })
  }
)
```

## Permission Patterns

### Permission Naming Convention

Permissions follow the pattern: `resource:action`

Examples:
- `users:read` - Read user information
- `users:write` - Create/update users
- `users:delete` - Delete users
- `organizations:admin` - Full admin access to organization
- `roles:manage` - Manage roles and permissions
- `system:admin` - System-wide admin access

### Common Permission Checks

```typescript
// Single permission check
const canRead = await rbacService.hasPermission(userId, orgId, 'users:read')

// ANY permission (user needs at least one)
const hasAnyUserPermission = await rbacService.hasAnyPermission(userId, orgId, [
  'users:read', 'users:write', 'users:delete'
])

// ALL permissions (user needs all specified)
const hasAllUserPermissions = await rbacService.hasAllPermissions(userId, orgId, [
  'users:read', 'users:write'
])

// Resource-based validation
const canAccessResource = await rbacService.validateResourceAccess(
  userId, orgId, 'users', 'write', resourceId
)
```

## Role Management

### Creating Roles

```typescript
// Create a new role
const editorRole = await rbacService.createRole(organizationId, {
  name: 'Editor',
  description: 'Can edit content but not manage users',
  permissions: ['content:read', 'content:write', 'users:read']
})

// Update role permissions
const updatedRole = await rbacService.updateRole(roleId, {
  permissions: ['content:read', 'content:write', 'users:read', 'users:write']
})
```

### Assigning Roles

```typescript
// Assign role to user
await rbacService.assignRole(userId, organizationId, roleId)

// Revoke role (assigns default member role)
await rbacService.revokeRole(userId, organizationId, roleId)
```

### Getting Role Information

```typescript
// Get all roles in organization
const orgRoles = await rbacService.getOrganizationRoles(organizationId)

// Get available system permissions
const availablePermissions = await rbacService.getAvailablePermissions()
```

## API Route Protection Examples

### Basic Authentication

```typescript
// app/api/protected/route.ts
import { rbacMiddleware } from '../../../lib/middleware/rbac'

export const GET = rbacMiddleware.authenticated()(
  async (request) => {
    // User is authenticated but no specific permissions required
    return NextResponse.json({ user: request.user })
  }
)
```

### Organization Context

```typescript
// app/api/organizations/[id]/members/route.ts
import { rbacMiddleware } from '../../../../lib/middleware/rbac'

export const GET = rbacMiddleware.organizationMember()(
  async (request) => {
    // User is a member of the organization
    // Organization ID is extracted from URL path
    const { organization, rbacContext } = request
    return NextResponse.json({ 
      members: [], // Get members logic here
      permissions: rbacContext.permissions 
    })
  }
)
```

### Multiple Permission Requirements

```typescript
// app/api/admin/users/route.ts
import { rbacMiddleware } from '../../../lib/middleware/rbac'

// User needs ALL specified permissions
export const POST = rbacMiddleware.requirePermissions(['users:write', 'roles:manage'], true)(
  async (request) => {
    // User has both users:write AND roles:manage permissions
    return NextResponse.json({ message: 'User created with role assignment' })
  }
)

// User needs ANY of the specified permissions
export const GET = rbacMiddleware.requirePermissions(['users:read', 'organizations:admin'])(
  async (request) => {
    // User has either users:read OR organizations:admin permission
    return NextResponse.json({ users: [] })
  }
)
```

### Custom Permission Logic

```typescript
// app/api/custom/route.ts
import { withRBAC } from '../../../lib/middleware/rbac'

export const POST = withRBAC({
  permissions: ['content:write'],
  requireAll: false,
  organizationRequired: true,
  allowSuperAdmin: true
})(async (request) => {
  // Custom logic here
  const { user, organization, rbacContext } = request
  
  // Additional permission checks if needed
  if (someCondition) {
    const hasSpecialPermission = rbacContext.permissions.includes('special:permission')
    if (!hasSpecialPermission) {
      return NextResponse.json({ error: 'Special permission required' }, { status: 403 })
    }
  }
  
  return NextResponse.json({ success: true })
})
```

## Error Handling

The RBAC system provides consistent error responses:

```typescript
// 401 Unauthorized - User not authenticated
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 403 Forbidden - User lacks permissions
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions for this action",
    "details": {
      "requiredPermissions": ["users:write"]
    }
  }
}

// 400 Bad Request - Organization context required
{
  "error": {
    "code": "ORGANIZATION_REQUIRED",
    "message": "Organization context required"
  }
}
```

## Best Practices

### 1. Use Appropriate Middleware

- Use `rbacMiddleware.authenticated()` for routes that only need authentication
- Use `rbacMiddleware.organizationMember()` for organization-scoped resources
- Use `rbacMiddleware.requirePermissions()` for specific permission requirements

### 2. Permission Granularity

- Keep permissions granular but not overly complex
- Use resource:action pattern consistently
- Group related permissions logically

### 3. Error Handling

- Always handle permission errors gracefully
- Provide meaningful error messages to users
- Log security events for audit purposes

### 4. Testing

- Test both positive and negative permission scenarios
- Verify that unauthorized users cannot access protected resources
- Test role assignment and revocation workflows

### 5. Organization Context

- Always specify organization context for multi-tenant operations
- Use URL parameters, headers, or query parameters to pass organization ID
- Validate organization membership before performing operations

## Common Patterns

### Conditional UI Rendering

```typescript
// In React components
const { user, organization } = useAuth()
const [permissions, setPermissions] = useState<string[]>([])

useEffect(() => {
  if (user && organization) {
    // Fetch user permissions for current organization
    fetchUserPermissions(user.id, organization.id)
      .then(setPermissions)
  }
}, [user, organization])

// Conditionally render based on permissions
{permissions.includes('users:write') && (
  <CreateUserButton />
)}

{permissions.includes('organizations:admin') && (
  <AdminPanel />
)}
```

### Service Layer Integration

```typescript
// In service classes
class UserService {
  async createUser(userId: string, organizationId: string, userData: any) {
    // Check permissions before performing operation
    const canCreateUsers = await rbacService.hasPermission(
      userId, organizationId, 'users:write'
    )
    
    if (!canCreateUsers) {
      throw new Error('Insufficient permissions to create users')
    }
    
    // Proceed with user creation
    return this.performUserCreation(userData)
  }
}
```

This RBAC system provides a comprehensive foundation for managing access control in the C9d.ai platform while maintaining flexibility and security.