-- Row Level Security (RLS) policies for tenant isolation
-- This migration implements security policies to ensure proper data isolation between organizations

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')
  )::UUID
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID) 
RETURNS TABLE(organization_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM organization_memberships om
  JOIN users u ON u.id = om.user_id
  WHERE u.clerk_user_id = user_uuid::TEXT
    AND om.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Users table policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_user_id = auth.user_id()::TEXT);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (clerk_user_id = auth.user_id()::TEXT);

-- Users can insert their own profile (for initial sync from Clerk)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (clerk_user_id = auth.user_id()::TEXT);

-- Organizations table policies
-- Users can view organizations they belong to
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

-- Organization admins can update their organizations
CREATE POLICY "Organization admins can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      JOIN roles r ON r.id = om.role_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
        AND 'admin' = ANY(r.permissions)
    )
  );

-- Users can create organizations (they become the admin)
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

-- Organization memberships policies
-- Users can view memberships for organizations they belong to
CREATE POLICY "Users can view organization memberships" ON organization_memberships
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
    )
  );

-- Organization admins can manage memberships
CREATE POLICY "Organization admins can manage memberships" ON organization_memberships
  FOR ALL USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      JOIN roles r ON r.id = om.role_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
        AND 'admin' = ANY(r.permissions)
    )
  );

-- Users can accept invitations (insert their own membership)
CREATE POLICY "Users can accept invitations" ON organization_memberships
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Roles table policies
-- Users can view roles for organizations they belong to
CREATE POLICY "Users can view organization roles" ON roles
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
    )
    OR is_system_role = true
  );

-- Organization admins can manage roles
CREATE POLICY "Organization admins can manage roles" ON roles
  FOR ALL USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      JOIN roles r ON r.id = om.role_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
        AND 'admin' = ANY(r.permissions)
    )
  );

-- Permissions table policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.user_id() IS NOT NULL);

-- Invitations table policies
-- Users can view invitations for organizations they admin
CREATE POLICY "Organization admins can view invitations" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      JOIN roles r ON r.id = om.role_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
        AND 'admin' = ANY(r.permissions)
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations" ON invitations
  FOR SELECT USING (
    email IN (
      SELECT u.email
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Organization admins can manage invitations
CREATE POLICY "Organization admins can manage invitations" ON invitations
  FOR ALL USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      JOIN roles r ON r.id = om.role_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
        AND 'admin' = ANY(r.permissions)
    )
  );

-- Audit logs policies
-- Users can view audit logs for organizations they belong to
CREATE POLICY "Users can view organization audit logs" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT om.organization_id
      FROM organization_memberships om
      JOIN users u ON u.id = om.user_id
      WHERE u.clerk_user_id = auth.user_id()::TEXT
        AND om.status = 'active'
    )
    OR user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);