-- Supabase Auth migration bridge.
-- Run against the Supabase Postgres (SQL editor, `supabase db push`, or the
-- Supabase MCP `apply_migration`). Safe to re-run (idempotent).
--
-- What it does:
--   1. Drops the old NextAuth adapter tables and the password_hash column.
--   2. Makes public.users.id reference auth.users(id) (the GoTrue user UUID).
--   3. Adds a trigger so every new auth.users row creates a matching
--      public.users profile row with the SAME id (keeps projects.userId valid).
--   4. Backfills profiles for any auth.users that already exist.

-- 1. Drop NextAuth adapter tables (GoTrue manages identities/sessions itself).
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.verification_tokens CASCADE;

-- Drop the credential password hash (GoTrue stores credentials in auth.users).
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- 2. public.users.id must equal auth.users.id. Remove the random default and
--    wire the FK (cascade delete so removing an auth user cleans the profile).
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;

-- Reset: drop legacy NextAuth profile rows whose id is not a real auth user
-- (their projects cascade away). Approved during brainstorming — data was
-- demo/test only. Real Supabase users are preserved.
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_auth_users_fk'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_auth_users_fk
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Sync trigger: new auth user -> profile row with the same id.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, image, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.email_confirmed_at
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(public.users.name, EXCLUDED.name),
        image = COALESCE(public.users.image, EXCLUDED.image),
        email_verified = COALESCE(EXCLUDED.email_verified, public.users.email_verified),
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill profiles for any auth users that predate the trigger.
INSERT INTO public.users (id, email, name, image, email_verified)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name'),
  u.raw_user_meta_data ->> 'avatar_url',
  u.email_confirmed_at
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
