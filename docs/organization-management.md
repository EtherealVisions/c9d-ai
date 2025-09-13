# Organization Management

## Overview

The C9D AI platform provides comprehensive organization management capabilities, allowing users to create, join, and manage multiple organizations. Each organization operates as an isolated tenant with its own data, members, and permissions.

## Key Features

### Multi-Organization Support
- Users can belong to multiple organizations simultaneously
- Seamless switching between organization contexts
- Organization-scoped data and permissions
- Persistent organization selection across sessions

### Role-Based Access Control
- Flexible role system with customizable permissions
- Organization-specific role assignments
- Fine-grained permission checking
- Hierarchical permission inheritance

### Member Management
- Invite users via email
- Manage member roles and permissions
- Remove members from organizations
- Track member activity and audit logs

## Organization Structure

### Organization Entity

```typescript
interface Organization {
  id: string                    // Unique organization identifier
  name: string                  // Organization display name
  slug: string                  // URL-friendly identifier
  description: string | null    // Optional description
  avatarUrl: string | null      // Organization logo/avatar
  metadata: Record<string, unknown>  // Custom metadata
  settings: Record<string, unknown>  // Organization settings
  createdAt: string            // Creation timestamp
  updatedAt: string            // Last update timestamp
}
```

### Membership Entity

```typescript
interface OrganizationMembership {
  id: string                   // Unique membership identifier
  userId: string               // User ID
  organizationId: string       // Organization ID
  role: string                 // User role in organization
  status: 'active' | 'inactive' | 'pending'  // Membership status
  joinedAt: string            // Join timestamp
  updatedAt: string           // Last update timestamp
}
```

### Invitation Entity

```typescript
interface Invitation {
  id: string                   // Unique invitation identifier
  organizationId: string       // Target organization
  email: string               // Invitee email address
  role: string                // Assigned role
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitedBy: string           // Inviter user ID
  expiresAt: string           // Expiration timestamp
  createdAt: string           // Creation timestamp
  updatedAt?: string          // Update timestamp
}
```

## Using Organization Management

### Authentication Context Integration

The organization management system is fully integrated with the authentication context:

```typescript
import { useAuth, useCurrentOrganization } from '@/lib/contexts/auth-context'

function OrganizationDashboard() {
  const { 
    organizations, 
    currentOrganization, 
    switchOrganization,
    refreshOrganizations 
  } = useAuth()
  
  const { organization, membership } = useCurrentOrganization()
  
  return (
    <div>
      <h1>{organization?.name} Dashboard</h1>
      <p>Your role: {membership?.role}</p>
      
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
    </div>
  )
}
```

### Organization Switching

Users can switch between organizations seamlessly:

```typescript
import { useAuth } from '@/lib/contexts/auth-context'

function OrganizationSwitcher() {
  const { organizations, currentOrganization, switchOrganization } = useAuth()
  
  const handleSwitch = async (organizationId: string) => {
    try {
      await switchOrganization(organizationId)
      // Organization context is now updated
      // User permissions are refreshed
      // UI will re-render with new context
    } catch (error) {
      console.error('Failed to switch organization:', error)
    }
  }
  
  return (
    <div className="organization-switcher">
      {organizations.map(org => (
        <button
          key={org.id}
          onClick={() => handleSwitch(org.id)}
          className={org.id === currentOrganization?.id ? 'active' : ''}
        >
          <img src={org.avatarUrl} alt={org.name} />
          <span>{org.name}</span>
        </button>
      ))}
    </div>
  )
}
```

### Permission Checking

Check user permissions within the current organization:

```typescript
import { usePermissions } from '@/lib/contexts/auth-context'

function AdminPanel() {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission('admin.access')) {
    return <div>Access denied</div>
  }
  
  return (
    <div>
      <h1>Admin Panel</h1>
      
      {hasPermission('members.invite') && (
        <InviteMemberButton />
      )}
      
      {hasPermission('settings.edit') && (
        <OrganizationSettings />
      )}
      
      {hasPermission('billing.manage') && (
        <BillingSection />
      )}
    </div>
  )
}
```

## API Integration

### Fetching Organizations

```typescript
// Get all user organizations
const response = await fetch('/api/organizations')
const { organizations } = await response.json()

// Get specific organization
const orgResponse = await fetch(`/api/organizations/${organizationId}`)
const { organization } = await orgResponse.json()
```

### Managing Memberships

```typescript
// Get user's membership in organization
const membershipResponse = await fetch(`/api/organizations/${orgId}/membership`)
const { membership, permissions } = await membershipResponse.json()

// Get all organization members
const membersResponse = await fetch(`/api/organizations/${orgId}/members`)
const { members } = await membersResponse.json()
```

### Invitation Management

```typescript
// Send invitation
const inviteResponse = await fetch(`/api/organizations/${orgId}/invitations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    role: 'member'
  })
})

// Accept invitation
const acceptResponse = await fetch(`/api/invitations/${invitationId}/accept`, {
  method: 'POST'
})
```

## Role System

### Default Roles

The platform includes several default roles with predefined permissions:

#### Owner
- Full administrative access
- Can manage all organization settings
- Can invite/remove members
- Can assign roles to other members
- Can delete the organization

**Permissions:**
- `admin.full_access`
- `members.manage`
- `settings.edit`
- `billing.manage`
- `data.full_access`

#### Admin
- Administrative access with some restrictions
- Can manage members and settings
- Cannot delete the organization
- Cannot remove owners

**Permissions:**
- `admin.access`
- `members.invite`
- `members.manage`
- `settings.edit`
- `data.manage`

#### Member
- Standard user access
- Can view organization data
- Can edit their own profile
- Limited administrative capabilities

**Permissions:**
- `data.read`
- `data.write`
- `profile.edit`

#### Viewer
- Read-only access
- Can view organization data
- Cannot modify anything

**Permissions:**
- `data.read`

### Custom Roles

Organizations can create custom roles with specific permission sets:

```typescript
interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  organizationId: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
```

### Permission System

Permissions are hierarchical and follow a dot notation:

```
admin.access              # Administrative access
admin.full_access         # Full administrative access

members.view              # View member list
members.invite            # Invite new members
members.manage            # Manage existing members

settings.view             # View organization settings
settings.edit             # Edit organization settings

billing.view              # View billing information
billing.manage            # Manage billing and subscriptions

data.read                 # Read organization data
data.write                # Write organization data
data.manage               # Manage data structure
data.full_access          # Full data access including deletion
```

## Organization Settings

### General Settings

```typescript
interface OrganizationSettings {
  // General
  name: string
  description?: string
  avatarUrl?: string
  
  // Features
  features: {
    analytics: boolean
    apiAccess: boolean
    customBranding: boolean
    ssoEnabled: boolean
  }
  
  // Security
  security: {
    requireTwoFactor: boolean
    sessionTimeout: number
    ipWhitelist?: string[]
    allowedDomains?: string[]
  }
  
  // Notifications
  notifications: {
    emailNotifications: boolean
    slackIntegration?: {
      webhookUrl: string
      channel: string
    }
  }
  
  // Billing
  billing: {
    plan: string
    billingEmail: string
    invoiceSettings: {
      autoPayment: boolean
      currency: string
    }
  }
}
```

### Settings Management

```typescript
import { useAuth } from '@/lib/contexts/auth-context'

function OrganizationSettings() {
  const { currentOrganization, hasPermission } = useAuth()
  const [settings, setSettings] = useState(currentOrganization?.settings)
  
  if (!hasPermission('settings.edit')) {
    return <div>You don't have permission to edit settings</div>
  }
  
  const handleSave = async (newSettings) => {
    const response = await fetch(`/api/organizations/${currentOrganization.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: newSettings })
    })
    
    if (response.ok) {
      setSettings(newSettings)
      // Refresh organization data
      await refreshOrganizations()
    }
  }
  
  return (
    <div>
      <h1>Organization Settings</h1>
      <SettingsForm 
        settings={settings} 
        onSave={handleSave}
      />
    </div>
  )
}
```

## Member Management

### Inviting Members

```typescript
function InviteMember() {
  const { currentOrganization } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  
  const handleInvite = async () => {
    const response = await fetch(`/api/organizations/${currentOrganization.id}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    })
    
    if (response.ok) {
      // Invitation sent successfully
      setEmail('')
      setRole('member')
    }
  }
  
  return (
    <form onSubmit={handleInvite}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
      />
      
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="member">Member</option>
        <option value="admin">Admin</option>
        <option value="viewer">Viewer</option>
      </select>
      
      <button type="submit">Send Invitation</button>
    </form>
  )
}
```

### Managing Existing Members

```typescript
function MemberList() {
  const { currentOrganization, hasPermission } = useAuth()
  const [members, setMembers] = useState([])
  
  useEffect(() => {
    fetchMembers()
  }, [currentOrganization])
  
  const fetchMembers = async () => {
    const response = await fetch(`/api/organizations/${currentOrganization.id}/members`)
    const { members } = await response.json()
    setMembers(members)
  }
  
  const updateMemberRole = async (memberId, newRole) => {
    const response = await fetch(`/api/organizations/${currentOrganization.id}/members/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })
    
    if (response.ok) {
      await fetchMembers()
    }
  }
  
  const removeMember = async (memberId) => {
    const response = await fetch(`/api/organizations/${currentOrganization.id}/members/${memberId}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      await fetchMembers()
    }
  }
  
  return (
    <div>
      <h2>Organization Members</h2>
      {members.map(member => (
        <div key={member.id} className="member-item">
          <div>
            <img src={member.user.avatarUrl} alt={member.user.firstName} />
            <span>{member.user.firstName} {member.user.lastName}</span>
            <span>{member.user.email}</span>
          </div>
          
          <div>
            <span>Role: {member.role}</span>
            
            {hasPermission('members.manage') && (
              <div>
                <select 
                  value={member.role} 
                  onChange={(e) => updateMemberRole(member.id, e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                
                <button onClick={() => removeMember(member.id)}>
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Data Isolation

### Tenant Isolation

Each organization operates as a separate tenant with isolated data:

```sql
-- Row Level Security (RLS) policies ensure data isolation
CREATE POLICY "Users can only access their organization's data" 
ON projects FOR ALL 
USING (organization_id IN (
  SELECT organization_id 
  FROM organization_memberships 
  WHERE user_id = auth.uid() 
  AND status = 'active'
));
```

### Database Schema

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization memberships
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Security Considerations

### Access Control
- All organization data is protected by Row Level Security (RLS)
- Users can only access organizations they belong to
- Permissions are validated on every request
- Organization switching requires membership validation

### Data Protection
- Organization data is encrypted at rest
- API endpoints validate organization membership
- Audit logs track all organization changes
- Sensitive operations require additional authentication

### Best Practices
- Always validate organization membership server-side
- Use organization-scoped queries for all data access
- Implement proper error handling for permission failures
- Regular security audits and access reviews

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { useAuth } from '@/lib/contexts/auth-context'
import { renderHook } from '@testing-library/react'

describe('Organization Management', () => {
  it('should switch organizations correctly', async () => {
    const { result } = renderHook(() => useAuth())
    
    await result.current.switchOrganization('org_123')
    
    expect(result.current.currentOrganization?.id).toBe('org_123')
  })
  
  it('should check permissions correctly', () => {
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.hasPermission('admin.access')).toBe(true)
    expect(result.current.hasPermission('invalid.permission')).toBe(false)
  })
})
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest'

describe('Organization API', () => {
  it('should create organization successfully', async () => {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        name: 'Test Organization',
        slug: 'test-org'
      })
    })
    
    expect(response.status).toBe(201)
    
    const { organization } = await response.json()
    expect(organization.name).toBe('Test Organization')
    expect(organization.slug).toBe('test-org')
  })
})
```

## Troubleshooting

### Common Issues

1. **Organization not switching**
   - Check network connectivity
   - Verify user has membership in target organization
   - Check browser console for errors

2. **Permission denied errors**
   - Verify user role and permissions
   - Check organization membership status
   - Ensure proper API authentication

3. **Invitation not working**
   - Check email address format
   - Verify sender has invitation permissions
   - Check invitation expiration

### Debug Mode

Enable organization debug logging:

```javascript
localStorage.setItem('org-debug', 'true')
```

This will log organization operations to the console.

## Related Documentation

- [Authentication Context](./authentication-context.md)
- [Authentication API](./api/authentication.md)
- [Permission System](./permissions.md)
- [User Management](./user-management.md)
- [Security Guidelines](./security.md)