-- Winerim V4.1: clasificacion hibrida TIPO + ESTILO

CREATE OR REPLACE FUNCTION public.winerim_clasificar_por_atributos_v4_1(
  potente integer,
  acidez integer,
  dulzura integer,
  taninos integer,
  afrutado integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF dulzura = 5 THEN
    RETURN CASE WHEN potente >= 3 THEN 'Dulce Intenso' ELSE 'Dulce Ligero' END;
  END IF;

  IF acidez >= 4 AND afrutado >= 3 AND dulzura <= 3 THEN
    RETURN CASE WHEN dulzura <= 1 THEN 'Brut Elegante' ELSE 'Burbuja Fresca' END;
  END IF;

  IF taninos <= 1 THEN
    IF acidez >= 4 AND dulzura <= 2 THEN
      RETURN 'Blanco Vital';
    END IF;
    IF dulzura >= 2 AND afrutado >= 3 THEN
      RETURN 'Blanco Goloso';
    END IF;
    IF acidez >= 2 THEN
      RETURN 'Blanco de Carácter';
    END IF;
    RETURN 'Blanco Goloso';
  END IF;

  IF taninos BETWEEN 2 AND 3 AND afrutado >= 4 THEN
    RETURN CASE WHEN potente <= 2 THEN 'Rosado Ligero' ELSE 'Rosado Gastronómico' END;
  END IF;

  IF taninos >= 2 THEN
    IF afrutado >= 4 AND potente <= 3 THEN
      RETURN 'Tinto Goloso';
    END IF;
    IF potente <= 2 AND taninos <= 3 THEN
      RETURN 'Tinto Ligero';
    END IF;
    IF potente >= 4 AND taninos >= 4 THEN
      RETURN 'Tinto de Estructura';
    END IF;
    IF taninos >= 4 AND afrutado <= 2 AND acidez <= 2 THEN
      RETURN 'Oxidativo/Maduro';
    END IF;
    IF taninos >= 4 AND acidez >= 2 THEN
      RETURN 'Vino de Terruño';
    END IF;
    IF acidez >= 4 AND taninos >= 2 AND afrutado <= 2 THEN
      RETURN 'Experimental';
    END IF;
    RETURN 'Tinto Versátil';
  END IF;

  IF afrutado >= 4 THEN
    RETURN 'Blanco Goloso';
  END IF;
  IF acidez >= 4 THEN
    RETURN 'Blanco Vital';
  END IF;
  RETURN 'Blanco de Carácter';
END;
$$;

CREATE OR REPLACE FUNCTION public.winerim_estilo_compatible_v4_1(style_name text, tipo_input text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE style_name
    WHEN 'Tinto Versátil' THEN tipo_input = 'Tinto'
    WHEN 'Tinto de Estructura' THEN tipo_input = 'Tinto'
    WHEN 'Tinto Goloso' THEN tipo_input = 'Tinto'
    WHEN 'Tinto Ligero' THEN tipo_input = 'Tinto'
    WHEN 'Blanco Goloso' THEN tipo_input = 'Blanco'
    WHEN 'Blanco Vital' THEN tipo_input = 'Blanco'
    WHEN 'Blanco de Carácter' THEN tipo_input = 'Blanco'
    WHEN 'Brut Elegante' THEN tipo_input = 'Espumoso'
    WHEN 'Burbuja Fresca' THEN tipo_input = 'Espumoso'
    WHEN 'Rosado Ligero' THEN tipo_input = 'Rosado'
    WHEN 'Rosado Gastronómico' THEN tipo_input = 'Rosado'
    WHEN 'Dulce Ligero' THEN tipo_input = 'Dulce'
    WHEN 'Dulce Intenso' THEN tipo_input = 'Dulce'
    WHEN 'Oxidativo/Maduro' THEN tipo_input = 'Fortificado'
    WHEN 'Experimental' THEN tipo_input IN ('Espumoso', 'Blanco', 'Tinto', 'Rosado', 'Dulce', 'Fortificado')
    WHEN 'Vino de Terruño' THEN tipo_input IN ('Tinto', 'Blanco')
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.winerim_rangos_estilo_v4_1(style_name text)
RETURNS TABLE (
  estilo text,
  p_min integer, p_max integer,
  a_min integer, a_max integer,
  d_min integer, d_max integer,
  t_min integer, t_max integer,
  af_min integer, af_max integer
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT *
  FROM (VALUES
    ('Tinto Versátil', 0, 5, 2, 5, 0, 4, 2, 5, 0, 3),
    ('Tinto de Estructura', 4, 5, 0, 5, 0, 4, 4, 5, 0, 5),
    ('Tinto Goloso', 0, 3, 0, 5, 0, 4, 2, 5, 4, 5),
    ('Tinto Ligero', 0, 2, 0, 5, 0, 4, 2, 3, 0, 3),
    ('Blanco Goloso', 0, 5, 0, 5, 2, 4, 0, 1, 3, 5),
    ('Blanco Vital', 0, 5, 4, 5, 0, 2, 0, 1, 0, 2),
    ('Blanco de Carácter', 0, 5, 2, 5, 0, 2, 0, 1, 0, 2),
    ('Brut Elegante', 0, 5, 4, 5, 0, 1, 0, 2, 3, 5),
    ('Burbuja Fresca', 0, 5, 3, 5, 2, 3, 0, 2, 3, 5),
    ('Rosado Ligero', 0, 2, 0, 5, 0, 3, 0, 3, 3, 5),
    ('Rosado Gastronómico', 3, 5, 0, 5, 0, 3, 0, 3, 3, 5),
    ('Dulce Ligero', 0, 2, 0, 5, 4, 5, 0, 3, 0, 5),
    ('Dulce Intenso', 3, 5, 0, 5, 4, 5, 0, 5, 0, 5),
    ('Oxidativo/Maduro', 0, 5, 0, 3, 0, 5, 0, 5, 0, 2),
    ('Experimental', 0, 5, 0, 5, 0, 5, 0, 5, 0, 5),
    ('Vino de Terruño', 0, 5, 2, 5, 0, 4, 4, 5, 0, 3)
  ) AS ranges(estilo, p_min, p_max, a_min, a_max, d_min, d_max, t_min, t_max, af_min, af_max)
  WHERE ranges.estilo = style_name;
$$;

CREATE OR REPLACE FUNCTION public.winerim_especificidad_v4_1(style_name text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE((
    SELECT
      (p_max - p_min) +
      (a_max - a_min) +
      (d_max - d_min) +
      (t_max - t_min) +
      (af_max - af_min)
    FROM public.winerim_rangos_estilo_v4_1(style_name)
  ), 999);
$$;

CREATE OR REPLACE FUNCTION public.winerim_calcular_encaje_v4_1(
  potente integer,
  acidez integer,
  dulzura integer,
  taninos integer,
  afrutado integer,
  style_name text
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE((
    SELECT round((
      CASE WHEN potente BETWEEN p_min AND p_max THEN 20 ELSE GREATEST(0, 20 - (LEAST(ABS(potente - p_min), ABS(potente - p_max)) / 5.0) * 20) END +
      CASE WHEN acidez BETWEEN a_min AND a_max THEN 20 ELSE GREATEST(0, 20 - (LEAST(ABS(acidez - a_min), ABS(acidez - a_max)) / 5.0) * 20) END +
      CASE WHEN dulzura BETWEEN d_min AND d_max THEN 20 ELSE GREATEST(0, 20 - (LEAST(ABS(dulzura - d_min), ABS(dulzura - d_max)) / 5.0) * 20) END +
      CASE WHEN taninos BETWEEN t_min AND t_max THEN 20 ELSE GREATEST(0, 20 - (LEAST(ABS(taninos - t_min), ABS(taninos - t_max)) / 5.0) * 20) END +
      CASE WHEN afrutado BETWEEN af_min AND af_max THEN 20 ELSE GREATEST(0, 20 - (LEAST(ABS(afrutado - af_min), ABS(afrutado - af_max)) / 5.0) * 20) END
    )::numeric, 1)
    FROM public.winerim_rangos_estilo_v4_1(style_name)
  ), 0);
$$;

CREATE OR REPLACE FUNCTION public.winerim_estilos_del_tipo_v4_1(tipo_input text, incluir_excluidos boolean DEFAULT false)
RETURNS TABLE (estilo text)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT styles.estilo
  FROM (VALUES
    ('Tinto Versátil', ARRAY['Tinto'], false),
    ('Tinto de Estructura', ARRAY['Tinto'], false),
    ('Tinto Goloso', ARRAY['Tinto'], false),
    ('Tinto Ligero', ARRAY['Tinto'], false),
    ('Blanco Goloso', ARRAY['Blanco'], false),
    ('Blanco Vital', ARRAY['Blanco'], false),
    ('Blanco de Carácter', ARRAY['Blanco'], false),
    ('Brut Elegante', ARRAY['Espumoso'], false),
    ('Burbuja Fresca', ARRAY['Espumoso'], false),
    ('Rosado Ligero', ARRAY['Rosado'], false),
    ('Rosado Gastronómico', ARRAY['Rosado'], false),
    ('Dulce Ligero', ARRAY['Dulce'], false),
    ('Dulce Intenso', ARRAY['Dulce'], false),
    ('Oxidativo/Maduro', ARRAY['Fortificado'], false),
    ('Experimental', ARRAY['Espumoso', 'Blanco', 'Tinto', 'Rosado', 'Dulce', 'Fortificado'], true),
    ('Vino de Terruño', ARRAY['Tinto', 'Blanco'], false)
  ) AS styles(estilo, tipos, excluido)
  WHERE tipo_input = ANY(styles.tipos)
    AND (incluir_excluidos OR NOT styles.excluido);
$$;

CREATE OR REPLACE FUNCTION public.winerim_clasificar_v4_1(
  potente integer,
  acidez integer,
  dulzura integer,
  taninos integer,
  afrutado integer,
  tipo text
)
RETURNS TABLE (
  estilo_final text,
  estilo_origen text,
  encaje_pct numeric,
  flag text,
  alternativas jsonb
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  origin_style text;
  best_style text;
  best_pct numeric;
  alt_json jsonb;
  final_style text;
  final_flag text;
BEGIN
  IF potente NOT BETWEEN 0 AND 5
    OR acidez NOT BETWEEN 0 AND 5
    OR dulzura NOT BETWEEN 0 AND 5
    OR taninos NOT BETWEEN 0 AND 5
    OR afrutado NOT BETWEEN 0 AND 5 THEN
    RAISE EXCEPTION 'Los atributos deben estar entre 0 y 5';
  END IF;

  IF tipo NOT IN ('Espumoso', 'Blanco', 'Tinto', 'Rosado', 'Dulce', 'Fortificado') THEN
    RAISE EXCEPTION 'Tipo invalido: %', tipo;
  END IF;

  origin_style := public.winerim_clasificar_por_atributos_v4_1(potente, acidez, dulzura, taninos, afrutado);

  IF public.winerim_estilo_compatible_v4_1(origin_style, tipo) THEN
    RETURN QUERY SELECT origin_style, origin_style, 100.0::numeric, 'directo'::text, '[]'::jsonb;
    RETURN;
  END IF;

  WITH ranked AS (
    SELECT
      candidate.estilo,
      public.winerim_calcular_encaje_v4_1(potente, acidez, dulzura, taninos, afrutado, candidate.estilo) AS encaje,
      public.winerim_especificidad_v4_1(candidate.estilo) AS especificidad
    FROM public.winerim_estilos_del_tipo_v4_1(tipo, false) candidate
    ORDER BY encaje DESC, especificidad ASC, candidate.estilo ASC
  ),
  top3 AS (
    SELECT * FROM ranked LIMIT 3
  )
  SELECT
    top3.estilo,
    top3.encaje,
    (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('estilo', estilo, 'encaje', encaje) ORDER BY encaje DESC, especificidad ASC, estilo ASC),
        '[]'::jsonb
      )
      FROM top3
    )
  INTO best_style, best_pct, alt_json
  FROM top3
  ORDER BY encaje DESC, especificidad ASC, estilo ASC
  LIMIT 1;

  IF best_style IS NULL THEN
    RETURN QUERY SELECT 'Sin encaje por tipo'::text, origin_style, 0.0::numeric, 'sin_encaje'::text, '[]'::jsonb;
    RETURN;
  END IF;

  IF best_pct >= 90 THEN
    final_style := best_style;
    final_flag := 'auto_reasignado';
  ELSIF best_pct >= 75 THEN
    final_style := best_style;
    final_flag := 'auto_reasignado_revisar';
  ELSE
    final_style := 'Sin encaje por tipo';
    final_flag := 'sin_encaje';
  END IF;

  RETURN QUERY SELECT final_style, origin_style, best_pct, final_flag, alt_json;
END;
$$;

CREATE OR REPLACE FUNCTION public.winerim_infer_tipo_v4_1(
  style_name text,
  potente integer,
  acidez integer,
  dulzura integer,
  taninos integer,
  afrutado integer
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean_style text;
BEGIN
  clean_style := trim(regexp_replace(COALESCE(style_name, ''), '^\d+;\d+;\d+;\d+;\d+;', ''));
  clean_style := trim(regexp_replace(clean_style, '\s*\(\d+\)\s*$', ''));

  IF clean_style IN ('Brut Elegante', 'Burbuja Fresca') THEN
    RETURN 'Espumoso';
  ELSIF clean_style IN ('Blanco Goloso', 'Blanco Vital', 'Blanco de Carácter') THEN
    RETURN 'Blanco';
  ELSIF clean_style IN ('Tinto Versátil', 'Tinto de Estructura', 'Tinto Goloso', 'Tinto Ligero', 'Vino de Terruño') THEN
    RETURN 'Tinto';
  ELSIF clean_style IN ('Rosado Ligero', 'Rosado Gastronómico') THEN
    RETURN 'Rosado';
  ELSIF clean_style IN ('Dulce Ligero', 'Dulce Intenso') THEN
    RETURN 'Dulce';
  ELSIF clean_style = 'Oxidativo/Maduro' THEN
    RETURN 'Fortificado';
  END IF;

  IF dulzura >= 4 THEN
    RETURN 'Dulce';
  ELSIF acidez >= 4 AND afrutado >= 3 AND taninos <= 2 THEN
    RETURN 'Espumoso';
  ELSIF taninos <= 3 AND afrutado >= 3 AND potente <= 3 THEN
    RETURN 'Rosado';
  ELSIF taninos <= 1 THEN
    RETURN 'Blanco';
  END IF;

  RETURN 'Tinto';
END;
$$;

ALTER TABLE public.wines
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS estilo_origen text,
  ADD COLUMN IF NOT EXISTS encaje_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS flag_reasignacion text,
  ADD COLUMN IF NOT EXISTS alternativas_reasignacion jsonb DEFAULT '[]'::jsonb;

UPDATE public.wines
SET tipo = public.winerim_infer_tipo_v4_1(estilo, potencia, acidez, dulzura, taninos, afrutado)
WHERE tipo IS NULL
  OR tipo NOT IN ('Espumoso', 'Blanco', 'Tinto', 'Rosado', 'Dulce', 'Fortificado');

WITH classified AS (
  SELECT
    w.id,
    result.estilo_final,
    result.estilo_origen,
    result.encaje_pct,
    result.flag,
    result.alternativas
  FROM public.wines w
  CROSS JOIN LATERAL public.winerim_clasificar_v4_1(
    w.potencia,
    w.acidez,
    w.dulzura,
    w.taninos,
    w.afrutado,
    w.tipo
  ) result
)
UPDATE public.wines w
SET
  estilo = classified.estilo_final,
  estilo_origen = classified.estilo_origen,
  encaje_pct = classified.encaje_pct,
  flag_reasignacion = classified.flag,
  alternativas_reasignacion = classified.alternativas,
  updated_at = now()
FROM classified
WHERE w.id = classified.id;

ALTER TABLE public.wines
  ALTER COLUMN tipo SET NOT NULL,
  ALTER COLUMN alternativas_reasignacion SET DEFAULT '[]'::jsonb;

ALTER TABLE public.wines
  DROP CONSTRAINT IF EXISTS wines_tipo_valid,
  DROP CONSTRAINT IF EXISTS wines_flag_reasignacion_valid,
  ADD CONSTRAINT wines_tipo_valid CHECK (tipo IN ('Espumoso', 'Blanco', 'Tinto', 'Rosado', 'Dulce', 'Fortificado')),
  ADD CONSTRAINT wines_flag_reasignacion_valid CHECK (
    flag_reasignacion IS NULL
    OR flag_reasignacion IN ('directo', 'auto_reasignado', 'auto_reasignado_revisar', 'sin_encaje')
  );

CREATE INDEX IF NOT EXISTS idx_wines_tipo_estilo_visible
  ON public.wines(tipo, estilo)
  WHERE estilo <> 'Sin encaje por tipo';

CREATE INDEX IF NOT EXISTS idx_wines_reasignacion_review
  ON public.wines(flag_reasignacion, encaje_pct DESC)
  WHERE flag_reasignacion IN ('sin_encaje', 'auto_reasignado_revisar');
