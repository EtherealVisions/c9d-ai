-- Seed data for system roles and permissions
-- This migration creates the initial system permissions and default roles

-- Insert system permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  -- User management permissions
  ('user.read', 'View user profiles and information', 'user', 'read'),
  ('user.update', 'Update user profiles and settings', 'user', 'update'),
  ('user.delete', 'Delete user accounts', 'user', 'delete'),
  
  -- Organization management permissions
  ('organization.read', 'View organization details and settings', 'organization', 'read'),
  ('organization.update', 'Update organization settings and metadata', 'organization', 'update'),
  ('organization.delete', 'Delete organizations', 'organization', 'delete'),
  ('organization.create', 'Create new organizations', 'organization', 'create'),
  
  -- Member management permissions
  ('member.read', 'View organization members and their roles', 'member', 'read'),
  ('member.invite', 'Invite new members to the organization', 'member', 'invite'),
  ('member.remove', 'Remove members from the organization', 'member', 'remove'),
  ('member.update_role', 'Update member roles and permissions', 'member', 'update_role'),
  
  -- Role management permissions
  ('role.read', 'View roles and their permissions', 'role', 'read'),
  ('role.create', 'Create new roles', 'role', 'create'),
  ('role.update', 'Update existing roles and permissions', 'role', 'update'),
  ('role.delete', 'Delete roles', 'role', 'delete'),
  
  -- Agent management permissions
  ('agent.read', 'View agents and their configurations', 'agent', 'read'),
  ('agent.create', 'Create new agents', 'agent', 'create'),
  ('agent.update', 'Update agent configurations', 'agent', 'update'),
  ('agent.delete', 'Delete agents', 'agent', 'delete'),
  ('agent.execute', 'Execute and run agents', 'agent', 'execute'),
  
  -- Dataset management permissions
  ('dataset.read', 'View datasets and their metadata', 'dataset', 'read'),
  ('dataset.create', 'Create and upload new datasets', 'dataset', 'create'),
  ('dataset.update', 'Update dataset metadata and content', 'dataset', 'update'),
  ('dataset.delete', 'Delete datasets', 'dataset', 'delete'),
  
  -- Audit and monitoring permissions
  ('audit.read', 'View audit logs and system activity', 'audit', 'read'),
  ('billing.read', 'View billing information and usage', 'billing', 'read'),
  ('billing.manage', 'Manage billing settings and subscriptions', 'billing', 'manage'),
  
  -- Administrative permissions
  ('admin', 'Full administrative access to all resources', 'system', 'admin'),
  ('system.configure', 'Configure system-wide settings', 'system', 'configure');

-- Function to create system roles for an organization
CREATE OR REPLACE FUNCTION create_system_roles_for_organization(org_id UUID)
RETURNS VOID AS $
DECLARE
  admin_role_id UUID;
  member_role_id UUID;
  viewer_role_id UUID;
BEGIN
  -- Create Admin role
  INSERT INTO roles (name, description, organization_id, is_system_role, permissions)
  VALUES (
    'Admin',
    'Full administrative access to the organization',
    org_id,
    true,
    ARRAY[
      'admin',
      'organization.read', 'organization.update', 'organization.delete',
      'member.read', 'member.invite', 'member.remove', 'member.update_role',
      'role.read', 'role.create', 'role.update', 'role.delete',
      'agent.read', 'agent.create', 'agent.update', 'agent.delete', 'agent.execute',
      'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete',
      'audit.read', 'billing.read', 'billing.manage'
    ]
  ) RETURNING id INTO admin_role_id;

  -- Create Member role
  INSERT INTO roles (name, description, organization_id, is_system_role, permissions)
  VALUES (
    'Member',
    'Standard member with access to agents and datasets',
    org_id,
    true,
    ARRAY[
      'organization.read',
      'member.read',
      'role.read',
      'agent.read', 'agent.create', 'agent.update', 'agent.execute',
      'dataset.read', 'dataset.create', 'dataset.update',
      'user.read', 'user.update'
    ]
  ) RETURNING id INTO member_role_id;

  -- Create Viewer role
  INSERT INTO roles (name, description, organization_id, is_system_role, permissions)
  VALUES (
    'Viewer',
    'Read-only access to organization resources',
    org_id,
    true,
    ARRAY[
      'organization.read',
      'member.read',
      'role.read',
      'agent.read',
      'dataset.read',
      'user.read'
    ]
  ) RETURNING id INTO viewer_role_id;

END;
$ LANGUAGE plpgsql;

-- Trigger function to automatically create system roles when an organization is created
CREATE OR REPLACE FUNCTION create_default_roles_trigger()
RETURNS TRIGGER AS $
BEGIN
  -- Create system roles for the new organization
  PERFORM create_system_roles_for_organization(NEW.id);
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger to automatically create system roles for new organizations
CREATE TRIGGER create_organization_default_roles
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_default_roles_trigger();

-- Function to assign admin role to organization creator
CREATE OR REPLACE FUNCTION assign_creator_admin_role()
RETURNS TRIGGER AS $
DECLARE
  admin_role_id UUID;
  creator_user_id UUID;
BEGIN
  -- Get the admin role for this organization
  SELECT id INTO admin_role_id
  FROM roles
  WHERE organization_id = NEW.id
    AND name = 'Admin'
    AND is_system_role = true;

  -- Get the current user ID (organization creator)
  SELECT u.id INTO creator_user_id
  FROM users u
  WHERE u.clerk_user_id = auth.user_id()::TEXT;

  -- Create membership with admin role for the creator
  IF admin_role_id IS NOT NULL AND creator_user_id IS NOT NULL THEN
    INSERT INTO organization_memberships (user_id, organization_id, role_id, status)
    VALUES (creator_user_id, NEW.id, admin_role_id, 'active');
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger to assign admin role to organization creator
CREATE TRIGGER assign_organization_creator_admin
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION assign_creator_admin_role();

-- Create indexes for permission lookups
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX idx_roles_permissions ON roles USING GIN(permissions);

-- Insert a default system organization for platform-wide settings (optional)
-- This can be used for system-wide configurations and admin users
INSERT INTO organizations (name, slug, description, metadata, settings)
VALUES (
  'System',
  'system',
  'System organization for platform administration',
  '{"type": "system", "internal": true}',
  '{"allow_public_signup": false, "require_invitation": true}'
);

-- Create system roles for the system organization
SELECT create_system_roles_for_organization(
  (SELECT id FROM organizations WHERE slug = 'system')
);

-- Add helpful comments
COMMENT ON FUNCTION create_system_roles_for_organization(UUID) IS 'Creates default Admin, Member, and Viewer roles for an organization';
COMMENT ON FUNCTION create_default_roles_trigger() IS 'Trigger function that automatically creates system roles when an organization is created';
COMMENT ON FUNCTION assign_creator_admin_role() IS 'Trigger function that assigns admin role to the user who creates an organization';
COMMENT ON TABLE permissions IS 'System-wide permissions that can be assigned to roles';
COMMENT ON TABLE roles IS 'Organization-specific roles with associated permissions';
COMMENT ON COLUMN roles.is_system_role IS 'Indicates if this is a default system role (Admin, Member, Viewer)';
COMMENT ON COLUMN roles.permissions IS 'Array of permission names assigned to this role';