-- Link invoices to projects
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
