-- Agregar restricciones CHECK para permitir valores de 0 a 5 en atributos sensoriales
-- Esto es necesario para la importación de Excel/CSV

-- Tabla wine_styles
ALTER TABLE public.wine_styles 
ADD CONSTRAINT wine_styles_potente_range CHECK (potente >= 0 AND potente <= 5),
ADD CONSTRAINT wine_styles_acidez_range CHECK (acidez >= 0 AND acidez <= 5),
ADD CONSTRAINT wine_styles_dulce_range CHECK (dulce >= 0 AND dulce <= 5),
ADD CONSTRAINT wine_styles_tanico_range CHECK (tanico >= 0 AND tanico <= 5),
ADD CONSTRAINT wine_styles_afrutado_range CHECK (afrutado >= 0 AND afrutado <= 5);

-- Tabla wines (nota: usa nombres ligeramente diferentes)
ALTER TABLE public.wines 
ADD CONSTRAINT wines_potencia_range CHECK (potencia >= 0 AND potencia <= 5),
ADD CONSTRAINT wines_acidez_range CHECK (acidez >= 0 AND acidez <= 5),
ADD CONSTRAINT wines_dulzura_range CHECK (dulzura >= 0 AND dulzura <= 5),
ADD CONSTRAINT wines_taninos_range CHECK (taninos >= 0 AND taninos <= 5),
ADD CONSTRAINT wines_afrutado_range CHECK (afrutado >= 0 AND afrutado <= 5);

-- Tabla matchrim_profiles
ALTER TABLE public.matchrim_profiles 
ADD CONSTRAINT matchrim_profiles_potente_range CHECK (potente >= 0 AND potente <= 5),
ADD CONSTRAINT matchrim_profiles_acidez_range CHECK (acidez >= 0 AND acidez <= 5),
ADD CONSTRAINT matchrim_profiles_dulce_range CHECK (dulce >= 0 AND dulce <= 5),
ADD CONSTRAINT matchrim_profiles_tanico_range CHECK (tanico >= 0 AND tanico <= 5),
ADD CONSTRAINT matchrim_profiles_afrutado_range CHECK (afrutado >= 0 AND afrutado <= 5);

-- Tabla classification_history (nota: usa nombres ligeramente diferentes)
ALTER TABLE public.classification_history 
ADD CONSTRAINT classification_history_potencia_range CHECK (potencia >= 0 AND potencia <= 5),
ADD CONSTRAINT classification_history_acidez_range CHECK (acidez >= 0 AND acidez <= 5),
ADD CONSTRAINT classification_history_dulzura_range CHECK (dulzura >= 0 AND dulzura <= 5),
ADD CONSTRAINT classification_history_taninos_range CHECK (taninos >= 0 AND taninos <= 5),
ADD CONSTRAINT classification_history_afrutado_range CHECK (afrutado >= 0 AND afrutado <= 5);