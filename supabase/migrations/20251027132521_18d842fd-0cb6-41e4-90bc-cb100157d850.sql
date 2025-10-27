-- Actualizar las columnas con los valores correctos del prefijo en wine_styles
UPDATE wine_styles
SET 
  potente = CAST(SUBSTRING(name FROM '^(\d+);') AS INTEGER),
  acidez = CAST(SUBSTRING(name FROM '^\d+;(\d+);') AS INTEGER),
  dulce = CAST(SUBSTRING(name FROM '^\d+;\d+;(\d+);') AS INTEGER),
  tanico = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;(\d+);') AS INTEGER),
  afrutado = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;\d+;(\d+);') AS INTEGER)
WHERE name ~ '^\d+;\d+;\d+;\d+;\d+;';

-- Actualizar las columnas con los valores correctos del prefijo en matchrim_profiles
UPDATE matchrim_profiles
SET 
  potente = CAST(SUBSTRING(name FROM '^(\d+);') AS INTEGER),
  acidez = CAST(SUBSTRING(name FROM '^\d+;(\d+);') AS INTEGER),
  dulce = CAST(SUBSTRING(name FROM '^\d+;\d+;(\d+);') AS INTEGER),
  tanico = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;(\d+);') AS INTEGER),
  afrutado = CAST(SUBSTRING(name FROM '^\d+;\d+;\d+;\d+;(\d+);') AS INTEGER)
WHERE name ~ '^\d+;\d+;\d+;\d+;\d+;';