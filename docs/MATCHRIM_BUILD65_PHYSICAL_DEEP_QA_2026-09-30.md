# Matchrim 1.0 (65): QA físico profundo

Fecha: 2026-09-30

## Veredicto

**NO-GO para ampliar TestFlight.** El build `1.0 (65)` es estable para QA interno y la navegación nativa, cámara, Fototeca, rotación y persistencia funcionan en el iPhone real. Sin embargo, Bodega y Perfil entran bajo la zona del status bar/Dynamic Island y hay ocho controles visibles menores de 44 pt. Además sigue abierto el gate independiente de identidad canónica del expositor en staging.

Esta pasada no cambió producción, web, backend ni TestFlight; no escribió datos y no envió imágenes.

## Entorno

- Binario instalado: `wine.matchrim.app`, Matchrim `1.0 (65)`.
- Dispositivo: iPhone 16 Pro Max, iOS 26.6 (`23G71`), conectado por cable y desbloqueado.
- Fuente observada: rama `codex/matchrim-learning-airim-qa-20260928`, HEAD `9e5208f`.
- Automatización: Xcode 26.0.1/XCTest contra la app TestFlight instalada. El runner no sustituyó el binario.

## Matriz física

| Flujo | Expected | Actual | Estado |
| --- | --- | --- | --- |
| Cinco arranques en frío | Inicio visible, sin negro/bloqueo | 5/5; media `2,374 s`, máximo `2,389 s` | PASS |
| Navegación | Inicio, aiRIM, Escanear, Bodega, Perfil | Las cinco rutas abren y mantienen la sesión | PASS |
| Fondo/reapertura | Volver al punto anterior | aiRIM y Escanear conservaron ruta/estado | PASS |
| Cámara | Abrir cámara nativa y volver | Cámara abierta; retorno seguro sin perder Escanear | PASS |
| Fototeca | Abrir picker y volver | Picker abierto con >=5 fixtures públicos; retorno seguro | PASS |
| Etiqueta | Fuentes disponibles | Hacer foto y Elegir de galería visibles | PASS |
| Carta | Fuentes disponibles | Hacer foto y Subir archivo visibles | PASS |
| Rotación | Sin controles perdidos | Retrato/paisaje conservan acciones; sin solape visible | PASS |
| Bodega/Historial | Estado legible y persistente | Aprendizaje, favoritos e historial renderizan | PASS |
| Consola | Sin error no manejado | 15 s en foreground sin salida/error | PASS |
| Safe area superior | Contenido bajo Dynamic Island: cero | Bodega `y=30`; Perfil `y=31` | **FAIL P0** |
| Zonas táctiles | Controles >=44 pt | Ocho controles medidos por debajo | **FAIL P1** |
| Singular/plural | Copy natural | `1 valoraciones` | **FAIL P2** |

La captura negra aislada de la primera sesión no se reprodujo en cinco cold starts consecutivos. Se mantiene como riesgo de monitorización, no como fallo reproducible.

## Hallazgos

### P0: Bodega y Perfil no reservan safe area

Inicio (`H1 y=171`) y aiRIM (`y=158`) aplican padding nativo. Bodega (`y=30`) y Perfil (`y=31`) quedan parcialmente ocultos. El código explica la diferencia: Inicio, Escanear y aiRIM usan `var(--matchrim-safe-top)`, mientras `MyWines.tsx:1098` y `Profile.tsx:760` conservan `py-8`. El guard global de `App.tsx:67` pinta encima, pero no reserva espacio de flujo.

Criterio de cierre: un shell compartido para las cinco pestañas; primer heading completamente visible con `safeTop + 16 pt` en retrato/paisaje y tras cada cambio de pestaña; prueba física en iPhone con Dynamic Island.

### P1: zonas táctiles

XCTest emitió 33 alertas `hitRegion` al contar también subelementos WebView. La medición directa dejó ocho controles accionables: marca Inicio `124x32`, buscador Bodega `324x40`, tabs Perfil `200x32` (dos), copiar código `41x40` y tres acciones de pasaporte a `40` pt de alto. No hubo alertas de Dynamic Type, texto cortado ni descripción insuficiente.

Criterio de cierre: `min-height: 44px`/`min-width: 44px` en el objetivo interactivo, no solo en su icono; repetir inventario y auditoría en las siete vistas.

### P1: confianza y respuesta de aiRIM

Las tres respuestas reales de persona separan dato, inferencia, preferencia, fricción y dato faltante. Son útiles, pero demasiado largas para una decisión en restaurante y proponen categorías, no botellas/precios disponibles. El explorador atlántico recibió `58%` en el contexto aiRIM mientras el resumen de fixture build 65 publica `43%`: los dos arneses no presentan una confianza unificada.

Criterio de cierre: primera respuesta con tres opciones breves, evidencia y estado de disponibilidad; explicación larga bajo expansión; una única definición/versionado de confianza.

### P2: claridad y densidad

- Home muestra `1 valoraciones`; debe pluralizar según contador.
- Bodega dedica la primera pantalla a cuatro acciones y explicación antes de enseñar inventario. En móvil conviene cabecera compacta, segmentos de colección y un único botón Añadir que abra una hoja de acciones.
- Perfil mezcla pasaporte, QR, aprendizaje y estilos en una página larga. Debe priorizar “qué sé de ti”, “qué cambió por tus valoraciones” y el próximo paso; compartir/QR puede quedar como acción secundaria.
- El aviso de catálogo apareció en una captura anterior y no estaba visible en la repetición posterior. Tratarlo como fallo transitorio recuperado y añadir timestamp/reintento, no como error permanente.

## Estado real del perfil

La cuenta física se mantuvo en solo lectura:

- Pasaporte: **Garnacha Fuego**.
- Aprendizaje: `1` vino puntuado, `8%` de confianza, `1 “me encanta”`, `0 “no va”`.
- Bodega: `2` favoritos y `0` en No repetir.
- Test #2: potencia `5`, acidez `4`, dulce `4`, tánico `5`, afrutado `3`.
- Test #1: cinco dimensiones en `3`.

La app explica que una sola botella es insuficiente y pide al menos tres valoraciones más. Esa prudencia es correcta y evita sobreactuar el perfil.

## Personas y contestaciones

Las diez personas y 1.000 sesiones virtuales ya certificadas son locales, sintéticas y sin cuentas. Confirmaron aislamiento, deduplicación canónica, añadas separadas y que guardar sin puntuar no entrena. Con 20 muestras, la confianza converge aproximadamente a `70-77%`; el cambio sostenido de opinión sí mueve el ranking, el cambio débil no.

Resumen de las tres respuestas reales aiRIM ya existentes:

| Persona | Principal | Segura | Exploratoria | Latencia | Lectura |
| --- | --- | --- | --- | ---: | --- |
| Explorador atlántico | Ribeiro blanco con crianza | Godello | Pinot Noir ligero | 11,446 s | Respeta frescura/acidez; confianza media |
| Clásico estructurado | Rioja Reserva | Ribera Crianza | Pinot con crianza | 9,242 s | Coherente con tanino/cuerpo; puede dominar el plato |
| Principiante frutal | Mencía del Bierzo | Pinot Noir | Vino naranja | 8,992 s | Lenguaje comprensible; aventura bien señalada |

Las tres piden el dato correcto que falta (intensidad, setas, sazón/grasa) y no inventan precio exacto, aunque deben ser más concisas y distinguir mejor recomendación de catálogo verificado.

## Reconocimiento existente, no repetido

No se reenviaron los cinco archivos en esta pasada. El benchmark backend real autorizado previo sigue siendo la referencia: cuatro cartas/pizarras con precisión `1,000` y recall `0,938 / 1,000 / 1,000 / 0,969`; el expositor devolvió 30 análisis, pero su identidad por botella no puede puntuarse hasta disponer de box/crop/result final trazado en staging. La suite UI de fixtures sigue en `27/27`, separada de la exactitud del proveedor.

## Prioridad de producto

- **P0:** corregir safe area de Bodega/Perfil y cerrar identidad del expositor con staging trazado.
- **P1:** objetivos táctiles 44 pt; confianza única; respuesta aiRIM corta; Bodega inventory-first; QA autenticado de guardar/puntuar/cambiar cuenta en tenant aislado.
- **P2:** copy singular/plural; retry observable del catálogo; Perfil más jerárquico; primera ejecución y denegación de permisos en una instalación desechable.
- **P3:** avatar/voz/AR solo después de demostrar mejora en decisión, recurrencia y tiempo; no añadir talking head decorativo.

## Gates pendientes

1. Configurar `LOVABLE_API_KEY` en staging aislado `qpbmqvfnunkylvtvnyyx` y ejecutar la reconciliación box/crop/result del expositor.
2. Corregir safe area y touch targets; generar un candidato posterior a 65 y repetir este smoke físico.
3. Con una cuenta/dispositivo desechable: primera ejecución, consentimiento, permisos permitir/denegar, guardar, puntuar, reiniciar y cambiar cuenta.
4. Pase humano final: VoiceOver hablado, orden de foco, rotor y retorno desde cámara/Fototeca.

## Evidencia

- Matriz: `docs/qa-evidence/matchrim-build65-physical-2026-09-30/physical-qa-results.json`.
- Capturas físicas: `docs/qa-evidence/matchrim-build65-physical-2026-09-30/`.
- Baseline de build: `docs/MATCHRIM_BUILD65_CANDIDATE_2026-09-29.md`.
- Gate de identidad: `docs/MATCHRIM_FRIDGE_IDENTITY_BENCHMARK_2026-09-29.md`.

Los `.xcresult` completos se conservaron solo en `/private/tmp`; no se versionaron porque Xcode añadió diagnósticos potencialmente personales tras fallos intencionados de aserción.
