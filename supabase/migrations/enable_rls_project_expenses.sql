-- project_expenses has no tracked creation migration in this repo, so its
-- current RLS status can't be verified from source. Applying the same
-- authenticated-only baseline used elsewhere as a safety floor.

ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access to project_expenses" ON project_expenses;
CREATE POLICY "Authenticated users full access to project_expenses"
  ON project_expenses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
