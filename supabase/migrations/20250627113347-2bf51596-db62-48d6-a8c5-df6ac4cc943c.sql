
-- Crear tabla para almacenar roles de usuarios (si no existe)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS en la tabla user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función para verificar si un usuario tiene un rol específico (SECURITY DEFINER para evitar recursión)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Eliminar políticas existentes en user_roles si existen
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Políticas RLS para user_roles
-- Los usuarios pueden ver sus propios roles
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Solo los admins pueden gestionar roles
CREATE POLICY "Admins can insert roles" 
  ON public.user_roles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" 
  ON public.user_roles 
  FOR UPDATE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" 
  ON public.user_roles 
  FOR DELETE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Actualizar políticas existentes para usar el sistema de roles
-- Políticas para wine_styles
DROP POLICY IF EXISTS "Authenticated users can manage wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Anyone can view wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can manage wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can insert wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can update wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can delete wine styles" ON public.wine_styles;

CREATE POLICY "Anyone can view wine styles" 
  ON public.wine_styles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert wine styles" 
  ON public.wine_styles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update wine styles" 
  ON public.wine_styles 
  FOR UPDATE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wine styles" 
  ON public.wine_styles 
  FOR DELETE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para matchrim_profiles
DROP POLICY IF EXISTS "Authenticated users can manage matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Anyone can view matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can manage matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can insert matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can update matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can delete matchrim profiles" ON public.matchrim_profiles;

CREATE POLICY "Anyone can view matchrim profiles" 
  ON public.matchrim_profiles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert matchrim profiles" 
  ON public.matchrim_profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update matchrim profiles" 
  ON public.matchrim_profiles 
  FOR UPDATE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete matchrim profiles" 
  ON public.matchrim_profiles 
  FOR DELETE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para wines
DROP POLICY IF EXISTS "Authenticated users can manage wines" ON public.wines;
DROP POLICY IF EXISTS "Anyone can view wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can manage wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can insert wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can update wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can delete wines" ON public.wines;

CREATE POLICY "Anyone can view wines" 
  ON public.wines 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert wines" 
  ON public.wines 
  FOR INSERT 
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update wines" 
  ON public.wines 
  FOR UPDATE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wines" 
  ON public.wines 
  FOR DELETE 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
