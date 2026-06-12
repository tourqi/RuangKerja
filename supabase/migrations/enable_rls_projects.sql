ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to projects"
  ON projects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
