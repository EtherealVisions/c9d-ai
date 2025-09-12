# Tenant Isolation and Security Enforcement

This document describes the comprehensive tenant isolation and security enforcement system implemented for the Account Management & Organizational Modeling feature.

## Overview

The tenant isolation system ensures that users can only access data and resources belonging to organizations they are members of. It provides multiple layers of security:

1. **Database-level Row Level Security (RLS) policies**
2. **Application-level tenant validation**
3. **API middleware enforcement**
4. **Comprehensive security audit logging**
5. **Cross-tenant access prevention**

## Components

### 1. Security Audit Service (`security-audit-service.ts`)

Provides comprehensive audit logging for all account and organization operations with automatic security event detection.

#### Key Features:
- **Event Severity Classification**: Automatically classifies events as low, medium, high, or critical
- **Tenant Isolation Violation Detection**: Logs and alerts on cross-tenant access attempts
- **Suspicious Activity Detection**: Identifies patterns like multiple failed logins, permission escalation attempts
- **Security Event Aggregation**: Provides security summaries and risk scoring

#### Usage:
```typescript
import { securityAuditService } from '@/lib/services/security-audit-service'

// Log authentication events
await securityAuditService.logAuthenticationEvent(
  userId,
  'login_failed',
  { reason: 'invalid_password' },
  clientIp,
  userAgent
)

// Log tenant isolation violations
await securityAuditService.logTenantIsolationViolation({
  userId,
  attemptedOrganizationId,
  actualOrganizationIds,
  action: 'organization.read',
  resourceType: 'organization',
  timestamp: new Date()
})

// Detect suspicious activity
const analysis = await securityAuditService.detectSuspiciousActivity(userId, organizationId)
```

### 2. Tenant Isolation Middleware (`tenant-isolation.ts`)

Enforces strict tenant boundaries at the API level and prevents cross-tenant data access.

#### Key Features:
- **Organization Context Extraction**: Automatically extracts organization ID from headers, query params, or path
- **Tenant Access Validation**: Verifies user membership in requested organization
- **Security Event Logging**: Logs all access attempts and violations
- **Request Enhancement**: Adds tenant context to requests for downstream processing

#### Usage:
```typescript
import { tenantIsolation } from '@/lib/middleware/tenant-isolation'

// Require organization context
export const GET = tenantIsolation.withOrganization()(async (request) => {
  // request.user and request.organization are guaranteed to be available
  // User has been validated as a member of the organization
})

// Authenticated user, organization optional
export const GET = tenantIsolation.authenticated()(async (request) => {
  // request.user is guaranteed to be available
})
```

### 3. Enhanced Database Client (`database.ts`)

The database client has been enhanced with tenant-aware operations and validation.

#### Key Features:
- **Tenant Context Management**: Maintains user and organization context
- **Cross-Tenant Access Prevention**: Validates tenant access before database operations
- **RLS Policy Integration**: Works with Supabase RLS policies for defense in depth

#### Usage:
```typescript
const db = createTypedSupabaseClient()

// Set user context for tenant isolation
db.setUserContext(userId, organizationId)

// Operations automatically validate tenant access
const organization = await db.getOrganization(orgId, userId)
```

### 4. Enhanced Services

All services have been updated to use tenant isolation and security audit logging:

- **OrganizationService**: Validates tenant access for all organization operations
- **MembershipService**: Prevents cross-tenant membership access
- **UserService**: Logs user account activities
- **RBACService**: Enforces permission boundaries within organizations

## Security Features

### 1. Multi-Layer Defense

The system implements defense in depth with multiple security layers:

1. **Database RLS Policies**: First line of defense at the database level
2. **Application Validation**: Service-level tenant access validation
3. **API Middleware**: Request-level tenant isolation enforcement
4. **Audit Logging**: Comprehensive logging of all security events

### 2. Tenant Isolation Violations

The system actively detects and logs tenant isolation violations:

- **Cross-Tenant Access Attempts**: When users try to access resources from organizations they don't belong to
- **Permission Escalation**: Multiple permission denied events
- **Suspicious Activity Patterns**: Unusual access patterns or failed authentication attempts

### 3. Security Event Classification

Events are automatically classified by severity:

- **Low**: Normal operations (login, data read)
- **Medium**: Failed authentication, permission denied, data deletion
- **High**: System errors, validation failures
- **Critical**: Tenant isolation violations, security breaches

### 4. Real-time Monitoring

The system provides real-time security monitoring:

- **High-severity events** are immediately logged to console
- **Critical events** trigger additional alerting
- **Security summaries** provide organizational security overviews
- **Risk scoring** identifies high-risk users or activities

## API Integration

### Enhanced API Routes

All API routes have been updated to use tenant isolation middleware:

```typescript
// Before
export async function GET(request: NextRequest) {
  const { userId } = await auth()
  // Manual authentication and validation
}

// After
export const GET = tenantIsolation.withOrganization()(async (request) => {
  // Automatic authentication, tenant validation, and security logging
  // request.user and request.organization are guaranteed
})
```

### Error Responses

The system provides consistent error responses for security violations:

```json
{
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "Access denied to organization resources",
    "timestamp": "2025-09-12T03:31:25.279Z",
    "type": "TENANT_ISOLATION_ERROR"
  }
}
```

## Database Schema

### RLS Policies

The system uses Supabase Row Level Security policies to enforce tenant isolation at the database level:

```sql
-- Users can only view organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
    )
  );
```

### Audit Logging

All security events are stored in the `audit_logs` table:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testing

### Security Tests

Comprehensive security tests verify tenant isolation:

- **Cross-tenant access prevention**
- **Security audit logging**
- **RLS policy enforcement**
- **Suspicious activity detection**
- **Error handling**

### Running Tests

```bash
# Run tenant isolation tests
npm test -- --run lib/services/__tests__/tenant-isolation-integration.test.ts

# Run all security tests
npm test -- --run lib/services/__tests__/tenant-isolation-security.test.ts
```

## Monitoring and Alerting

### Security Events

Monitor security events through the audit log:

```typescript
// Get security events for an organization
const events = await securityAuditService.getSecurityEvents({
  organizationId: 'org-123',
  severity: ['high', 'critical'],
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
})

// Get security summary
const summary = await securityAuditService.getSecuritySummary('org-123', 30)
```

### Risk Assessment

The system provides automated risk assessment:

```typescript
const riskAnalysis = await securityAuditService.detectSuspiciousActivity(userId, organizationId)

console.log('Risk Score:', riskAnalysis.riskScore)
console.log('Suspicious Patterns:', riskAnalysis.suspiciousPatterns)
console.log('Recommendations:', riskAnalysis.recommendations)
```

## Best Practices

### 1. Always Use Middleware

Use tenant isolation middleware for all API routes that access organization data:

```typescript
// ✅ Good
export const GET = tenantIsolation.withOrganization()(async (request) => {
  // Tenant validation is automatic
})

// ❌ Bad
export async function GET(request: NextRequest) {
  // Manual validation required, error-prone
}
```

### 2. Validate Service Access

Always pass user ID to service methods for tenant validation:

```typescript
// ✅ Good
const result = await organizationService.getOrganization(orgId, userId)

// ❌ Bad
const result = await organizationService.getOrganization(orgId)
```

### 3. Log Security Events

Log important security events for monitoring:

```typescript
// Log data access
await securityAuditService.logDataAccessEvent(
  userId,
  organizationId,
  'update',
  'organization',
  orgId,
  { updatedFields: ['name', 'description'] }
)
```

### 4. Handle Errors Gracefully

Always handle tenant isolation errors appropriately:

```typescript
if (result.code === 'TENANT_ACCESS_DENIED') {
  return NextResponse.json(
    { error: 'Access denied to organization' },
    { status: 403 }
  )
}
```

## Security Considerations

### 1. Defense in Depth

The system implements multiple security layers to prevent data breaches:
- Database RLS policies prevent unauthorized queries
- Application validation catches logic errors
- API middleware provides request-level protection
- Audit logging enables incident response

### 2. Fail Secure

The system is designed to fail securely:
- Access is denied by default
- Errors don't expose sensitive information
- Logging failures don't break main operations
- Unknown users/organizations are rejected

### 3. Monitoring and Response

Comprehensive monitoring enables rapid incident response:
- Real-time security event logging
- Automated suspicious activity detection
- Risk scoring and recommendations
- Audit trail for forensic analysis

## Troubleshooting

### Common Issues

1. **TENANT_ACCESS_DENIED errors**: User is not a member of the requested organization
2. **Missing organization context**: API route requires organization ID in header/path/query
3. **RLS policy violations**: Database-level access denied due to security policies
4. **High security event volume**: May indicate attack or misconfiguration

### Debug Mode

Enable debug logging to troubleshoot tenant isolation issues:

```typescript
// Check user organizations
const userOrgs = await db.getUserOrganizations(userId)
console.log('User organizations:', userOrgs.map(org => org.id))

// Validate specific access
const hasAccess = await securityAuditService.validateAndLogTenantAccess(
  userId,
  organizationId,
  'debug.check',
  'organization'
)
console.log('Has access:', hasAccess)
```

## Future Enhancements

1. **Real-time Alerting**: Integration with external alerting systems
2. **Advanced Analytics**: Machine learning for anomaly detection
3. **Compliance Reporting**: Automated compliance report generation
4. **Performance Optimization**: Caching for tenant validation
5. **Multi-region Support**: Cross-region tenant isolation