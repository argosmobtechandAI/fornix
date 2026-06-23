-- Admin Activity Logs Table
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id text,
  admin_email text,
  action text NOT NULL,
  description text NOT NULL,
  target_type text,         -- 'course', 'subject', 'chapter', 'question', etc.
  target_id text,           -- ID of the affected record
  target_name text,         -- Human-readable name of the target
  metadata jsonb DEFAULT '{}',  -- Extra details (e.g. summary counts for clone)
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS admin_activity_logs_admin_id_idx ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_activity_logs_action_idx ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS admin_activity_logs_created_at_idx ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_logs_target_type_idx ON admin_activity_logs(target_type);
