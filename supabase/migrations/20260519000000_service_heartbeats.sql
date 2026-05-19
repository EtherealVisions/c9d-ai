-- Service heartbeat tables for platform liveness (server-side writes only)
CREATE TABLE IF NOT EXISTS service_heartbeats (
  service_name text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL,
  source text NOT NULL,
  environment text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  deployment_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_heartbeat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  occurred_at timestamptz NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS service_heartbeat_events_service_occurred_idx
  ON service_heartbeat_events (service_name, occurred_at DESC);

ALTER TABLE service_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_heartbeat_events ENABLE ROW LEVEL SECURITY;
