CREATE TABLE IF NOT EXISTS public.liquid_intelligence_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_type TEXT NOT NULL CHECK (
    function_type IN ('wine-for-dish', 'dish-for-wine', 'pairing-check', 'special-moments')
  ),
  input1 TEXT NOT NULL,
  input2 TEXT,
  context TEXT,
  event_details JSONB,
  had_profile BOOLEAN NOT NULL DEFAULT false,
  response_summary TEXT,
  recommended_wine_ids UUID[],
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_liquid_intelligence_queries_user_created
  ON public.liquid_intelligence_queries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_liquid_intelligence_queries_function_created
  ON public.liquid_intelligence_queries (function_type, created_at DESC);

ALTER TABLE public.liquid_intelligence_queries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'liquid_intelligence_queries'
      AND policyname = 'Users can view their own liquid intelligence queries'
  ) THEN
    CREATE POLICY "Users can view their own liquid intelligence queries"
      ON public.liquid_intelligence_queries
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'liquid_intelligence_queries'
      AND policyname = 'Users can insert their own liquid intelligence queries'
  ) THEN
    CREATE POLICY "Users can insert their own liquid intelligence queries"
      ON public.liquid_intelligence_queries
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'liquid_intelligence_queries'
      AND policyname = 'Admins can view all liquid intelligence queries'
  ) THEN
    CREATE POLICY "Admins can view all liquid intelligence queries"
      ON public.liquid_intelligence_queries
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
