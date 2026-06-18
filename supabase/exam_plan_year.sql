-- ============================================================
-- Add plan_id and academic_year to university_exams table
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.university_exams
ADD COLUMN IF NOT EXISTS plan_id UUID DEFAULT NULL REFERENCES public.plans(id) ON DELETE SET NULL;

ALTER TABLE public.university_exams
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT NULL;

COMMENT ON COLUMN public.university_exams.plan_id IS 'Which plan students must be enrolled in to attempt this exam';
COMMENT ON COLUMN public.university_exams.academic_year IS 'Required for FMGE-related exams to filter by year';

CREATE INDEX IF NOT EXISTS idx_university_exams_plan_id ON public.university_exams(plan_id);
