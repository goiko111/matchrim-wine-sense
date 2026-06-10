-- Fix account deletion request RLS after security hardening.
-- The previous admin policy could call public.has_role(), which is intentionally
-- not executable by authenticated users anymore. Because Postgres evaluates all
-- applicable policies, that permission error also blocked normal users from
-- reading or creating their own deletion requests.

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own account deletion request"
  ON public.account_deletion_requests;
CREATE POLICY "Users can create own account deletion request"
  ON public.account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own account deletion requests"
  ON public.account_deletion_requests;
CREATE POLICY "Users can read own account deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can manage account deletion requests"
  ON public.account_deletion_requests;
CREATE POLICY "Admins can manage account deletion requests"
  ON public.account_deletion_requests
  FOR ALL
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));
