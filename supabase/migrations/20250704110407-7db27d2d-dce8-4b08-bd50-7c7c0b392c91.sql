-- Crear un índice único en el nombre para prevenir duplicados futuros
CREATE UNIQUE INDEX IF NOT EXISTS idx_matchrim_profiles_name_unique 
ON matchrim_profiles (name);

-- Eliminar registros que excedan el límite esperado (mantener los más antiguos)
WITH ordered_profiles AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as position
  FROM matchrim_profiles
)
DELETE FROM matchrim_profiles 
WHERE id IN (
  SELECT id FROM ordered_profiles WHERE position > 7776
);