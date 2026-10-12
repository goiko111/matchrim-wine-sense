# MATCHRIM-HOY-20261012-06: checkpoint previo

2026-10-12 21:11 UTC. Repo limpio en 9469921d260bf8d88f91a7e313a926358efdc397, rama codex/matchrim77-challenge-20261008.
Fuente activa WineMenuScanner.tsx SHA256 1944b506f304b51d5de3ef48c0385cfe5cbe97f6b1da2b966b1a86b5d350baa4.

Tema unico: wishlist -> favorite -> tasted de la misma tarjeta, dentro del mismo propietario/lote. Riesgo estatico: insert por cada accion y claves por accion. Aun NO es un fallo dinamico medido.

Expected: un insert, ID exacto retenido, posteriores intenciones mutan ese ID y propietario con representacion; favorite permanece true al pasar a tasted, rating null y sin entrenamiento. Sin degradar tasted a wishlist, sin unir otras tarjetas/annadas/SKU o filas previas/rescans. Precio manual BOTH sigue pendiente, sin scalar y con lecturas25/25.
Actual medido antes de editar producto: sequence:portrait FAIL. Tres POST devuelven IDs distintos ...001 wishlist/favorite=false, ...002 wishlist/favorite=true, ...003 tasted/favorite=false. Bodega separa favorito de la cata; cinco comprobaciones de nueva semantica fallan. Recibo y cuatro capturas en before/. El stub asigna IDs distintos por insert y no atribuye persistencia real. Procedencia05 se mantiene; el nuevo fallo es duplicacion/perdida de intencion. Procede la correccion minima prevista.

Estrategia: una imagen/replay existentes, variante BOTH ya declarada sintetica en04, sin nueva OCR/ficha/perfil positivos. Fake auth con firma invalida, HTTP y WS interceptados antes de auth/navegacion, SDK POST/PATCH en memoria aislada. IDs unicos por insert, condiciones id+user_id exigidas para PATCH. Ninguna cuenta o escritura alojada.

Si falla: ledger por indice de tarjeta/lote/owner, solo ID devuelto confirmado; merge monotono estado/favorito y PATCH de intencion sin sobreescribir identidad/metadatos historicos. Hold explicito si cambia identidad o queda representacion incierta. Invalidation por vida/owner/batch; sin dedup global/upsert/backend/migracion.

QA nuevo acotado: secuencia antes/despues, favoritos despues de tasted, solape/dobleclick, vacio/wrongID/wrongowner/metadata incoherente, identidad editada y callback tardio en owner/unmount/batchreset. Bodega solo para lectura necesaria. No repetir05/corpus/holdouts/ledger/suites/builds verdes, ni Apple/nativo/produccion/push/deploy.
