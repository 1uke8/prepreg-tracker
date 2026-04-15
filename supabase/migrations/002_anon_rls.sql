-- Pre-Preg Material Tracker — Dev-friendly RLS
-- Adds policies that allow the `anon` role full access to all tables.
--
-- WHY: The app uses anonymous Supabase auth as a lightweight "no login needed"
-- approach for single-team use. If "Allow anonymous sign-ins" is disabled in
-- your Supabase project, you can still grant the anon role direct access here.
--
-- HOW TO RUN: Paste into Supabase SQL Editor and click Run.

-- Materials
create policy "anon_all" on materials for all to anon using (true) with check (true);

-- Batches
create policy "anon_all" on batches for all to anon using (true) with check (true);

-- Locations
create policy "anon_all" on locations for all to anon using (true) with check (true);

-- Stocks
create policy "anon_all" on stocks for all to anon using (true) with check (true);

-- Kits
create policy "anon_all" on kits for all to anon using (true) with check (true);

-- Transfers
create policy "anon_all" on transfers for all to anon using (true) with check (true);

-- Settings
create policy "anon_all" on settings for all to anon using (true) with check (true);
