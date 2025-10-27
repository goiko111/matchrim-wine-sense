-- Eliminar temporalmente las restricciones de check para permitir la actualización
ALTER TABLE wine_styles DROP CONSTRAINT IF EXISTS wine_styles_acidez_check;
ALTER TABLE wine_styles DROP CONSTRAINT IF EXISTS wine_styles_afrutado_check;
ALTER TABLE wine_styles DROP CONSTRAINT IF EXISTS wine_styles_dulce_check;
ALTER TABLE wine_styles DROP CONSTRAINT IF EXISTS wine_styles_potente_check;
ALTER TABLE wine_styles DROP CONSTRAINT IF EXISTS wine_styles_tanico_check;

ALTER TABLE matchrim_profiles DROP CONSTRAINT IF EXISTS matchrim_profiles_acidez_check;
ALTER TABLE matchrim_profiles DROP CONSTRAINT IF EXISTS matchrim_profiles_afrutado_check;
ALTER TABLE matchrim_profiles DROP CONSTRAINT IF EXISTS matchrim_profiles_dulce_check;
ALTER TABLE matchrim_profiles DROP CONSTRAINT IF EXISTS matchrim_profiles_potente_check;
ALTER TABLE matchrim_profiles DROP CONSTRAINT IF EXISTS matchrim_profiles_tanico_check;

-- Actualizar valores sensoriales en wine_styles desde el prefijo del nombre
UPDATE wine_styles
SET 
  potente = CAST(SUBSTRING(name FROM '^(\d+);') AS INTEGER),
  acidez = CAST(SUBSTRING(name FROM '^\d+;(\d+);') AS INTEGER),
  dulce = CAST(SUBSTRING(name FROM '^\d+;\d+;(\d+);') AS INTEGER),
  tanico = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;(\d+);') AS INTEGER),
  afrutado = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;\d+;(\d+);') AS INTEGER)
WHERE name ~ '^\d+;\d+;\d+;\d+;\d+;';

-- Actualizar valores sensoriales en matchrim_profiles desde el prefijo del nombre
UPDATE matchrim_profiles
SET 
  potente = CAST(SUBSTRING(name FROM '^(\d+);') AS INTEGER),
  acidez = CAST(SUBSTRING(name FROM '^\d+;(\d+);') AS INTEGER),
  dulce = CAST(SUBSTRING(name FROM '^\d+;\d+;(\d+);') AS INTEGER),
  tanico = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;(\d+);') AS INTEGER),
  afrutado = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;\d+;(\d+);') AS INTEGER)
WHERE name ~ '^\d+;\d+;\d+;\d+;\d+;';

-- Recrear las restricciones de check permitiendo el rango 0-5
ALTER TABLE wine_styles ADD CONSTRAINT wine_styles_potente_check CHECK (potente >= 0 AND potente <= 5);
ALTER TABLE wine_styles ADD CONSTRAINT wine_styles_acidez_check CHECK (acidez >= 0 AND acidez <= 5);
ALTER TABLE wine_styles ADD CONSTRAINT wine_styles_dulce_check CHECK (dulce >= 0 AND dulce <= 5);
ALTER TABLE wine_styles ADD CONSTRAINT wine_styles_tanico_check CHECK (tanico >= 0 AND tanico <= 5);
ALTER TABLE wine_styles ADD CONSTRAINT wine_styles_afrutado_check CHECK (afrutado >= 0 AND afrutado <= 5);

ALTER TABLE matchrim_profiles ADD CONSTRAINT matchrim_profiles_potente_check CHECK (potente >= 0 AND potente <= 5);
ALTER TABLE matchrim_profiles ADD CONSTRAINT matchrim_profiles_acidez_check CHECK (acidez >= 0 AND acidez <= 5);
ALTER TABLE matchrim_profiles ADD CONSTRAINT matchrim_profiles_dulce_check CHECK (dulce >= 0 AND dulce <= 5);
ALTER TABLE matchrim_profiles ADD CONSTRAINT matchrim_profiles_tanico_check CHECK (tanico >= 0 AND tanico <= 5);
ALTER TABLE matchrim_profiles ADD CONSTRAINT matchrim_profiles_afrutado_check CHECK (afrutado >= 0 AND afrutado <= 5);