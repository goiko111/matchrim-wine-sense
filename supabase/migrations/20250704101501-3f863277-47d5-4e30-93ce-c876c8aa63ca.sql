-- Actualizar las restricciones CHECK existentes para permitir valores de 0 a 5
-- Primero eliminamos las restricciones existentes que van de 1 a 5

-- Tabla matchrim_profiles
ALTER TABLE public.matchrim_profiles 
DROP CONSTRAINT IF EXISTS matchrim_profiles_potente_check,
DROP CONSTRAINT IF EXISTS matchrim_profiles_acidez_check,
DROP CONSTRAINT IF EXISTS matchrim_profiles_dulce_check,
DROP CONSTRAINT IF EXISTS matchrim_profiles_tanico_check,
DROP CONSTRAINT IF EXISTS matchrim_profiles_afrutado_check;

-- Agregar nuevas restricciones CHECK que permitan valores de 0 a 5
ALTER TABLE public.matchrim_profiles 
ADD CONSTRAINT matchrim_profiles_potente_check CHECK (potente >= 0 AND potente <= 5),
ADD CONSTRAINT matchrim_profiles_acidez_check CHECK (acidez >= 0 AND acidez <= 5),
ADD CONSTRAINT matchrim_profiles_dulce_check CHECK (dulce >= 0 AND dulce <= 5),
ADD CONSTRAINT matchrim_profiles_tanico_check CHECK (tanico >= 0 AND tanico <= 5),
ADD CONSTRAINT matchrim_profiles_afrutado_check CHECK (afrutado >= 0 AND afrutado <= 5);