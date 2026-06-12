-- RLS policies for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to clients"
  ON clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS policies for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to leads"
  ON leads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
