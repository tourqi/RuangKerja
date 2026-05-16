CREATE TABLE IF NOT EXISTS general_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL,
  deskripsi TEXT NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('operasional', 'marketing', 'gaji', 'lainnya')),
  sub_kategori TEXT,
  jumlah NUMERIC(15, 2) NOT NULL DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE general_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to general_expenses"
  ON general_expenses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
