# Authentication API Documentation

## Overview

The authentication API provides endpoints for user authentication, organization management, and permission handling. It integrates with Clerk for authentication and provides additional user and organization data management.

## Base URL

All API endpoints are relative to your application's base URL:
```
https://your-app.vercel.app/api
```

## Authentication

All API endpoints require authentication via Clerk JWT tokens. The token is automatically included in requests when using the authentication context.

### Headers

```http
Authorization: Bearer <clerk-jwt-token>
Content-Type: application/json
```

## Endpoints

### User Authentication

#### GET /api/auth/me

Retrieves the current authenticated user's information and associated organizations.

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "clerkUserId": "clerk_456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "preferences": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "organizations": [
    {
      "id": "org_123",
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "description": "A leading technology company",
      "avatarUrl": "https://example.com/org-avatar.jpg",
      "metadata": {},
      "settings": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing authentication token
- `500 Internal Server Error` - Server error during user data retrieval

### Organization Management

#### GET /api/organizations

Retrieves all organizations the current user belongs to.

**Response:**
```json
{
  "organizations": [
    {
      "id": "org_123",
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "description": "A leading technology company",
      "avatarUrl": "https://example.com/org-avatar.jpg",
      "metadata": {},
      "settings": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/organizations/{organizationId}/membership

Retrieves the current user's membership details and permissions for a specific organization.

**Parameters:**
- `organizationId` (string, required) - The organization ID

**Response:**
```json
{
  "membership": {
    "id": "membership_123",
    "userId": "user_123",
    "organizationId": "org_123",
    "role": "admin",
    "status": "active",
    "joinedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "permissions": [
    "admin.access",
    "users.manage",
    "settings.edit",
    "billing.view",
    "billing.edit"
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing authentication token
- `403 Forbidden` - User is not a member of the organization
- `404 Not Found` - Organization does not exist
- `500 Internal Server Error` - Server error during membership retrieval

#### POST /api/organizations

Creates a new organization.

**Request Body:**
```json
{
  "name": "New Organization",
  "slug": "new-org",
  "description": "Organization description"
}
```

**Response:**
```json
{
  "organization": {
    "id": "org_456",
    "name": "New Organization",
    "slug": "new-org",
    "description": "Organization description",
    "avatarUrl": null,
    "metadata": {},
    "settings": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing authentication token
- `409 Conflict` - Organization slug already exists
- `500 Internal Server Error` - Server error during organization creation

#### PUT /api/organizations/{organizationId}

Updates an existing organization.

**Parameters:**
- `organizationId` (string, required) - The organization ID

**Request Body:**
```json
{
  "name": "Updated Organization Name",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "organization": {
    "id": "org_123",
    "name": "Updated Organization Name",
    "slug": "acme-corp",
    "description": "Updated description",
    "avatarUrl": "https://example.com/org-avatar.jpg",
    "metadata": {},
    "settings": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing authentication token
- `403 Forbidden` - User does not have permission to edit organization
- `404 Not Found` - Organization does not exist
- `500 Internal Server Error` - Server error during organization update

### User Management

#### GET /api/users/{userId}

Retrieves user information by user ID.

**Parameters:**
- `userId` (string, required) - The user ID

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "clerkUserId": "clerk_456",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "preferences": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing authentication token
- `403 Forbidden` - User does not have permission to view user data
- `404 Not Found` - User does not exist
- `500 Internal Server Error` - Server error during user retrieval

#### PUT /api/users/{userId}

Updates user information.

**Parameters:**
- `userId` (string, required) - The user ID

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "clerkUserId": "clerk_456",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "avatarUrl": "https://example.com/avatar.jpg",
    "preferences": {
      "theme": "dark",
      "notifications": true
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing authentication token
- `403 Forbidden` - User does not have permission to edit user data
- `404 Not Found` - User does not exist
- `500 Internal Server Error` - Server error during user update

### Invitations

#### POST /api/organizations/{organizationId}/invitations

Invites a user to join an organization.

**Parameters:**
- `organizationId` (string, required) - The organization ID

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

**Response:**
```json
{
  "invitation": {
    "id": "invitation_123",
    "organizationId": "org_123",
    "email": "newuser@example.com",
    "role": "member",
    "status": "pending",
    "invitedBy": "user_123",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid or missing authentication token
- `403 Forbidden` - User does not have permission to invite users
- `409 Conflict` - User is already a member or has pending invitation
- `500 Internal Server Error` - Server error during invitation creation

#### GET /api/organizations/{organizationId}/invitations

Retrieves all pending invitations for an organization.

**Parameters:**
- `organizationId` (string, required) - The organization ID

**Response:**
```json
{
  "invitations": [
    {
      "id": "invitation_123",
      "organizationId": "org_123",
      "email": "newuser@example.com",
      "role": "member",
      "status": "pending",
      "invitedBy": "user_123",
      "expiresAt": "2024-01-08T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/invitations/{invitationId}/accept

Accepts an organization invitation.

**Parameters:**
- `invitationId` (string, required) - The invitation ID

**Response:**
```json
{
  "membership": {
    "id": "membership_456",
    "userId": "user_456",
    "organizationId": "org_123",
    "role": "member",
    "status": "active",
    "joinedAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid invitation or already processed
- `401 Unauthorized` - Invalid or missing authentication token
- `404 Not Found` - Invitation does not exist or has expired
- `500 Internal Server Error` - Server error during invitation acceptance

## Data Models

### User

```typescript
interface User {
  id: string
  clerkUserId: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  preferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

### Organization

```typescript
interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  avatarUrl: string | null
  metadata: Record<string, unknown>
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}
```

### OrganizationMembership

```typescript
interface OrganizationMembership {
  id: string
  userId: string
  organizationId: string
  role: string
  status: 'active' | 'inactive' | 'pending'
  joinedAt: string
  updatedAt: string
}
```

### Invitation

```typescript
interface Invitation {
  id: string
  organizationId: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitedBy: string
  expiresAt: string
  createdAt: string
  updatedAt?: string
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `CONFLICT` - Resource already exists
- `INTERNAL_ERROR` - Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 10 requests per minute per IP
- **User endpoints**: 100 requests per minute per user
- **Organization endpoints**: 50 requests per minute per user
- **Invitation endpoints**: 20 requests per minute per user

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

### Clerk Webhooks

The application handles Clerk webhook events at `/api/webhooks/clerk`:

#### Supported Events

- `user.created` - New user registration
- `user.updated` - User profile updates
- `user.deleted` - User account deletion

#### Webhook Payload

```json
{
  "type": "user.created",
  "data": {
    "id": "clerk_user_id",
    "email_addresses": [
      {
        "email_address": "user@example.com"
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://example.com/avatar.jpg"
  }
}
```

## SDK Usage

### JavaScript/TypeScript

```typescript
import { useAuth } from '@/lib/contexts/auth-context'

function MyComponent() {
  const { user, organizations, switchOrganization, hasPermission } = useAuth()
  
  // Check permissions
  if (!hasPermission('admin.access')) {
    return <div>Access denied</div>
  }
  
  // Switch organization
  const handleOrgChange = (orgId: string) => {
    switchOrganization(orgId)
  }
  
  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      <select onChange={(e) => handleOrgChange(e.target.value)}>
        {organizations.map(org => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
    </div>
  )
}
```

### Direct API Calls

```typescript
// Fetch user data
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  }
})

const { user, organizations } = await response.json()

// Switch organization context
const membershipResponse = await fetch(`/api/organizations/${orgId}/membership`, {
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  }
})

const { membership, permissions } = await membershipResponse.json()
```

## Testing

### Mock API Responses

```typescript
// Mock user data
const mockUser = {
  id: 'user_123',
  clerkUserId: 'clerk_456',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatarUrl: null,
  preferences: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}

// Mock organization data
const mockOrganization = {
  id: 'org_123',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization',
  avatarUrl: null,
  metadata: {},
  settings: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
}
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest'

describe('Authentication API', () => {
  it('should return user data for authenticated request', async () => {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${testToken}` }
    })
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.user).toBeDefined()
    expect(data.organizations).toBeDefined()
  })
  
  it('should return 401 for unauthenticated request', async () => {
    const response = await fetch('/api/auth/me')
    expect(response.status).toBe(401)
  })
})
```

## Security Considerations

### Authentication
- All endpoints require valid Clerk JWT tokens
- Tokens are validated on every request
- User context is established from token claims

### Authorization
- Permission-based access control
- Organization-scoped data access
- Role-based feature access

### Data Protection
- Sensitive user data is filtered before client exposure
- Organization data is isolated by membership
- Audit logging for sensitive operations

### Best Practices
- Always validate permissions on the server side
- Use HTTPS for all API communications
- Implement proper error handling without exposing sensitive information
- Regular security audits and updates

## Related Documentation

- [Authentication Context](../authentication-context.md)
- [Authentication Setup](../authentication-setup.md)
- [Organization Management](../organization-management.md)
- [Permission System](../permissions.md)
- [Testing Authentication](../testing/auth-testing.md)