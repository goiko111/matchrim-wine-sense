
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Table: profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  name TEXT,
  birth_date DATE,
  location TEXT,
  preferred_language TEXT DEFAULT 'ES',
  terms_accepted BOOLEAN DEFAULT false,
  privacy_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: user_roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Table: quiz_results
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  potente INTEGER NOT NULL,
  acidez INTEGER NOT NULL,
  dulce INTEGER NOT NULL,
  tanico INTEGER NOT NULL,
  afrutado INTEGER NOT NULL,
  profile_description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: wine_preferences
CREATE TABLE public.wine_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wine_types TEXT[] DEFAULT '{}',
  experience_type TEXT[] DEFAULT '{}',
  price_range TEXT,
  taste_preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: dietary_preferences
CREATE TABLE public.dietary_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dietary_restrictions TEXT[] DEFAULT '{}',
  food_pairings TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: wines
CREATE TABLE public.wines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  producer TEXT,
  region TEXT,
  vintage INTEGER,
  potencia INTEGER NOT NULL,
  acidez INTEGER NOT NULL,
  dulzura INTEGER NOT NULL,
  taninos INTEGER NOT NULL,
  afrutado INTEGER NOT NULL,
  estilo TEXT NOT NULL,
  description TEXT,
  maridage_recommendations TEXT[],
  grape_varieties TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: wine_styles
CREATE TABLE public.wine_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  potente INTEGER NOT NULL,
  acidez INTEGER NOT NULL,
  dulce INTEGER NOT NULL,
  tanico INTEGER NOT NULL,
  afrutado INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: matchrim_profiles
CREATE TABLE public.matchrim_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  potente INTEGER NOT NULL,
  acidez INTEGER NOT NULL,
  dulce INTEGER NOT NULL,
  tanico INTEGER NOT NULL,
  afrutado INTEGER NOT NULL,
  grape_recommendations TEXT[],
  region_recommendations TEXT[],
  style_recommendations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: classification_history
CREATE TABLE public.classification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wine_id UUID,
  session_id TEXT,
  potencia INTEGER NOT NULL,
  acidez INTEGER NOT NULL,
  dulzura INTEGER NOT NULL,
  taninos INTEGER NOT NULL,
  afrutado INTEGER NOT NULL,
  estilo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: contact_submissions
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: user_wines
CREATE TABLE public.user_wines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  producer TEXT,
  vintage INTEGER,
  region TEXT,
  country TEXT,
  grape_varieties TEXT[],
  alcohol_content NUMERIC,
  tasting_notes TEXT,
  image_url TEXT,
  is_favorite BOOLEAN DEFAULT false,
  rating TEXT,
  personal_note TEXT,
  consumption_place TEXT,
  consumption_place_type TEXT,
  consumption_date TIMESTAMPTZ,
  restaurant_id UUID,
  place_details JSONB,
  matchrim_affinity INTEGER,
  sensory_attributes JSONB,
  use_for_profile_training BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'collection',
  quantity INTEGER DEFAULT 1,
  price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: wine_recommendations
CREATE TABLE public.wine_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_result_id UUID NOT NULL REFERENCES public.quiz_results(id),
  user_id UUID NOT NULL,
  wine_name TEXT NOT NULL,
  wine_type TEXT NOT NULL,
  winery TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  compatibility_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key for user_wines -> profiles
ALTER TABLE public.user_wines ADD CONSTRAINT user_wines_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- Foreign key for classification_history -> wines
ALTER TABLE public.classification_history ADD CONSTRAINT classification_history_wine_id_fkey FOREIGN KEY (wine_id) REFERENCES public.wines(id);

-- DB Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- DB Function: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- DB Function: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(NEW.raw_user_meta_data ->> 'preferred_language', 'ES')
  );
  RETURN NEW;
END;
$$;

-- Trigger: auto-create profile on new auth user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wine_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dietary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wine_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchrim_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wine_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS: profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS: user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Allow first admin assignment" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (
  (NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin')) OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- RLS: quiz_results
CREATE POLICY "Users can view their own quiz results" ON public.quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all quiz results" ON public.quiz_results FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quiz results" ON public.quiz_results FOR UPDATE USING (auth.uid() = user_id);

-- RLS: wine_preferences
CREATE POLICY "Users can view their own wine preferences" ON public.wine_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wine preferences" ON public.wine_preferences FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own wine preferences" ON public.wine_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wine preferences" ON public.wine_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wine preferences" ON public.wine_preferences FOR DELETE USING (auth.uid() = user_id);

-- RLS: dietary_preferences
CREATE POLICY "Users can view their own dietary preferences" ON public.dietary_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all dietary preferences" ON public.dietary_preferences FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own dietary preferences" ON public.dietary_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own dietary preferences" ON public.dietary_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own dietary preferences" ON public.dietary_preferences FOR DELETE USING (auth.uid() = user_id);

-- RLS: wines (public access)
CREATE POLICY "Allow public read access on wines" ON public.wines FOR SELECT USING (true);
CREATE POLICY "Allow public insert on wines" ON public.wines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on wines" ON public.wines FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete wines" ON public.wines FOR DELETE TO authenticated USING (true);

-- RLS: wine_styles (public read, auth write)
CREATE POLICY "Anyone can view wine styles" ON public.wine_styles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authenticated users can insert wine styles" ON public.wine_styles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update wine styles" ON public.wine_styles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete wine styles" ON public.wine_styles FOR DELETE TO authenticated USING (true);

-- RLS: matchrim_profiles
CREATE POLICY "Anyone can view matchrim profiles" ON public.matchrim_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert matchrim profiles" ON public.matchrim_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update matchrim profiles" ON public.matchrim_profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete matchrim profiles" ON public.matchrim_profiles FOR DELETE TO authenticated USING (true);

-- RLS: classification_history (public)
CREATE POLICY "Allow public read access on classification_history" ON public.classification_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert on classification_history" ON public.classification_history FOR INSERT WITH CHECK (true);

-- RLS: contact_submissions
CREATE POLICY "Allow public insert on contact_submissions" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can read contact submissions" ON public.contact_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS: user_wines
CREATE POLICY "Users can view their own wines" ON public.user_wines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wines" ON public.user_wines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wines" ON public.user_wines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wines" ON public.user_wines FOR DELETE USING (auth.uid() = user_id);

-- RLS: wine_recommendations
CREATE POLICY "Users can view their own wine recommendations" ON public.wine_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wine recommendations" ON public.wine_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
