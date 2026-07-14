-- URGENT: rab, rab_groups, rab_items were confirmed publicly readable by
-- unauthenticated requests (no RLS policy restricting access to `authenticated`).
-- This closes that hole using the same "authenticated-only" baseline already
-- applied to clients/leads/projects.

ALTER TABLE rab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to rab"
  ON rab FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE rab_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to rab_groups"
  ON rab_groups FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE rab_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to rab_items"
  ON rab_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
