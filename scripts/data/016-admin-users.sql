-- Admin role. Kept in a dedicated table rather than a profiles.is_admin column
-- because the profiles UPDATE policy is `id = auth.uid()` with no column guard,
-- so a column would be self-grantable via a normal profile PATCH. This table
-- has NO insert/update/delete policy, so only the service role can grant admin.

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- A signed-in user may check only their OWN admin status (for the server-side
-- gate). Writes are denied to all clients (no policy) → service role only.
DROP POLICY IF EXISTS "Users can read their own admin row" ON public.admin_users;
CREATE POLICY "Users can read their own admin row"
  ON public.admin_users FOR SELECT USING (user_id = auth.uid());

-- Seed the owner account.
INSERT INTO public.admin_users (user_id)
  SELECT id FROM public.profiles WHERE username = 'anthony'
  ON CONFLICT DO NOTHING;
