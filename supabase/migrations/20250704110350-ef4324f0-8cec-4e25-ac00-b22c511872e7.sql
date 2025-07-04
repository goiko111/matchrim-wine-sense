-- Eliminar duplicados manteniendo solo el registro más reciente por nombre
WITH duplicates AS (
  SELECT id, name, created_at,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
  FROM matchrim_profiles
)
DELETE FROM matchrim_profiles 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);