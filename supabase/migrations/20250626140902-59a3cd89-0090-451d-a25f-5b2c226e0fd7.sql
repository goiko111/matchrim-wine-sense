
-- Extender la tabla profiles con los nuevos campos del formulario de registro
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ES';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT FALSE;

-- Crear tabla para preferencias de vino
CREATE TABLE IF NOT EXISTS public.wine_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wine_types TEXT[] DEFAULT '{}', -- blancos, tintos, espumosos, naturales, biodinamicos, sin_sulfito
  taste_preferences TEXT[] DEFAULT '{}', -- seco, aterciopelado, frutal, potente
  price_range TEXT, -- <15, 15-30, 30-60, +60
  experience_type TEXT[] DEFAULT '{}', -- armonia_comida, descubrir, consejos_sumiller, autonomia
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para preferencias dietéticas y maridajes
CREATE TABLE IF NOT EXISTS public.dietary_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dietary_restrictions TEXT[] DEFAULT '{}', -- vegana, vegetariana, sin_gluten, sin_lactosa
  food_pairings TEXT[] DEFAULT '{}', -- quesos, carnes_rojas, pescado, postres
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.wine_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dietary_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para wine_preferences
CREATE POLICY "Users can view their own wine preferences" 
  ON public.wine_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wine preferences" 
  ON public.wine_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wine preferences" 
  ON public.wine_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wine preferences" 
  ON public.wine_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas RLS para dietary_preferences
CREATE POLICY "Users can view their own dietary preferences" 
  ON public.dietary_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dietary preferences" 
  ON public.dietary_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dietary preferences" 
  ON public.dietary_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dietary preferences" 
  ON public.dietary_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Actualizar la función handle_new_user para incluir los nuevos campos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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
