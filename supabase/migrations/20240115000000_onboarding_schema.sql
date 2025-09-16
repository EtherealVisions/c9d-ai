-- Onboarding System Database Schema
-- This migration creates tables for the customer team onboarding system
-- Requirements: 1.1, 2.1, 6.1

-- Onboarding paths table - defines different onboarding journeys
CREATE TABLE onboarding_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_role TEXT NOT NULL, -- 'individual', 'team_admin', 'team_member', 'developer', etc.
  subscription_tier TEXT, -- 'free', 'pro', 'enterprise', etc.
  estimated_duration INTEGER NOT NULL DEFAULT 0, -- in minutes
  is_active BOOLEAN DEFAULT TRUE,
  prerequisites TEXT[] DEFAULT '{}',
  learning_objectives TEXT[] DEFAULT '{}',
  success_criteria JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding steps table - individual steps within onboarding paths
CREATE TABLE onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES onboarding_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  step_type TEXT NOT NULL CHECK (step_type IN ('tutorial', 'exercise', 'setup', 'validation', 'milestone')),
  step_order INTEGER NOT NULL,
  estimated_time INTEGER DEFAULT 0, -- in minutes
  is_required BOOLEAN DEFAULT TRUE,
  dependencies TEXT[] DEFAULT '{}', -- step IDs that must be completed first
  content JSONB DEFAULT '{}', -- step content including text, media, interactive elements
  interactive_elements JSONB DEFAULT '{}', -- configuration for interactive tutorials
  success_criteria JSONB DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(path_id, step_order)
);

-- Onboarding sessions table - tracks individual user onboarding sessions
CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  path_id UUID REFERENCES onboarding_paths(id),
  session_type TEXT NOT NULL CHECK (session_type IN ('individual', 'team_admin', 'team_member')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  current_step_id UUID REFERENCES onboarding_steps(id),
  current_step_index INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  time_spent INTEGER DEFAULT 0, -- total time spent in minutes
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  session_metadata JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}', -- user preferences for pacing, notifications, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table - tracks progress through individual steps
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  step_id UUID REFERENCES onboarding_steps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent INTEGER DEFAULT 0, -- time spent on this step in minutes
  attempts INTEGER DEFAULT 0,
  score DECIMAL(5,2), -- score for exercises/validations (0-100)
  feedback JSONB DEFAULT '{}', -- user feedback on the step
  user_actions JSONB DEFAULT '{}', -- log of user actions during the step
  step_result JSONB DEFAULT '{}', -- results/outputs from the step
  errors JSONB DEFAULT '{}', -- any errors encountered
  achievements JSONB DEFAULT '{}', -- badges/achievements earned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, step_id)
);

-- Team invitations table - enhanced for onboarding context
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  custom_message TEXT,
  onboarding_path_override UUID REFERENCES onboarding_paths(id),
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  onboarding_session_id UUID REFERENCES onboarding_sessions(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization onboarding configurations table
CREATE TABLE organization_onboarding_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  welcome_message TEXT,
  branding_assets JSONB DEFAULT '{}', -- logos, colors, custom styling
  custom_content JSONB DEFAULT '{}', -- organization-specific content
  role_configurations JSONB DEFAULT '{}', -- role-specific onboarding settings
  mandatory_modules TEXT[] DEFAULT '{}', -- required onboarding modules
  completion_requirements JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  integration_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding analytics table - tracks metrics and performance
CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'session_start', 'step_complete', 'milestone_reached', 'session_complete', etc.
  event_data JSONB DEFAULT '{}',
  path_id UUID REFERENCES onboarding_paths(id),
  step_id UUID REFERENCES onboarding_steps(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding content storage table - for dynamic content management
CREATE TABLE onboarding_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'html', 'markdown', 'video', 'image', 'interactive', 'template')),
  title TEXT NOT NULL,
  description TEXT,
  content_data JSONB NOT NULL, -- actual content data
  media_urls TEXT[] DEFAULT '{}', -- URLs for media assets
  interactive_config JSONB DEFAULT '{}', -- configuration for interactive elements
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global content
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding milestones table - defines achievement milestones
CREATE TABLE onboarding_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('progress', 'achievement', 'completion', 'time_based')),
  criteria JSONB NOT NULL, -- conditions for earning the milestone
  reward_data JSONB DEFAULT '{}', -- badges, certificates, etc.
  points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global milestones
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements table - tracks earned milestones and achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES onboarding_milestones(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  achievement_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, milestone_id, session_id)
);

-- Create indexes for performance optimization
CREATE INDEX idx_onboarding_paths_target_role ON onboarding_paths(target_role);
CREATE INDEX idx_onboarding_paths_subscription_tier ON onboarding_paths(subscription_tier);
CREATE INDEX idx_onboarding_paths_is_active ON onboarding_paths(is_active);

CREATE INDEX idx_onboarding_steps_path_id ON onboarding_steps(path_id);
CREATE INDEX idx_onboarding_steps_step_order ON onboarding_steps(path_id, step_order);
CREATE INDEX idx_onboarding_steps_step_type ON onboarding_steps(step_type);

CREATE INDEX idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);
CREATE INDEX idx_onboarding_sessions_organization_id ON onboarding_sessions(organization_id);
CREATE INDEX idx_onboarding_sessions_path_id ON onboarding_sessions(path_id);
CREATE INDEX idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX idx_onboarding_sessions_started_at ON onboarding_sessions(started_at);

CREATE INDEX idx_user_progress_session_id ON user_progress(session_id);
CREATE INDEX idx_user_progress_step_id ON user_progress(step_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_status ON user_progress(status);

CREATE INDEX idx_team_invitations_organization_id ON team_invitations(organization_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_expires_at ON team_invitations(expires_at);

CREATE INDEX idx_organization_onboarding_configs_organization_id ON organization_onboarding_configs(organization_id);

CREATE INDEX idx_onboarding_analytics_organization_id ON onboarding_analytics(organization_id);
CREATE INDEX idx_onboarding_analytics_session_id ON onboarding_analytics(session_id);
CREATE INDEX idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX idx_onboarding_analytics_event_type ON onboarding_analytics(event_type);
CREATE INDEX idx_onboarding_analytics_timestamp ON onboarding_analytics(timestamp);

CREATE INDEX idx_onboarding_content_content_type ON onboarding_content(content_type);
CREATE INDEX idx_onboarding_content_organization_id ON onboarding_content(organization_id);
CREATE INDEX idx_onboarding_content_is_active ON onboarding_content(is_active);
CREATE INDEX idx_onboarding_content_tags ON onboarding_content USING GIN(tags);

CREATE INDEX idx_onboarding_milestones_milestone_type ON onboarding_milestones(milestone_type);
CREATE INDEX idx_onboarding_milestones_organization_id ON onboarding_milestones(organization_id);
CREATE INDEX idx_onboarding_milestones_is_active ON onboarding_milestones(is_active);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_session_id ON user_achievements(session_id);
CREATE INDEX idx_user_achievements_milestone_id ON user_achievements(milestone_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at);

-- Add updated_at triggers for all tables
CREATE TRIGGER update_onboarding_paths_updated_at BEFORE UPDATE ON onboarding_paths FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_sessions_updated_at BEFORE UPDATE ON onboarding_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON team_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_onboarding_configs_updated_at BEFORE UPDATE ON organization_onboarding_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_content_updated_at BEFORE UPDATE ON onboarding_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_milestones_updated_at BEFORE UPDATE ON onboarding_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraints with proper cascade behavior
ALTER TABLE onboarding_sessions ADD CONSTRAINT fk_onboarding_sessions_current_step 
  FOREIGN KEY (current_step_id) REFERENCES onboarding_steps(id) ON DELETE SET NULL;

-- Add check constraints for data integrity
ALTER TABLE onboarding_sessions ADD CONSTRAINT check_progress_percentage 
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

ALTER TABLE user_progress ADD CONSTRAINT check_score_range 
  CHECK (score IS NULL OR (score >= 0 AND score <= 100));

ALTER TABLE user_progress ADD CONSTRAINT check_time_spent_positive 
  CHECK (time_spent >= 0);

ALTER TABLE onboarding_sessions ADD CONSTRAINT check_time_spent_positive 
  CHECK (time_spent >= 0);

-- Add comments for documentation
COMMENT ON TABLE onboarding_paths IS 'Defines different onboarding journeys based on user role and subscription tier';
COMMENT ON TABLE onboarding_steps IS 'Individual steps within onboarding paths with content and validation rules';
COMMENT ON TABLE onboarding_sessions IS 'Tracks individual user onboarding sessions with progress and state';
COMMENT ON TABLE user_progress IS 'Detailed progress tracking for each step within a session';
COMMENT ON TABLE team_invitations IS 'Enhanced team invitations with onboarding context and custom paths';
COMMENT ON TABLE organization_onboarding_configs IS 'Organization-specific onboarding customizations and branding';
COMMENT ON TABLE onboarding_analytics IS 'Analytics and metrics tracking for onboarding performance';
COMMENT ON TABLE onboarding_content IS 'Dynamic content storage for onboarding materials and interactive elements';
COMMENT ON TABLE onboarding_milestones IS 'Achievement milestones and badges for onboarding progress';
COMMENT ON TABLE user_achievements IS 'Tracks earned milestones and achievements for users';