-- Harden the production RLS surface reported by the Lovable security scan.
-- Public reads stay available for catalog/reference data; all writes require admin role.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    ),
    false
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO postgres, service_role, authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.has_role(_user_id, _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Keep function search paths explicit for Supabase database linter 0011.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = '';

ALTER FUNCTION public.winerim_clasificar_por_atributos_v4_1(integer, integer, integer, integer, integer)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.winerim_estilo_compatible_v4_1(text, text)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.winerim_rangos_estilo_v4_1(text)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.winerim_especificidad_v4_1(text)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.winerim_calcular_encaje_v4_1(integer, integer, integer, integer, integer, text)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.winerim_estilos_del_tipo_v4_1(text, boolean)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.winerim_clasificar_v4_1(integer, integer, integer, integer, integer, text)
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.winerim_infer_tipo_v4_1(text, integer, integer, integer, integer, integer)
  SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Profiles: users manage themselves, admins can read all.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- User roles: remove open bootstrap/self-assignment and require an existing admin.
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow first admin assignment" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

-- User-owned data with admin read access.
DROP POLICY IF EXISTS "Admins can view all quiz results" ON public.quiz_results;
DROP POLICY IF EXISTS "Admins can view all wine preferences" ON public.wine_preferences;
DROP POLICY IF EXISTS "Admins can view all dietary preferences" ON public.dietary_preferences;

CREATE POLICY "Admins can view all quiz results"
  ON public.quiz_results
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can view all wine preferences"
  ON public.wine_preferences
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can view all dietary preferences"
  ON public.dietary_preferences
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

-- Wine styles: public reference reads, admin-only writes.
DROP POLICY IF EXISTS "Anyone can view wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Authenticated users can manage wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Authenticated users can insert wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Authenticated users can update wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Authenticated users can delete wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can manage wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can insert wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can update wine styles" ON public.wine_styles;
DROP POLICY IF EXISTS "Admins can delete wine styles" ON public.wine_styles;

CREATE POLICY "Anyone can view wine styles"
  ON public.wine_styles
  FOR SELECT
  TO anon, authenticated
  USING (id IS NOT NULL);

CREATE POLICY "Admins can insert wine styles"
  ON public.wine_styles
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update wine styles"
  ON public.wine_styles
  FOR UPDATE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete wine styles"
  ON public.wine_styles
  FOR DELETE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

-- Matchrim profiles: public reference reads, admin-only writes.
DROP POLICY IF EXISTS "Anyone can view matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Users can view matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Users can insert matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Users can update matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Users can delete matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can insert matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can update matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Authenticated users can delete matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can manage matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can insert matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can update matchrim profiles" ON public.matchrim_profiles;
DROP POLICY IF EXISTS "Admins can delete matchrim profiles" ON public.matchrim_profiles;

CREATE POLICY "Anyone can view matchrim profiles"
  ON public.matchrim_profiles
  FOR SELECT
  TO anon, authenticated
  USING (id IS NOT NULL);

CREATE POLICY "Admins can insert matchrim profiles"
  ON public.matchrim_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update matchrim profiles"
  ON public.matchrim_profiles
  FOR UPDATE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete matchrim profiles"
  ON public.matchrim_profiles
  FOR DELETE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

-- Wines: public catalog reads, admin-only mutations.
DROP POLICY IF EXISTS "Allow public read access on wines" ON public.wines;
DROP POLICY IF EXISTS "Allow public insert on wines" ON public.wines;
DROP POLICY IF EXISTS "Allow public update on wines" ON public.wines;
DROP POLICY IF EXISTS "Anyone can view wines" ON public.wines;
DROP POLICY IF EXISTS "Authenticated users can manage wines" ON public.wines;
DROP POLICY IF EXISTS "Authenticated users can insert wines" ON public.wines;
DROP POLICY IF EXISTS "Authenticated users can update wines" ON public.wines;
DROP POLICY IF EXISTS "Authenticated users can delete wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can manage wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can insert wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can update wines" ON public.wines;
DROP POLICY IF EXISTS "Admins can delete wines" ON public.wines;

CREATE POLICY "Anyone can view wines"
  ON public.wines
  FOR SELECT
  TO anon, authenticated
  USING (id IS NOT NULL);

CREATE POLICY "Admins can insert wines"
  ON public.wines
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update wines"
  ON public.wines
  FOR UPDATE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete wines"
  ON public.wines
  FOR DELETE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

-- Classification history is operational/audit data; keep it admin-only.
DROP POLICY IF EXISTS "Allow public read access on classification_history" ON public.classification_history;
DROP POLICY IF EXISTS "Allow public insert on classification_history" ON public.classification_history;
DROP POLICY IF EXISTS "Admins can view classification history" ON public.classification_history;
DROP POLICY IF EXISTS "Admins can insert classification history" ON public.classification_history;
DROP POLICY IF EXISTS "Admins can update classification history" ON public.classification_history;
DROP POLICY IF EXISTS "Admins can delete classification history" ON public.classification_history;

CREATE POLICY "Admins can view classification history"
  ON public.classification_history
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can insert classification history"
  ON public.classification_history
  FOR INSERT
  TO authenticated
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can update classification history"
  ON public.classification_history
  FOR UPDATE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role))
  WITH CHECK (private.has_role((select auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins can delete classification history"
  ON public.classification_history
  FOR DELETE
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

-- Contact submissions: public inserts, admin reads.
DROP POLICY IF EXISTS "Allow public insert on contact_submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Only admins can read contact submissions" ON public.contact_submissions;

CREATE POLICY "Allow public insert on contact_submissions"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    restaurant_name IS NOT NULL
    AND contact_name IS NOT NULL
    AND phone_number IS NOT NULL
  );

CREATE POLICY "Only admins can read contact submissions"
  ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));

-- aiRIM query logs: users see their own, admins see all.
DROP POLICY IF EXISTS "Admins can view all liquid intelligence queries" ON public.liquid_intelligence_queries;

CREATE POLICY "Admins can view all liquid intelligence queries"
  ON public.liquid_intelligence_queries
  FOR SELECT
  TO authenticated
  USING (private.has_role((select auth.uid()), 'admin'::public.app_role));
