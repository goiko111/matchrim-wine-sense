
-- Crear una política temporal que permita al primer usuario asignarse el rol de admin
-- Esta política permite insertar roles si no existe ningún admin en el sistema
DROP POLICY IF EXISTS "Allow first admin assignment" ON public.user_roles;
CREATE POLICY "Allow first admin assignment" 
  ON public.user_roles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    -- Permitir inserción si no hay ningún admin en el sistema
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
    OR 
    -- O si el usuario ya tiene rol de admin
    public.has_role(auth.uid(), 'admin')
  );
