-- The `notifications` table referenced throughout the app (services/notifications.ts,
-- hooks/useNotifications.ts, the bell icon in TopBar.tsx) does not exist in the
-- database. Every call against it fails, but the failures are swallowed
-- (.catch(() => []) / Promise.allSettled), so the bell has been silently
-- showing "no notifications" instead of surfacing overdue follow-ups,
-- projects, and invoices. This creates the missing table.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow_up_due', 'project_overdue', 'invoice_overdue')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  entity_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, type, entity_id)
);

-- upsertNotification() relies on this constraint (onConflict: 'user_id,type,entity_id')
-- to avoid re-inserting a duplicate reminder for the same lead/project/invoice.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Unlike the other tables (shared business data, any authenticated user), a
-- notification is a personal inbox entry — scope it to its owner.
DROP POLICY IF EXISTS "Users manage their own notifications" ON notifications;
CREATE POLICY "Users manage their own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
