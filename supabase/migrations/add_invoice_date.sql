-- Add invoice_date column to invoices table
-- invoice_date: tanggal resmi invoice (bisa berbeda dari created_at jika dibackdate)
-- due_date default 14 hari dari invoice_date

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_date date;

-- Isi invoice_date dari created_at untuk data lama
UPDATE invoices
SET invoice_date = created_at::date
WHERE invoice_date IS NULL;
