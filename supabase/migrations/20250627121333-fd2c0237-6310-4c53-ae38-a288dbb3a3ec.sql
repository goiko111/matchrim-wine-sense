
-- Eliminar las políticas existentes para matchrim_profiles
DROP POLICY IF EXISTS "Anyone can view matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can manage matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage matchrim profiles" ON public.matchrim_profiles;

-- Crear nuevas políticas más permisivas para matchrim_profiles
-- Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Users can view matchrim profiles" 
  ON public.matchrim_profiles 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Permitir inserción a todos los usuarios autenticados
CREATE POLICY "Users can insert matchrim profiles" 
  ON public.matchrim_profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Permitir actualización a todos los usuarios autenticados
CREATE POLICY "Users can update matchrim profiles" 
  ON public.matchrim_profiles 
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir eliminación a todos los usuarios autenticados
CREATE POLICY "Users can delete matchrim profiles" 
  ON public.matchrim_profiles 
  FOR DELETE 
  TO authenticated
  USING (true);
