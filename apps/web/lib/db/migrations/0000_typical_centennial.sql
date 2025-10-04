CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_id" varchar(255),
	"request_id" varchar(255),
	"severity" varchar(20) DEFAULT 'info' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"error_type" varchar(100) NOT NULL,
	"error_message" text NOT NULL,
	"error_stack" text,
	"error_code" varchar(50),
	"severity" varchar(20) DEFAULT 'error' NOT NULL,
	"user_id" uuid,
	"organization_id" uuid,
	"session_id" varchar(255),
	"request_id" varchar(255),
	"endpoint" varchar(255),
	"http_method" varchar(10),
	"http_status" integer,
	"user_agent" text,
	"ip_address" varchar(45),
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"session_id" uuid,
	"user_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"path_id" uuid,
	"step_id" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"device_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"performance_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" varchar(100) NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"unit" varchar(20),
	"tags" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"aggregation_period" varchar(20),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"content_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interactive_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"target_role" varchar(100) NOT NULL,
	"subscription_tier" varchar(50),
	"estimated_duration" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"learning_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"success_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"path_id" uuid,
	"session_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"current_step_id" uuid,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"paused_at" timestamp,
	"session_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"step_type" varchar(50) NOT NULL,
	"step_order" integer NOT NULL,
	"estimated_time" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"interactive_elements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"success_criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"validation_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_onboarding_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"welcome_message" text,
	"branding_assets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"custom_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"role_configurations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mandatory_modules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completion_requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notification_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"integration_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_onboarding_configs_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"feedback" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_actions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"step_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"achievements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"avatar_url" varchar(500),
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" varchar(1000),
	"avatar_url" varchar(500),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"resource" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"organization_id" uuid NOT NULL,
	"is_system_role" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "onboarding_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"milestone_type" varchar(50) NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reward_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invited_by" uuid,
	"email" varchar(255) NOT NULL,
	"role" varchar(100) NOT NULL,
	"custom_message" text,
	"onboarding_path_override" uuid,
	"invitation_token" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"onboarding_session_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"achievement_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_analytics" ADD CONSTRAINT "onboarding_analytics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_analytics" ADD CONSTRAINT "onboarding_analytics_session_id_onboarding_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."onboarding_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_analytics" ADD CONSTRAINT "onboarding_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_analytics" ADD CONSTRAINT "onboarding_analytics_path_id_onboarding_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."onboarding_paths"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_analytics" ADD CONSTRAINT "onboarding_analytics_step_id_onboarding_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."onboarding_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_metrics" ADD CONSTRAINT "system_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_metrics" ADD CONSTRAINT "system_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_content" ADD CONSTRAINT "onboarding_content_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_content" ADD CONSTRAINT "onboarding_content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_path_id_onboarding_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."onboarding_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_current_step_id_onboarding_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."onboarding_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_path_id_onboarding_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."onboarding_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_onboarding_configs" ADD CONSTRAINT "organization_onboarding_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_session_id_onboarding_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."onboarding_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_step_id_onboarding_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."onboarding_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_milestones" ADD CONSTRAINT "onboarding_milestones_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_onboarding_path_override_onboarding_paths_id_fk" FOREIGN KEY ("onboarding_path_override") REFERENCES "public"."onboarding_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_onboarding_session_id_onboarding_sessions_id_fk" FOREIGN KEY ("onboarding_session_id") REFERENCES "public"."onboarding_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_session_id_onboarding_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."onboarding_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_milestone_id_onboarding_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."onboarding_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_action_idx" ON "audit_logs" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "audit_logs_org_action_idx" ON "audit_logs" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_time_range_idx" ON "audit_logs" USING btree ("created_at","organization_id");--> statement-breakpoint
CREATE INDEX "error_logs_error_type_idx" ON "error_logs" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "error_logs_severity_idx" ON "error_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "error_logs_user_id_idx" ON "error_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "error_logs_organization_id_idx" ON "error_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "error_logs_endpoint_idx" ON "error_logs" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "error_logs_resolved_idx" ON "error_logs" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "error_logs_created_at_idx" ON "error_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "error_logs_type_resolved_idx" ON "error_logs" USING btree ("error_type","resolved");--> statement-breakpoint
CREATE INDEX "error_logs_severity_resolved_idx" ON "error_logs" USING btree ("severity","resolved");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_organization_id_idx" ON "onboarding_analytics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_session_id_idx" ON "onboarding_analytics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_user_id_idx" ON "onboarding_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_event_type_idx" ON "onboarding_analytics" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_path_id_idx" ON "onboarding_analytics" USING btree ("path_id");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_step_id_idx" ON "onboarding_analytics" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_timestamp_idx" ON "onboarding_analytics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_org_event_idx" ON "onboarding_analytics" USING btree ("organization_id","event_type");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_session_event_idx" ON "onboarding_analytics" USING btree ("session_id","event_type");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_path_event_idx" ON "onboarding_analytics" USING btree ("path_id","event_type");--> statement-breakpoint
CREATE INDEX "onboarding_analytics_time_range_idx" ON "onboarding_analytics" USING btree ("timestamp","organization_id");--> statement-breakpoint
CREATE INDEX "system_metrics_metric_type_idx" ON "system_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "system_metrics_metric_name_idx" ON "system_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "system_metrics_organization_id_idx" ON "system_metrics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "system_metrics_timestamp_idx" ON "system_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "system_metrics_aggregation_period_idx" ON "system_metrics" USING btree ("aggregation_period");--> statement-breakpoint
CREATE INDEX "system_metrics_type_name_idx" ON "system_metrics" USING btree ("metric_type","metric_name");--> statement-breakpoint
CREATE INDEX "system_metrics_org_metric_idx" ON "system_metrics" USING btree ("organization_id","metric_type");--> statement-breakpoint
CREATE INDEX "system_metrics_time_range_idx" ON "system_metrics" USING btree ("timestamp","metric_type");--> statement-breakpoint
CREATE INDEX "onboarding_content_content_type_idx" ON "onboarding_content" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "onboarding_content_organization_id_idx" ON "onboarding_content" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "onboarding_content_created_by_idx" ON "onboarding_content" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "onboarding_content_is_active_idx" ON "onboarding_content" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "onboarding_content_title_idx" ON "onboarding_content" USING btree ("title");--> statement-breakpoint
CREATE INDEX "onboarding_paths_target_role_idx" ON "onboarding_paths" USING btree ("target_role");--> statement-breakpoint
CREATE INDEX "onboarding_paths_subscription_tier_idx" ON "onboarding_paths" USING btree ("subscription_tier");--> statement-breakpoint
CREATE INDEX "onboarding_paths_is_active_idx" ON "onboarding_paths" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "onboarding_paths_name_idx" ON "onboarding_paths" USING btree ("name");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_user_id_idx" ON "onboarding_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_organization_id_idx" ON "onboarding_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_path_id_idx" ON "onboarding_sessions" USING btree ("path_id");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_status_idx" ON "onboarding_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_session_type_idx" ON "onboarding_sessions" USING btree ("session_type");--> statement-breakpoint
CREATE INDEX "onboarding_sessions_last_active_at_idx" ON "onboarding_sessions" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "onboarding_steps_path_id_idx" ON "onboarding_steps" USING btree ("path_id");--> statement-breakpoint
CREATE INDEX "onboarding_steps_step_type_idx" ON "onboarding_steps" USING btree ("step_type");--> statement-breakpoint
CREATE INDEX "onboarding_steps_step_order_idx" ON "onboarding_steps" USING btree ("step_order");--> statement-breakpoint
CREATE INDEX "onboarding_steps_is_required_idx" ON "onboarding_steps" USING btree ("is_required");--> statement-breakpoint
CREATE INDEX "onboarding_steps_path_order_idx" ON "onboarding_steps" USING btree ("path_id","step_order");--> statement-breakpoint
CREATE INDEX "org_onboarding_configs_organization_id_idx" ON "organization_onboarding_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_onboarding_configs_is_active_idx" ON "organization_onboarding_configs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_progress_session_id_idx" ON "user_progress" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_progress_step_id_idx" ON "user_progress" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "user_progress_user_id_idx" ON "user_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_progress_status_idx" ON "user_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_progress_session_step_idx" ON "user_progress" USING btree ("session_id","step_id");--> statement-breakpoint
CREATE INDEX "user_progress_user_step_idx" ON "user_progress" USING btree ("user_id","step_id");--> statement-breakpoint
CREATE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "org_memberships_user_id_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "org_memberships_organization_id_idx" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_memberships_role_id_idx" ON "organization_memberships" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "org_memberships_status_idx" ON "organization_memberships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "org_memberships_user_org_idx" ON "organization_memberships" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organizations_created_at_idx" ON "organizations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "permissions_name_idx" ON "permissions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "permissions_resource_idx" ON "permissions" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "permissions_action_idx" ON "permissions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "permissions_resource_action_idx" ON "permissions" USING btree ("resource","action");--> statement-breakpoint
CREATE INDEX "roles_organization_id_idx" ON "roles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "roles_is_system_role_idx" ON "roles" USING btree ("is_system_role");--> statement-breakpoint
CREATE INDEX "roles_org_name_idx" ON "roles" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "invitations_organization_id_idx" ON "invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invitations_invited_by_idx" ON "invitations" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "invitations_expires_at_idx" ON "invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "invitations_org_email_idx" ON "invitations" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "invitations_status_expires_idx" ON "invitations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "onboarding_milestones_milestone_type_idx" ON "onboarding_milestones" USING btree ("milestone_type");--> statement-breakpoint
CREATE INDEX "onboarding_milestones_organization_id_idx" ON "onboarding_milestones" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "onboarding_milestones_is_active_idx" ON "onboarding_milestones" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "onboarding_milestones_name_idx" ON "onboarding_milestones" USING btree ("name");--> statement-breakpoint
CREATE INDEX "team_invitations_organization_id_idx" ON "team_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "team_invitations_email_idx" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "team_invitations_invitation_token_idx" ON "team_invitations" USING btree ("invitation_token");--> statement-breakpoint
CREATE INDEX "team_invitations_status_idx" ON "team_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "team_invitations_invited_by_idx" ON "team_invitations" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "team_invitations_expires_at_idx" ON "team_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "team_invitations_onboarding_path_override_idx" ON "team_invitations" USING btree ("onboarding_path_override");--> statement-breakpoint
CREATE INDEX "team_invitations_org_email_idx" ON "team_invitations" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "team_invitations_status_expires_idx" ON "team_invitations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_achievements_session_id_idx" ON "user_achievements" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_achievements_milestone_id_idx" ON "user_achievements" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "user_achievements_earned_at_idx" ON "user_achievements" USING btree ("earned_at");--> statement-breakpoint
CREATE INDEX "user_achievements_user_milestone_idx" ON "user_achievements" USING btree ("user_id","milestone_id");--> statement-breakpoint
CREATE INDEX "user_achievements_session_milestone_idx" ON "user_achievements" USING btree ("session_id","milestone_id");