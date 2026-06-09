CREATE TABLE IF NOT EXISTS public.restaurant_matchrim_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_address TEXT,
  restaurant_place_id TEXT,
  is_winerim_restaurant BOOLEAN NOT NULL DEFAULT false,
  matchrim_code TEXT NOT NULL,
  matchrim_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  menu_scan_used BOOLEAN NOT NULL DEFAULT false,
  wines_detected INTEGER,
  source TEXT NOT NULL DEFAULT 'matchrim_restaurant_flow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.restaurant_matchrim_sessions TO authenticated;
GRANT ALL ON public.restaurant_matchrim_sessions TO service_role;

ALTER TABLE public.restaurant_matchrim_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own restaurant sessions" ON public.restaurant_matchrim_sessions;
CREATE POLICY "Users can insert own restaurant sessions"
ON public.restaurant_matchrim_sessions
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own restaurant sessions" ON public.restaurant_matchrim_sessions;
CREATE POLICY "Users can read own restaurant sessions"
ON public.restaurant_matchrim_sessions
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own restaurant sessions" ON public.restaurant_matchrim_sessions;
CREATE POLICY "Users can update own restaurant sessions"
ON public.restaurant_matchrim_sessions
FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can read restaurant demand" ON public.restaurant_matchrim_sessions;
CREATE POLICY "Admins can read restaurant demand"
ON public.restaurant_matchrim_sessions
FOR SELECT TO authenticated
USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_restaurant_matchrim_sessions_user_id
ON public.restaurant_matchrim_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_matchrim_sessions_restaurant_name
ON public.restaurant_matchrim_sessions(restaurant_name);

CREATE INDEX IF NOT EXISTS idx_restaurant_matchrim_sessions_created_at
ON public.restaurant_matchrim_sessions(created_at DESC);