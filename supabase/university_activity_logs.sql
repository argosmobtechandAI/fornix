-- ============================================================
-- University Activity Logs table
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.university_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.university_profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    target_type TEXT,          -- 'student', 'exam', 'question', 'bulk_import'
    target_id TEXT,            -- ID or comma-separated IDs
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.university_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to service_role on university_activity_logs"
ON public.university_activity_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_university_activity_logs_university_id ON public.university_activity_logs(university_id);
CREATE INDEX IF NOT EXISTS idx_university_activity_logs_created_at ON public.university_activity_logs(created_at DESC);
