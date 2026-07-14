-- Enables RLS on profiles and blocks privilege escalation: without this, any
-- authenticated user could call `supabase.from('profiles').update({role:'owner'})`
-- on their own row directly (bypassing the client-side check in
-- UsersSettings.tsx, which only guards the UI, not the database).

CREATE OR REPLACE FUNCTION is_owner(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND role = 'owner'
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON profiles;
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own row (e.g. their name); owners can update any
-- row (e.g. changing someone's role from the Users settings page). The role
-- column itself is additionally locked down by the trigger below.
DROP POLICY IF EXISTS "Users update own profile, owner updates any" ON profiles;
CREATE POLICY "Users update own profile, owner updates any"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_owner(auth.uid()))
  WITH CHECK (auth.uid() = id OR is_owner(auth.uid()));

-- No INSERT/DELETE policy for `authenticated`: profile rows are created via
-- the server-side invite flow (service role key bypasses RLS) and should not
-- be self-service creatable or deletable.

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Hanya owner yang boleh mengubah role pengguna';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_escalation();
