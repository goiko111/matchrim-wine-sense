CREATE TABLE public.app_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  route text,
  platform text,
  app_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.app_events TO anon;
GRANT INSERT, SELECT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events for self or anon"
ON public.app_events
FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users read their own events"
ON public.app_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all events"
ON public.app_events
FOR SELECT
TO authenticated
USING (public.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE INDEX app_events_created_at_idx ON public.app_events (created_at DESC);
CREATE INDEX app_events_event_name_created_at_idx ON public.app_events (event_name, created_at DESC);
CREATE INDEX app_events_user_id_created_at_idx ON public.app_events (user_id, created_at DESC);