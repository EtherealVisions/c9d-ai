# Role-Based Access Control (RBAC) System

This document describes the RBAC system implementation for the Account Management & Organizational Modeling feature.

## Overview

The RBAC system provides fine-grained access control for users within organizations. It consists of:

1. **RBACService** - Core service for permission checking and role management
2. **RBAC Middleware** - API route protection middleware
3. **Permission System** - Granular permissions for resources and actions

## Components

### RBACService (`lib/services/rbac-service.ts`)

The main service class that handles all RBAC operations:

#### Permission Checking Methods
- `hasPermission(userId, organizationId, permission)` - Check if user has a specific permission
- `hasPermissions(userId, organizationId, permissions)` - Check multiple permissions at once
- `hasAnyPermission(userId, organizationId, permissions)` - Check if user has any of the specified permissions (OR logic)
- `hasAllPermissions(userId, organizationId, permissions)` - Check if user has all specified permissions (AND logic)

#### Role Management Methods
- `getUserRoles(userId, organizationId)` - Get all roles for a user in an organization
- `getUserPermissions(userId, organizationId)` - Get aggregated permissions from all user roles
- `assignRole(userId, organizationId, roleId)` - Assign a role to a user
- `revokeRole(userId, organizationId, roleId)` - Revoke a role from a user (assigns default member role)

#### Role CRUD Operations
- `createRole(organizationId, roleData)` - Create a new role within an organization
- `updateRole(roleId, updates)` - Update an existing role
- `deleteRole(roleId)` - Delete a role (only if not system role and not assigned to users)
- `getOrganizationRoles(organizationId)` - Get all roles within an organization

#### Utility Methods
- `validateResourceAccess(userId, organizationId, resource, action, resourceId?)` - Validate access to a specific resource
- `getRBACContext(userId, organizationId)` - Get complete RBAC context for a user
- `getAvailablePermissions()` - Get all available permissions in the system

### RBAC Middleware (`lib/middleware/rbac.ts`)

Middleware functions for protecting API routes:

#### Core Middleware
- `withAuth()` - Basic authentication middleware
- `withRBAC(options)` - Full RBAC middleware with permission checking

#### Convenience Middleware
- `rbacMiddleware.authenticated()` - Require user authentication
- `rbacMiddleware.organizationMember()` - Require organization membership
- `rbacMiddleware.organizationAdmin()` - Require organization admin permissions
- `rbacMiddleware.memberManager()` - Require member management permissions
- `rbacMiddleware.roleManager()` - Require role management permissions
- `rbacMiddleware.requirePermissions(permissions, requireAll?)` - Require specific permissions
- `rbacMiddleware.systemAdmin()` - Require system admin permissions

#### Helper Functions
- `checkPermission(userId, organizationId, permission)` - Helper for permission checking in route handlers
- `getRBACContext(userId, organizationId)` - Helper for getting RBAC context
- `createRBACErrorResponse(code, message, status, details?)` - Helper for creating error responses

## Usage Examples

### Using RBACService

```typescript
import { rbacService } from '../lib/services/rbac-service'

// Check if user has permission
const canRead = await rbacService.hasPermission(userId, orgId, 'users:read')

// Check multiple permissions
const permissions = await rbacService.hasPermissions(userId, orgId, [
  'users:read', 'users:write', 'users:delete'
])

// Get user's roles and permissions
const roles = await rbacService.getUserRoles(userId, orgId)
const userPermissions = await rbacService.getUserPermissions(userId, orgId)

// Create a new role
const newRole = await rbacService.createRole(orgId, {
  name: 'Editor',
  description: 'Can edit content',
  permissions: ['content:read', 'content:write']
})

// Assign role to user
await rbacService.assignRole(userId, orgId, newRole.id)
```

### Using RBAC Middleware

```typescript
import { rbacMiddleware } from '../lib/middleware/rbac'

// Protect route with organization membership requirement
export const GET = rbacMiddleware.organizationMember()(
  async (request) => {
    // User is authenticated and is a member of the organization
    return NextResponse.json({ data: 'protected data' })
  }
)

// Protect route with specific permissions
export const POST = rbacMiddleware.requirePermissions(['users:write'])(
  async (request) => {
    // User has the required permission
    return NextResponse.json({ message: 'User created' })
  }
)

// Protect route with admin permissions
export const DELETE = rbacMiddleware.organizationAdmin()(
  async (request) => {
    // User is an admin of the organization
    return NextResponse.json({ message: 'Resource deleted' })
  }
)
```

### Custom Permission Checking

```typescript
import { withRBAC } from '../lib/middleware/rbac'

export const PUT = withRBAC({
  permissions: ['content:write', 'content:publish'],
  requireAll: true, // User must have ALL permissions
  organizationRequired: true
})(async (request) => {
  // User has both content:write AND content:publish permissions
  return NextResponse.json({ message: 'Content published' })
})
```

## Permission Format

Permissions follow the format: `resource:action`

Examples:
- `users:read` - Read user information
- `users:write` - Create/update users
- `users:delete` - Delete users
- `organizations:admin` - Full organization administration
- `roles:manage` - Manage roles and permissions
- `content:publish` - Publish content
- `system:admin` - System-wide administration

## Database Schema

The RBAC system uses the following database tables:

- `users` - User accounts
- `organizations` - Organization/tenant entities
- `roles` - Roles within organizations
- `permissions` - System-wide permissions
- `organization_memberships` - User-organization relationships with roles

## Security Features

1. **Tenant Isolation** - All operations are scoped to specific organizations
2. **Role Hierarchy** - System roles cannot be deleted or modified
3. **Permission Aggregation** - Users inherit permissions from all assigned roles
4. **Error Handling** - Graceful degradation when permission checks fail
5. **Audit Logging** - All RBAC operations can be logged for security auditing

## Testing

The RBAC system includes unit tests that verify:

- Service instantiation and method availability
- Permission checking logic with mocked data
- Error handling for database failures
- Role management operations

Run tests with:
```bash
npm test -- lib/services/__tests__/rbac-service.test.ts --run
```

## Demo Endpoint

A demo endpoint is available at `/api/rbac-demo` that shows the RBAC middleware in action:

- `GET` - Requires organization membership
- `POST` - Requires organization admin permissions  
- `PUT` - Requires specific permissions (`users:write` and `roles:manage`)

This endpoint returns the user's RBAC context including their permissions and roles.