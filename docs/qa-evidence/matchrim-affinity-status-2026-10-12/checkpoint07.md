# MATCHRIM-HOY-20261012-07: checkpoint previo

HEAD 9c3a59ca54793b9b7a86a8e5675da2f578fd4900, repo limpio. WineMenuScanner.tsx SHA a1f0e716e8028fb39c7563c3070e0f0a003dff8d2ab518c890f2ccc0e21c0e1a.

Tema unico: falta de afinidad vs resultado negativo. getWineDecision etiqueta score no numerico como Sin encaje; descripcion admite falta de perfil/datos. Reproduccion propia antes de producto: null:portrait y null:landscape FAIL, cinco checks por contexto fallan. Card contiene Sin encaje dos veces y Afinidad sin desglose suficiente; snapshot de perfil dice no disponible. Detail aun dice Afinidad estimada con guion. Recibos/pixels en before/. No resultado negativo ni score0 calculados.

Origen inspeccionado: normalizeScannedWine normaliza raw score; applyMenuWineEvidence siempre elimina score/canonical sin catalogo separado y perfil utilizable. Solo fiche/catalogo realmente enlazado puede producir afinidad local numerica/calibrada. resolveScanProfile retiene nota generica de perfil no disponible cuando no hay datos, estan incompletos o falla carga; no se puede atribuir falsamente al quiz. Durante carga no hay resultados nuevos. No cambiar esas fuentes, modelo, thresholds, normalizacion ni algoritmo.

Expected: badge/tarjeta/explicacion/lista/detalle deben abstenerse consistentemente cuando falte score, no se haya calibrado o no sea finito. Nunca null ->0. Un control matematico bajo+calibrado prueba contrato de presentacion, no perfil/ficha/afinidad real. No inventar perfiles/fichas/score para alcanzar rama positiva en E2E.

QA07: una imagen/contratoBOTH previamente sintetico, raw71 del modelo no acreditado; variantes declaradas missing/null/no-calibrado/nonfinite-string/error/carga de perfil, no nuevos usuarios/escenas/corpus. HTTP/WS antesauth, firma invalida, estado aislado, solo mostrar/comparar,0RESTwrites/egress/providerpaid. Before dos orientaciones, luego delta especifico. Mantener006handlers/snapshots/ledgers/005 fuentes/evidencias y no repetir suites/builds verdes ni Apple/nativo.
