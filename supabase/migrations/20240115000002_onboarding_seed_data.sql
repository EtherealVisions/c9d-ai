-- Seed data for onboarding system
-- This migration creates initial onboarding paths, steps, content, and milestones

-- Insert default onboarding paths
INSERT INTO onboarding_paths (id, name, description, target_role, subscription_tier, estimated_duration, prerequisites, learning_objectives, success_criteria, metadata) VALUES
(
  gen_random_uuid(),
  'Individual Developer Onboarding',
  'Complete onboarding journey for individual developers getting started with C9d.ai',
  'developer',
  NULL,
  45,
  '[]',
  '["Understand C9d.ai platform capabilities", "Complete first AI agent creation", "Learn collaboration features", "Set up development environment"]',
  '{"first_agent_created": true, "profile_completed": true, "tutorial_completed": true}',
  '{"difficulty": "beginner", "focus_areas": ["platform_basics", "agent_creation", "development_setup"]}'
),
(
  gen_random_uuid(),
  'Team Administrator Onboarding',
  'Comprehensive onboarding for team administrators setting up organizations',
  'admin',
  NULL,
  60,
  '[]',
  '["Set up organization workspace", "Configure team settings", "Invite team members", "Understand billing and subscriptions", "Learn team management features"]',
  '{"organization_created": true, "team_invited": true, "settings_configured": true, "billing_setup": true}',
  '{"difficulty": "intermediate", "focus_areas": ["organization_setup", "team_management", "billing", "administration"]}'
),
(
  gen_random_uuid(),
  'Team Member Onboarding',
  'Onboarding for team members joining an existing organization',
  'member',
  NULL,
  30,
  '[]',
  '["Understand team workspace", "Learn collaboration workflows", "Complete first team project", "Set up communication preferences"]',
  '{"team_project_completed": true, "collaboration_setup": true, "communication_configured": true}',
  '{"difficulty": "beginner", "focus_areas": ["team_collaboration", "workflows", "communication"]}'
),
(
  gen_random_uuid(),
  'Enterprise Onboarding',
  'Advanced onboarding for enterprise customers with custom requirements',
  'enterprise',
  'enterprise',
  90,
  '[]',
  '["Enterprise security setup", "Advanced integrations", "Custom workflow configuration", "Team scaling strategies", "Compliance requirements"]',
  '{"security_configured": true, "integrations_setup": true, "compliance_verified": true, "scaling_planned": true}',
  '{"difficulty": "advanced", "focus_areas": ["security", "integrations", "compliance", "scaling"]}'
);

-- Get the path IDs for creating steps
DO $$ 
DECLARE
    dev_path_id UUID;
    admin_path_id UUID;
    member_path_id UUID;
    enterprise_path_id UUID;
BEGIN
    -- Get path IDs
    SELECT id INTO dev_path_id FROM onboarding_paths WHERE target_role = 'developer' LIMIT 1;
    SELECT id INTO admin_path_id FROM onboarding_paths WHERE target_role = 'admin' LIMIT 1;
    SELECT id INTO member_path_id FROM onboarding_paths WHERE target_role = 'member' LIMIT 1;
    SELECT id INTO enterprise_path_id FROM onboarding_paths WHERE target_role = 'enterprise' LIMIT 1;

    -- Insert steps for Individual Developer Onboarding
    INSERT INTO onboarding_steps (path_id, title, description, step_type, step_order, estimated_time, content, interactive_elements, success_criteria) VALUES
    (dev_path_id, 'Welcome to C9d.ai', 'Introduction to the platform and overview of capabilities', 'tutorial', 1, 5, 
     '{"type": "welcome", "content": "Welcome to C9d.ai! This onboarding will help you get started with our AI platform.", "media": ["welcome_video.mp4"], "sections": ["platform_overview", "key_features", "getting_started"]}',
     '{"video_player": true, "progress_tracking": true, "next_button": true}',
     '{"video_watched": true, "overview_completed": true}'
    ),
    (dev_path_id, 'Complete Your Profile', 'Set up your developer profile and preferences', 'setup', 2, 10,
     '{"type": "profile_setup", "fields": ["name", "role", "experience_level", "interests"], "tips": ["Complete profile for better recommendations", "Add avatar for team recognition"]}',
     '{"form_validation": true, "image_upload": true, "preference_selection": true}',
     '{"profile_completed": true, "preferences_set": true}'
    ),
    (dev_path_id, 'Create Your First AI Agent', 'Hands-on tutorial for creating your first AI agent', 'exercise', 3, 20,
     '{"type": "agent_creation", "template": "basic_chatbot", "steps": ["choose_template", "configure_settings", "test_agent", "deploy"], "guidance": "Follow the step-by-step guide to create a simple chatbot"}',
     '{"code_editor": true, "live_preview": true, "testing_sandbox": true, "deployment_wizard": true}',
     '{"agent_created": true, "agent_tested": true, "agent_deployed": true}'
    ),
    (dev_path_id, 'Explore Collaboration Features', 'Learn how to share and collaborate on AI projects', 'tutorial', 4, 10,
     '{"type": "collaboration_tutorial", "features": ["sharing", "version_control", "team_workspaces", "comments"], "examples": ["shared_project_demo", "collaboration_workflow"]}',
     '{"interactive_demo": true, "feature_highlights": true, "practice_exercises": true}',
     '{"collaboration_understood": true, "sharing_completed": true}'
    );

    -- Insert steps for Team Administrator Onboarding
    INSERT INTO onboarding_steps (path_id, title, description, step_type, step_order, estimated_time, content, interactive_elements, success_criteria) VALUES
    (admin_path_id, 'Organization Setup Wizard', 'Create and configure your organization workspace', 'setup', 1, 15,
     '{"type": "organization_setup", "wizard_steps": ["basic_info", "branding", "settings", "integrations"], "templates": ["startup", "enterprise", "agency"]}',
     '{"wizard_navigation": true, "template_selection": true, "branding_upload": true, "settings_configuration": true}',
     '{"organization_created": true, "branding_configured": true, "settings_applied": true}'
    ),
    (admin_path_id, 'Team Invitation and Roles', 'Invite team members and set up role-based permissions', 'setup', 2, 20,
     '{"type": "team_management", "roles": ["admin", "developer", "viewer"], "invitation_methods": ["email", "link", "bulk_import"], "permission_matrix": "detailed_permissions_guide"}',
     '{"role_configuration": true, "bulk_invitation": true, "permission_editor": true, "invitation_tracking": true}',
     '{"team_invited": true, "roles_configured": true, "permissions_set": true}'
    ),
    (admin_path_id, 'Billing and Subscription Setup', 'Configure billing information and subscription preferences', 'setup', 3, 15,
     '{"type": "billing_setup", "plans": ["free", "pro", "enterprise"], "payment_methods": ["card", "invoice"], "billing_cycle": ["monthly", "annual"]}',
     '{"plan_comparison": true, "payment_form": true, "billing_preview": true, "upgrade_options": true}',
     '{"billing_configured": true, "payment_method_added": true, "plan_selected": true}'
    ),
    (admin_path_id, 'Organization Dashboard Tour', 'Explore the admin dashboard and management features', 'tutorial', 4, 10,
     '{"type": "dashboard_tour", "sections": ["overview", "team_management", "usage_analytics", "settings"], "interactive_elements": ["guided_tour", "feature_callouts"]}',
     '{"guided_tour": true, "feature_exploration": true, "analytics_demo": true}',
     '{"dashboard_explored": true, "features_understood": true}'
    );

    -- Insert steps for Team Member Onboarding
    INSERT INTO onboarding_steps (path_id, title, description, step_type, step_order, estimated_time, content, interactive_elements, success_criteria) VALUES
    (member_path_id, 'Welcome to Your Team', 'Introduction to your team workspace and colleagues', 'tutorial', 1, 5,
     '{"type": "team_welcome", "team_info": "dynamic", "workspace_overview": true, "team_directory": true}',
     '{"team_showcase": true, "workspace_navigation": true, "member_profiles": true}',
     '{"team_introduced": true, "workspace_explored": true}'
    ),
    (member_path_id, 'Team Collaboration Basics', 'Learn your team''s workflows and collaboration practices', 'tutorial', 2, 15,
     '{"type": "collaboration_training", "workflows": "team_specific", "tools": ["shared_projects", "comments", "reviews"], "best_practices": "team_guidelines"}',
     '{"workflow_demo": true, "tool_practice": true, "guideline_review": true}',
     '{"workflows_understood": true, "tools_practiced": true, "guidelines_acknowledged": true}'
    ),
    (member_path_id, 'Your First Team Project', 'Participate in a collaborative project with your team', 'exercise', 3, 10,
     '{"type": "team_project", "project_template": "collaborative_agent", "role": "contributor", "guidance": "Work with team members to complete a shared project"}',
     '{"project_workspace": true, "real_time_collaboration": true, "progress_tracking": true, "team_communication": true}',
     '{"project_contributed": true, "collaboration_completed": true, "team_interaction": true}'
    );

    -- Insert steps for Enterprise Onboarding
    INSERT INTO onboarding_steps (path_id, title, description, step_type, step_order, estimated_time, content, interactive_elements, success_criteria) VALUES
    (enterprise_path_id, 'Enterprise Security Configuration', 'Set up advanced security features and compliance settings', 'setup', 1, 30,
     '{"type": "security_setup", "features": ["sso", "rbac", "audit_logs", "data_encryption"], "compliance": ["gdpr", "hipaa", "soc2"], "policies": "security_policies_template"}',
     '{"sso_configuration": true, "rbac_editor": true, "audit_dashboard": true, "compliance_checklist": true}',
     '{"sso_configured": true, "rbac_implemented": true, "audit_enabled": true, "compliance_verified": true}'
    ),
    (enterprise_path_id, 'Advanced Integrations Setup', 'Configure enterprise integrations and API access', 'setup', 2, 25,
     '{"type": "integrations_setup", "systems": ["crm", "erp", "identity_providers", "monitoring"], "apis": ["rest", "graphql", "webhooks"], "authentication": "enterprise_auth_methods"}',
     '{"integration_wizard": true, "api_testing": true, "webhook_configuration": true, "monitoring_setup": true}',
     '{"integrations_configured": true, "apis_tested": true, "webhooks_active": true, "monitoring_enabled": true}'
    ),
    (enterprise_path_id, 'Custom Workflow Configuration', 'Design and implement custom workflows for your organization', 'setup', 3, 20,
     '{"type": "workflow_design", "templates": ["approval_workflows", "deployment_pipelines", "review_processes"], "customization": "full_workflow_editor", "automation": "workflow_automation_options"}',
     '{"workflow_editor": true, "template_customization": true, "automation_setup": true, "testing_environment": true}',
     '{"workflows_designed": true, "automation_configured": true, "processes_tested": true}'
    ),
    (enterprise_path_id, 'Team Scaling and Governance', 'Plan for team growth and establish governance policies', 'tutorial', 4, 15,
     '{"type": "scaling_planning", "topics": ["team_structure", "governance_policies", "resource_planning", "performance_monitoring"], "tools": ["org_chart_builder", "policy_templates", "resource_calculator"]}',
     '{"org_chart_builder": true, "policy_editor": true, "resource_planning": true, "monitoring_dashboard": true}',
     '{"scaling_planned": true, "governance_established": true, "resources_allocated": true}'
    );
END $$;

-- Insert default onboarding content
INSERT INTO onboarding_content (content_type, title, description, content_data, media_urls, interactive_config, tags, organization_id) VALUES
('video', 'Platform Welcome Video', 'Introduction video explaining C9d.ai platform capabilities', 
 '{"duration": 180, "transcript": "Welcome to C9d.ai...", "chapters": [{"title": "Introduction", "time": 0}, {"title": "Key Features", "time": 60}, {"title": "Getting Started", "time": 120}]}',
 '["https://example.com/videos/welcome.mp4"]',
 '{"autoplay": false, "controls": true, "chapters": true, "transcript": true}',
 '["welcome", "introduction", "video", "platform_overview"]',
 NULL
),
('interactive', 'Agent Creation Tutorial', 'Interactive step-by-step guide for creating AI agents',
 '{"steps": [{"title": "Choose Template", "content": "Select from our pre-built templates", "action": "template_selection"}, {"title": "Configure Settings", "content": "Customize your agent settings", "action": "settings_form"}, {"title": "Test Agent", "content": "Test your agent in the sandbox", "action": "sandbox_test"}, {"title": "Deploy", "content": "Deploy your agent to production", "action": "deployment"}]}',
 '[]',
 '{"sandbox": true, "live_preview": true, "step_validation": true, "progress_saving": true}',
 '["tutorial", "agent_creation", "interactive", "hands_on"]',
 NULL
),
('template', 'Organization Setup Template', 'Template for organization configuration with best practices',
 '{"sections": {"basic_info": {"name": "", "description": "", "industry": ""}, "branding": {"logo": "", "colors": {"primary": "#000000", "secondary": "#ffffff"}}, "settings": {"privacy": "private", "collaboration": "team_only", "integrations": []}}, "recommendations": {"startup": {"privacy": "private", "collaboration": "open"}, "enterprise": {"privacy": "private", "collaboration": "controlled"}}}',
 '[]',
 '{"form_validation": true, "template_selection": true, "preview_mode": true}',
 '["template", "organization", "setup", "configuration"]',
 NULL
),
('markdown', 'Collaboration Best Practices', 'Guide to effective team collaboration on C9d.ai',
 '{"content": "# Collaboration Best Practices\\n\\n## Team Communication\\n- Use comments for feedback\\n- Tag team members for attention\\n- Keep discussions focused\\n\\n## Project Organization\\n- Use clear naming conventions\\n- Organize projects by team/purpose\\n- Maintain documentation\\n\\n## Version Control\\n- Save work frequently\\n- Use descriptive commit messages\\n- Review changes before merging"}',
 '[]',
 '{"table_of_contents": true, "search": true, "bookmarks": true}',
 '["guide", "collaboration", "best_practices", "team_work"]',
 NULL
);

-- Insert default milestones
INSERT INTO onboarding_milestones (name, description, milestone_type, criteria, reward_data, points, organization_id) VALUES
('First Steps', 'Complete your first onboarding step', 'progress',
 '{"steps_completed": 1}',
 '{"badge": "first_steps", "title": "Getting Started", "description": "You''ve taken your first step on C9d.ai!"}',
 10, NULL
),
('Profile Complete', 'Complete your user profile setup', 'achievement',
 '{"profile_fields": ["name", "role", "avatar"], "completion_percentage": 100}',
 '{"badge": "profile_complete", "title": "Profile Master", "description": "Your profile is complete and ready to go!"}',
 25, NULL
),
('First Agent', 'Create and deploy your first AI agent', 'achievement',
 '{"agent_created": true, "agent_deployed": true}',
 '{"badge": "first_agent", "title": "Agent Creator", "description": "You''ve successfully created your first AI agent!"}',
 50, NULL
),
('Team Player', 'Successfully collaborate on a team project', 'achievement',
 '{"team_project_completed": true, "collaboration_score": 80}',
 '{"badge": "team_player", "title": "Team Collaborator", "description": "You''ve mastered team collaboration!"}',
 40, NULL
),
('Speed Runner', 'Complete onboarding in under 30 minutes', 'time_based',
 '{"max_time_minutes": 30, "completion_required": true}',
 '{"badge": "speed_runner", "title": "Quick Learner", "description": "You completed onboarding in record time!"}',
 75, NULL
),
('Onboarding Graduate', 'Complete the entire onboarding journey', 'completion',
 '{"progress_percentage": 100, "all_required_steps": true}',
 '{"badge": "graduate", "title": "Onboarding Graduate", "description": "Congratulations! You''ve completed the full onboarding experience.", "certificate": true}',
 100, NULL
);

-- Create indexes for better performance on seed data queries
CREATE INDEX IF NOT EXISTS idx_onboarding_content_tags_gin ON onboarding_content USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_onboarding_milestones_type_active ON onboarding_milestones(milestone_type, is_active);
CREATE INDEX IF NOT EXISTS idx_onboarding_paths_role_tier ON onboarding_paths(target_role, subscription_tier);