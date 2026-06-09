CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_deletion_requests_status_check
    CHECK (status IN ('requested', 'processing', 'completed', 'cancelled'))
);

GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own account deletion request"
  ON public.account_deletion_requests;
CREATE POLICY "Users can create own account deletion request"
  ON public.account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own account deletion requests"
  ON public.account_deletion_requests;
CREATE POLICY "Users can read own account deletion requests"
  ON public.account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage account deletion requests"
  ON public.account_deletion_requests;
CREATE POLICY "Admins can manage account deletion requests"
  ON public.account_deletion_requests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_account_deletion_requests_updated_at
  ON public.account_deletion_requests;
CREATE TRIGGER update_account_deletion_requests_updated_at
  BEFORE UPDATE ON public.account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id
  ON public.account_deletion_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status
  ON public.account_deletion_requests(status);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_requested_at
  ON public.account_deletion_requests(requested_at DESC);