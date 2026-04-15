-- Pre-Preg Material Tracker — Open RLS + grants for single-team use
-- Fixes 401 errors by:
--   1. Granting INSERT/UPDATE/DELETE on all tables to the anon role
--   2. Replacing restrictive "authenticated-only" policies with PUBLIC policies
--
-- Run this in Supabase SQL Editor → you should see "Success. No rows returned."

-- ── Step 1: Grant table-level permissions to anon role ────────────────────────
-- (Supabase auto-grants SELECT to anon, but not writes)
GRANT INSERT, UPDATE, DELETE ON materials  TO anon;
GRANT INSERT, UPDATE, DELETE ON batches    TO anon;
GRANT INSERT, UPDATE, DELETE ON locations  TO anon;
GRANT INSERT, UPDATE, DELETE ON stocks     TO anon;
GRANT INSERT, UPDATE, DELETE ON kits       TO anon;
GRANT INSERT, UPDATE, DELETE ON transfers  TO anon;
GRANT INSERT, UPDATE, DELETE ON settings   TO anon;

-- Also grant sequence usage so uuid_generate_v4() works for anon inserts
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ── Step 2: Drop any previous policy attempts ─────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['materials','batches','locations','stocks','kits','transfers','settings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS anon_all ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS public_all ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_all ON %I', t);
  END LOOP;
END $$;

-- ── Step 3: Create open policies for all roles ────────────────────────────────
CREATE POLICY "public_all" ON materials  FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON batches    FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON locations  FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON stocks     FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON kits       FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON transfers  FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON settings   FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
