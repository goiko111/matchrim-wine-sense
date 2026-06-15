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
SET search_path TO 'pg_catalog', 'public'
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
      public.winerim_especificidad_v4_1(candidate.estilo) AS especificidad,
      CASE candidate.estilo
        WHEN 'Tinto Goloso' THEN 0
        WHEN 'Tinto de Estructura' THEN 1
        ELSE 2
      END AS tie_order
    FROM public.winerim_estilos_del_tipo_v4_1(tipo, false) candidate
    ORDER BY encaje DESC, especificidad ASC, tie_order ASC, candidate.estilo ASC
  ),
  top3 AS (
    SELECT * FROM ranked LIMIT 3
  )
  SELECT
    top3.estilo,
    top3.encaje,
    (
      SELECT COALESCE(
        jsonb_agg(jsonb_build_object('estilo', estilo, 'encaje', encaje) ORDER BY encaje DESC, especificidad ASC, tie_order ASC, estilo ASC),
        '[]'::jsonb
      )
      FROM top3
    )
  INTO best_style, best_pct, alt_json
  FROM top3
  ORDER BY encaje DESC, especificidad ASC, tie_order ASC, estilo ASC
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