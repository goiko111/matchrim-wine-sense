
-- First, check what policies exist and drop them if they exist for wine_styles
DROP POLICY IF EXISTS "Anyone can view wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Authenticated users can insert wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Authenticated users can update wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Authenticated users can delete wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can insert wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can update wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can delete wine styles" ON public.wine_styles;

-- Create new policies for wine_styles
CREATE POLICY "Anyone can view wine styles" 
  ON public.wine_styles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert wine styles" 
  ON public.wine_styles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update wine styles" 
  ON public.wine_styles 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete wine styles" 
  ON public.wine_styles 
  FOR DELETE 
  TO authenticated
  USING (true);

-- Do the same for matchrim_profiles
DROP POLICY IF EXISTS "Anyone can view matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can update matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can delete matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can insert matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can update matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can delete matchrim profiles" ON public.matchrim_profiles;

CREATE POLICY "Anyone can view matchrim profiles" 
  ON public.matchrim_profiles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert matchrim profiles" 
  ON public.matchrim_profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update matchrim profiles" 
  ON public.matchrim_profiles 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete matchrim profiles" 
  ON public.matchrim_profiles 
  FOR DELETE 
  TO authenticated
  USING (true);

-- And for wines
DROP POLICY IF EXISTS "Anyone can view wines" ON public.wines;
DROP POLICY IF EXISTS "Authenticated users can insert wines" ON public.wines;
DROP POLICY IF EXISTS "Authenticated users can update wines" ON public.wines;
DROP POLICY IF EXISTS "Authenticated users can delete wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can insert wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can update wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can delete wines" ON public.wines;

CREATE POLICY "Anyone can view wines" 
  ON public.wines 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert wines" 
  ON public.wines 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update wines" 
  ON public.wines 
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete wines" 
  ON public.wines 
  FOR DELETE 
  TO authenticated
  USING (true);
