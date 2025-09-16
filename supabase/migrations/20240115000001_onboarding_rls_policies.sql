-- Row Level Security (RLS) policies for onboarding system
-- This migration implements security policies for onboarding tables

-- Enable RLS on all onboarding tables
ALTER TABLE onboarding_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_onboarding_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(user_uuid UUID, org_id UUID) 
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_memberships om
    JOIN users u ON u.id = om.user_id
    JOIN roles r ON r.id = om.role_id
    WHERE u.clerk_user_id = user_uuid::TEXT
      AND om.organization_id = org_id
      AND om.status = 'active'
      AND 'admin' = ANY(r.permissions)
  );
END;
$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function to check if user belongs to organization
CREATE OR REPLACE FUNCTION is_organization_member(user_uuid UUID, org_id UUID) 
RETURNS BOOLEAN AS $
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_memberships om
    JOIN users u ON u.id = om.user_id
    WHERE u.clerk_user_id = user_uuid::TEXT
      AND om.organization_id = org_id
      AND om.status = 'active'
  );
END;
$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Onboarding paths policies
-- All authenticated users can view active global onboarding paths
CREATE POLICY "Users can view active onboarding paths" ON onboarding_paths
  FOR SELECT USING (
    auth.user_id() IS NOT NULL 
    AND is_active = true
  );

-- System/admins can manage onboarding paths (for now, allow all authenticated users to insert for testing)
CREATE POLICY "Authenticated users can manage onboarding paths" ON onboarding_paths
  FOR ALL USING (auth.user_id() IS NOT NULL);

-- Onboarding steps policies
-- Users can view steps for paths they have access to
CREATE POLICY "Users can view onboarding steps" ON onboarding_steps
  FOR SELECT USING (
    auth.user_id() IS NOT NULL
    AND path_id IN (
      SELECT id FROM onboarding_paths WHERE is_active = true
    )
  );

-- System/admins can manage onboarding steps
CREATE POLICY "Authenticated users can manage onboarding steps" ON onboarding_steps
  FOR ALL USING (auth.user_id() IS NOT NULL);

-- Onboarding sessions policies
-- Users can view their own onboarding sessions
CREATE POLICY "Users can view own onboarding sessions" ON onboarding_sessions
  FOR SELECT USING (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Users can create their own onboarding sessions
CREATE POLICY "Users can create own onboarding sessions" ON onboarding_sessions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Users can update their own onboarding sessions
CREATE POLICY "Users can update own onboarding sessions" ON onboarding_sessions
  FOR UPDATE USING (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Organization admins can view organization onboarding sessions
CREATE POLICY "Organization admins can view org onboarding sessions" ON onboarding_sessions
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND is_organization_admin(auth.user_id(), organization_id)
  );

-- User progress policies
-- Users can view their own progress
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Users can create/update their own progress
CREATE POLICY "Users can manage own progress" ON user_progress
  FOR ALL USING (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Organization admins can view organization member progress
CREATE POLICY "Organization admins can view member progress" ON user_progress
  FOR SELECT USING (
    session_id IN (
      SELECT id
      FROM onboarding_sessions
      WHERE organization_id IS NOT NULL
        AND is_organization_admin(auth.user_id(), organization_id)
    )
  );

-- Team invitations policies
-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations" ON team_invitations
  FOR SELECT USING (
    email IN (
      SELECT u.email
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Organization admins can manage team invitations
CREATE POLICY "Organization admins can manage invitations" ON team_invitations
  FOR ALL USING (
    is_organization_admin(auth.user_id(), organization_id)
  );

-- Users can update invitations sent to their email (for accepting)
CREATE POLICY "Users can accept their invitations" ON team_invitations
  FOR UPDATE USING (
    email IN (
      SELECT u.email
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Organization onboarding configs policies
-- Organization admins can manage their organization's onboarding config
CREATE POLICY "Organization admins can manage onboarding config" ON organization_onboarding_configs
  FOR ALL USING (
    is_organization_admin(auth.user_id(), organization_id)
  );

-- Organization members can view their organization's onboarding config
CREATE POLICY "Organization members can view onboarding config" ON organization_onboarding_configs
  FOR SELECT USING (
    is_organization_member(auth.user_id(), organization_id)
  );

-- Onboarding analytics policies
-- Users can view analytics for their own sessions
CREATE POLICY "Users can view own analytics" ON onboarding_analytics
  FOR SELECT USING (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- System can insert analytics (for tracking)
CREATE POLICY "System can insert analytics" ON onboarding_analytics
  FOR INSERT WITH CHECK (true);

-- Organization admins can view organization analytics
CREATE POLICY "Organization admins can view org analytics" ON onboarding_analytics
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND is_organization_admin(auth.user_id(), organization_id)
  );

-- Onboarding content policies
-- Users can view active global content
CREATE POLICY "Users can view global content" ON onboarding_content
  FOR SELECT USING (
    auth.user_id() IS NOT NULL
    AND is_active = true
    AND organization_id IS NULL
  );

-- Organization members can view their organization's content
CREATE POLICY "Organization members can view org content" ON onboarding_content
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND is_organization_member(auth.user_id(), organization_id)
    AND is_active = true
  );

-- Organization admins can manage their organization's content
CREATE POLICY "Organization admins can manage org content" ON onboarding_content
  FOR ALL USING (
    organization_id IS NOT NULL
    AND is_organization_admin(auth.user_id(), organization_id)
  );

-- System admins can manage global content (for now, allow authenticated users)
CREATE POLICY "Authenticated users can manage global content" ON onboarding_content
  FOR ALL USING (
    auth.user_id() IS NOT NULL
    AND organization_id IS NULL
  );

-- Onboarding milestones policies
-- Users can view active global milestones
CREATE POLICY "Users can view global milestones" ON onboarding_milestones
  FOR SELECT USING (
    auth.user_id() IS NOT NULL
    AND is_active = true
    AND organization_id IS NULL
  );

-- Organization members can view their organization's milestones
CREATE POLICY "Organization members can view org milestones" ON onboarding_milestones
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND is_organization_member(auth.user_id(), organization_id)
    AND is_active = true
  );

-- Organization admins can manage their organization's milestones
CREATE POLICY "Organization admins can manage org milestones" ON onboarding_milestones
  FOR ALL USING (
    organization_id IS NOT NULL
    AND is_organization_admin(auth.user_id(), organization_id)
  );

-- System admins can manage global milestones
CREATE POLICY "Authenticated users can manage global milestones" ON onboarding_milestones
  FOR ALL USING (
    auth.user_id() IS NOT NULL
    AND organization_id IS NULL
  );

-- User achievements policies
-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- System can insert achievements (when milestones are earned)
CREATE POLICY "System can insert achievements" ON user_achievements
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT u.id
      FROM users u
      WHERE u.clerk_user_id = auth.user_id()::TEXT
    )
  );

-- Organization admins can view organization member achievements
CREATE POLICY "Organization admins can view member achievements" ON user_achievements
  FOR SELECT USING (
    session_id IN (
      SELECT id
      FROM onboarding_sessions
      WHERE organization_id IS NOT NULL
        AND is_organization_admin(auth.user_id(), organization_id)
    )
  );