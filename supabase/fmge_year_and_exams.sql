-- ============================================================
-- FMGE Year System & University Exam Module — Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Add academic_year column to users table
-- ============================================================
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT NULL;

COMMENT ON COLUMN public.users.academic_year IS 'FMGE year: 1st Year, 2nd Year, 3rd Year, 4th Year, 5th Year, Final Year. Only for FMGE students.';

-- ============================================================
-- 2. Add academic_year column to subjects table
-- ============================================================
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT NULL;

COMMENT ON COLUMN public.subjects.academic_year IS 'Required for FMGE subjects, NULL for others.';

-- ============================================================
-- 3. Add year_wise_limits JSONB column to university_profiles
-- ============================================================
ALTER TABLE public.university_profiles
ADD COLUMN IF NOT EXISTS year_wise_limits JSONB DEFAULT NULL;

COMMENT ON COLUMN public.university_profiles.year_wise_limits IS 'FMGE year-wise student limits, e.g. {"1st Year": 50, "2nd Year": 30}';

-- ============================================================
-- 4. Create university_exams table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.university_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES public.university_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subjects TEXT DEFAULT '',
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_university_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_university_exams_updated_at ON public.university_exams;

CREATE TRIGGER trigger_update_university_exams_updated_at
BEFORE UPDATE ON public.university_exams
FOR EACH ROW
EXECUTE FUNCTION update_university_exams_updated_at();

-- ============================================================
-- 5. Create university_questions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.university_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.university_exams(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    option_e TEXT,
    option_f TEXT,
    correct_option TEXT NOT NULL DEFAULT 'a',
    marks INTEGER NOT NULL DEFAULT 1,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. Create university_exam_attempts table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.university_exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.university_exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total_marks INTEGER NOT NULL DEFAULT 0,
    answers JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. Row Level Security (RLS) — using service_role for APIs
-- ============================================================

-- university_exams RLS
ALTER TABLE public.university_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on university_exams"
ON public.university_exams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all access to service_role on university_exams"
ON public.university_exams
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- university_questions RLS
ALTER TABLE public.university_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on university_questions"
ON public.university_questions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all access to service_role on university_questions"
ON public.university_questions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- university_exam_attempts RLS
ALTER TABLE public.university_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on university_exam_attempts"
ON public.university_exam_attempts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all access to service_role on university_exam_attempts"
ON public.university_exam_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 8. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_university_exams_university_id ON public.university_exams(university_id);
CREATE INDEX IF NOT EXISTS idx_university_questions_exam_id ON public.university_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_university_exam_attempts_exam_id ON public.university_exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_university_exam_attempts_student_id ON public.university_exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_users_academic_year ON public.users(academic_year);
CREATE INDEX IF NOT EXISTS idx_subjects_academic_year ON public.subjects(academic_year);
