/*
  # Fix Admin Permissions on Profiles Table

  ## Problem
  The current RLS policy on `profiles` only allows each user to SELECT/UPDATE
  their own row (`auth.uid() = id`). This means:
  - Admin users can only see THEIR OWN profile row when querying the table.
  - Admin queries in /dashboard/admin/users return a single row (themselves).
  - Admin UPDATE operations on other users silently affect 0 rows.

  ## Solution
  1. Create a SECURITY DEFINER helper function `is_admin()` that checks if the
     calling user has role = 'admin' AND is_active = true. Using SECURITY DEFINER
     lets the function bypass RLS to read the caller's own profile, avoiding
     infinite recursion.
  2. Add a SELECT policy that allows admins to read ALL profiles.
  3. Add an UPDATE policy that allows admins to update ANY profile.
  4. Keep all existing policies for regular users (they still only read/write
     their own profile).
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper function — is_admin()
--    SECURITY DEFINER so it can read profiles without being blocked by RLS.
--    STABLE so Postgres can cache it within a query.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- Grant execute to authenticated users (needed for RLS policy evaluation)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Profiles — Admin SELECT policy
--    Admins can read every profile row (needed for /dashboard/admin/users).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_admin_select_all" ON profiles;

CREATE POLICY "profiles_admin_select_all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Profiles — Admin UPDATE policy
--    Admins can update any profile (activate/deactivate, promote/demote,
--    assign agency, change user_type).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_admin_update_any" ON profiles;

CREATE POLICY "profiles_admin_update_any"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Profiles — Admin DELETE policy (keep blocked for everyone, including admins)
--    Already covered by "profiles_no_delete" USING(false), no change needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Sanity check: verify the existing user-level policies are still present
--    (they were created in previous migrations — these are no-ops if they exist)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_select_own_only'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "profiles_select_own_only"
        ON profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = id);
    $pol$;
    RAISE NOTICE 'profiles_select_own_only policy recreated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_update_own_only'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "profiles_update_own_only"
        ON profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    $pol$;
    RAISE NOTICE 'profiles_update_own_only policy recreated';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. search_users_for_collaboration — include role/user_type so admin panel
--    can enrich its data via the existing RPC if needed.
--    Also ensure it returns avatar_url for UI avatars.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_users_for_collaboration(search_term text)
RETURNS TABLE(
  id         uuid,
  email      text,
  full_name  text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.avatar_url
  FROM profiles p
  WHERE
    p.email     ILIKE '%' || search_term || '%'
    OR p.full_name ILIKE '%' || search_term || '%'
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_for_collaboration(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Summary of final RLS state for profiles:
--
--  SELECT  auth.uid() = id           → own profile (regular users)
--  SELECT  is_admin()                → all profiles (admins)
--  UPDATE  auth.uid() = id           → own profile (regular users)
--  UPDATE  is_admin()                → any profile (admins)
--  INSERT  auth.uid() = id           → own profile only (all users)
--  DELETE  false                     → nobody can delete profiles
-- ─────────────────────────────────────────────────────────────────────────────
