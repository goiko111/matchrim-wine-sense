-- Create user_wines table for personal wine collection
CREATE TABLE IF NOT EXISTS public.user_wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  producer TEXT,
  vintage INTEGER,
  region TEXT,
  country TEXT,
  grape_varieties TEXT[],
  alcohol_content NUMERIC(4,2),
  tasting_notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_wines ENABLE ROW LEVEL SECURITY;

-- Users can view their own wines
CREATE POLICY "Users can view their own wines"
  ON public.user_wines
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own wines
CREATE POLICY "Users can insert their own wines"
  ON public.user_wines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own wines
CREATE POLICY "Users can update their own wines"
  ON public.user_wines
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own wines
CREATE POLICY "Users can delete their own wines"
  ON public.user_wines
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_wines_updated_at
  BEFORE UPDATE ON public.user_wines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster queries
CREATE INDEX idx_user_wines_user_id ON public.user_wines(user_id);
CREATE INDEX idx_user_wines_created_at ON public.user_wines(created_at DESC);