-- Prepared for isolated staging first. This migration intentionally refuses to
-- guess which existing duplicate row owns ratings, notes or quantity.
CREATE OR REPLACE FUNCTION public.matchrim_identity_token(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(
    lower(translate(
      coalesce(value, ''),
      'ÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇÝŸáàâäãåéèêëíìîïóòôöõúùûüñçýÿ',
      'AAAAAAEEEEIIIIOOOOOUUUUNCYYaaaaaaeeeeiiiiooooouuuuncyy'
    )),
    '[^a-z0-9]+',
    '',
    'g'
  );
$$;

ALTER TABLE public.user_wines
  ADD COLUMN canonical_name text
    GENERATED ALWAYS AS (public.matchrim_identity_token(name)) STORED,
  ADD COLUMN canonical_producer text
    GENERATED ALWAYS AS (public.matchrim_identity_token(producer)) STORED,
  ADD COLUMN canonical_identity text
    GENERATED ALWAYS AS (
      public.matchrim_identity_token(name)
      || '|'
      || public.matchrim_identity_token(producer)
      || '|'
      || coalesce(vintage::text, '')
    ) STORED;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_wines
    GROUP BY user_id, canonical_identity
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'user_wines contains canonical duplicates; migration stopped without merging user data',
      HINT = 'Audit duplicate groups in isolated staging and merge ratings, notes, status and quantity explicitly before retrying.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX user_wines_user_canonical_identity_uidx
  ON public.user_wines (user_id, canonical_identity);

CREATE INDEX user_wines_user_canonical_name_idx
  ON public.user_wines (user_id, canonical_name, vintage);

COMMENT ON COLUMN public.user_wines.canonical_identity IS
  'Exact normalized name|producer|vintage identity. Unknown producer remains distinct from a known producer and requires application-level reconciliation.';
