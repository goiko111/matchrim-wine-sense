
-- Crear tabla para estilos de vino
CREATE TABLE IF NOT EXISTS public.wine_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  potente INTEGER NOT NULL CHECK (potente >= 1 AND potente <= 5),
  acidez INTEGER NOT NULL CHECK (acidez >= 1 AND acidez <= 5),
  dulce INTEGER NOT NULL CHECK (dulce >= 1 AND dulce <= 5),
  tanico INTEGER NOT NULL CHECK (tanico >= 1 AND tanico <= 5),
  afrutado INTEGER NOT NULL CHECK (afrutado >= 1 AND afrutado <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para perfiles de Matchrim
CREATE TABLE IF NOT EXISTS public.matchrim_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  potente INTEGER NOT NULL CHECK (potente >= 1 AND potente <= 5),
  acidez INTEGER NOT NULL CHECK (acidez >= 1 AND acidez <= 5),
  dulce INTEGER NOT NULL CHECK (dulce >= 1 AND dulce <= 5),
  tanico INTEGER NOT NULL CHECK (tanico >= 1 AND tanico <= 5),
  afrutado INTEGER NOT NULL CHECK (afrutado >= 1 AND afrutado <= 5),
  description TEXT,
  grape_recommendations TEXT[],
  region_recommendations TEXT[],
  style_recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.wine_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchrim_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para wine_styles (permitir lectura a todos, escritura solo a admins)
CREATE POLICY "Anyone can view wine styles" 
  ON public.wine_styles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage wine styles" 
  ON public.wine_styles 
  FOR ALL 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para matchrim_profiles (permitir lectura a todos, escritura solo a admins)
CREATE POLICY "Anyone can view matchrim profiles" 
  ON public.matchrim_profiles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage matchrim profiles" 
  ON public.matchrim_profiles 
  FOR ALL 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para wines (permitir lectura a todos, escritura solo a admins)
CREATE POLICY "Anyone can view wines" 
  ON public.wines 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage wines" 
  ON public.wines 
  FOR ALL 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
