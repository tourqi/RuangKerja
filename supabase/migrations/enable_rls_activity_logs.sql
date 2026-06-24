-- RLS policies for activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to activity_logs"
  ON activity_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
