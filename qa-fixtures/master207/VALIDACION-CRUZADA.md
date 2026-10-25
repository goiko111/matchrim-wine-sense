# sensory-evidence-1 rev 2 — validación cruzada (lo que JSON Schema no expresa)
Raíz del esquema = bloque aditivo de la ficha con `evidence=1`; cada resultado de búsqueda se valida con `#/definitions/searchResult`. Estas reglas se ejecutan en `validate.py` (función `cross`). Un documento es válido solo si pasa el esquema **y** estas reglas.
- **X1** El valor plano de cada eje de la fila (`power`, `sweetness`, …) es igual a `evidence.<eje>.value`.
- **X2** `vintageResolution.genericRowCount` = número de filas con `vintage: null`. Las filas genéricas llevan `conflict: "duplicate_generic"` si y solo si hay más de una.
- **X3** No hay dos filas con la misma añada no nula. **Varias filas exactas de la misma añada no las permite el contrato:** la tabla tiene un índice único `(wine_id, vintage)` (migración `Version20240515123623`), que sí admite varias filas con `vintage` NULL (por eso existen 4 vinos con dos genéricas). Si un documento las trajera, es inválido y el consumidor no elige ninguna; admitirlas exigiría una versión nueva del esquema.
- **X4** `status: exact` si y solo si hay una fila con `vintage == requested`; `knownVintages` es igual al campo `vintages` de la ficha (si viene).
- **X5** `ai_estimate_recorded` exige `origin.type == ai_recorded`; `unknown_origin` exige `origin.type == unrecorded`. `suspected_default` admite ambos.
- **X6** Toda regla de un eje `suspected_default` (`id@version`) figura en `evidenceMethod.rulesActive`. R2@1 solo se aplica al eje `tannin` y con tipo de vino `blanco` o `espumoso`.
- **X7** Determinismo de R2@1: si R2@1 está en `rulesActive`, el tipo es `blanco`/`espumoso` y `tannin == 3`, el estado de ese eje debe ser `suspected_default` (nunca `unknown_origin` ni `ai_estimate_recorded`).
- **X8** `offeredScope: exact` exige la fila de la añada pedida (cubierto por X4); `generic_only` exige exactamente una fila genérica (cubierto por X2 + el esquema).
- Ninguna regla convierte `unknown_origin` o `suspected_default` en evidencia genuina: el esquema prohíbe `proof` en ambos y `source_verified` no se emite hoy.
