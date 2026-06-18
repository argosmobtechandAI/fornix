-- ============================================================
-- Brochure Feature - FULL Migration (Run this in Supabase SQL Editor)
-- ============================================================

-- 1. Add brochure_url to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS brochure_url TEXT DEFAULT NULL;

-- 2. Create brochure_leads table
CREATE TABLE IF NOT EXISTS brochure_leads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  country_code TEXT       NOT NULL DEFAULT '+91',
  email       TEXT        NOT NULL,
  course_id   UUID        REFERENCES courses(id) ON DELETE SET NULL,
  city        TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_brochure_leads_course_id  ON brochure_leads(course_id);
CREATE INDEX IF NOT EXISTS idx_brochure_leads_email      ON brochure_leads(email);
CREATE INDEX IF NOT EXISTS idx_brochure_leads_is_read    ON brochure_leads(is_read);
CREATE INDEX IF NOT EXISTS idx_brochure_leads_created_at ON brochure_leads(created_at DESC);

-- 4. RLS
ALTER TABLE brochure_leads ENABLE ROW LEVEL SECURITY;

-- Public can INSERT (lead capture)
DROP POLICY IF EXISTS "brochure_leads_insert_public" ON brochure_leads;
CREATE POLICY "brochure_leads_insert_public"
  ON brochure_leads FOR INSERT TO public WITH CHECK (true);

-- Service role (backend admin) can do everything
DROP POLICY IF EXISTS "brochure_leads_all_service" ON brochure_leads;
CREATE POLICY "brochure_leads_all_service"
  ON brochure_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- If table already exists, just add is_read column
-- ============================================================
ALTER TABLE brochure_leads ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Verify
-- ============================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'brochure_leads'
ORDER BY ordinal_position;
