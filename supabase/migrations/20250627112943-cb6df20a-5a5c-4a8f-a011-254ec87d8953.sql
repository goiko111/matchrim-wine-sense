
-- Actualizar políticas para permitir inserción de datos durante importación
-- Política más permisiva para wine_styles
DROP POLICY IF EXISTS "Admins can manage wine styles" ON public.wine_styles;
CREATE POLICY "Authenticated users can manage wine styles" 
  ON public.wine_styles 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política más permisiva para matchrim_profiles
DROP POLICY IF EXISTS "Admins can manage matchrim profiles" ON public.matchrim_profiles;
CREATE POLICY "Authenticated users can manage matchrim profiles" 
  ON public.matchrim_profiles 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política más permisiva para wines
DROP POLICY IF EXISTS "Admins can manage wines" ON public.wines;
CREATE POLICY "Authenticated users can manage wines" 
  ON public.wines 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);
