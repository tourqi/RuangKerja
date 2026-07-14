-- invoices/payments have no tracked creation migration in this repo, so their
-- current RLS status can't be verified from source. Applying the same
-- authenticated-only baseline as clients/leads/projects as a safety floor —
-- this only blocks anonymous/unauthenticated access and does not restrict any
-- currently-working in-app (logged-in) flow.
--
-- NOTE: this does not yet differentiate by role (owner/designer/sales).
-- Role-scoped policies (e.g. sales cannot delete invoices) should be added as
-- a follow-up once the permission matrix is confirmed, since getting that
-- wrong risks locking real users out of invoicing they currently rely on.

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access to invoices" ON invoices;
CREATE POLICY "Authenticated users full access to invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access to payments" ON payments;
CREATE POLICY "Authenticated users full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
