-- ============================================================
-- Contact Leads Migration
-- ============================================================

-- 1. Create contact_leads table
CREATE TABLE IF NOT EXISTS contact_leads (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_contact_leads_email      ON contact_leads(email);
CREATE INDEX IF NOT EXISTS idx_contact_leads_is_read    ON contact_leads(is_read);
CREATE INDEX IF NOT EXISTS idx_contact_leads_created_at ON contact_leads(created_at DESC);

-- 3. RLS
ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

-- Public can INSERT (lead capture)
DROP POLICY IF EXISTS "contact_leads_insert_public" ON contact_leads;
CREATE POLICY "contact_leads_insert_public"
  ON contact_leads FOR INSERT TO public WITH CHECK (true);

-- Service role (backend admin) can do everything
DROP POLICY IF EXISTS "contact_leads_all_service" ON contact_leads;
CREATE POLICY "contact_leads_all_service"
  ON contact_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
