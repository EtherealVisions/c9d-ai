CREATE TABLE "service_heartbeat_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"latency_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "service_heartbeats" (
	"service_name" text PRIMARY KEY NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"environment" text NOT NULL,
	"status" text NOT NULL,
	"latency_ms" integer,
	"deployment_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "service_heartbeat_events_service_occurred_idx" ON "service_heartbeat_events" USING btree ("service_name","occurred_at");