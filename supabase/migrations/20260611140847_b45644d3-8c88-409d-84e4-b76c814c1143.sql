CREATE OR REPLACE FUNCTION public.matchrim_email_registered(email_input TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(trim(email_input))
  );
$$;

REVOKE ALL ON FUNCTION public.matchrim_email_registered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.matchrim_email_registered(TEXT) TO anon, authenticated;