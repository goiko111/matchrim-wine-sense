# Matchrim: baseline congelada de auditoria read-only

Fecha de corte: 26 de agosto de 2026. Este documento fija el estado observado antes de la remediacion P0. No se reescribe con resultados posteriores; la continuacion esta en `MATCHRIM_P0_REMEDIATION_2026-08-26.md`.

## Alcance observado

- Aplicacion iOS 1.0 build 57 instalada en `Matchrim QA iPhone 16 Pro` (`83282D15-477D-45F7-A3B5-82CB2B89B52D`).
- Web/app revisada como consumidor, aficionado y profesional del vino.
- Fixtures reales: `IMG_7547 2.HEIC`, `IMG_7548 2.HEIC`, `IMG_7552 2.HEIC`, `IMG_7553 2.HEIC` e `IMG_7605 2.jpg`.
- Evidencia visual original conservada en `/tmp/2matchrim-audit-evidence` (`01-affinity-explanation.png` a `10-landscape-comparison.png` y reporte Playwright).

## Hallazgos de partida

### P0

1. En iPhone, contenido de cabecera podia quedar bajo Dynamic Island/safe areas.
2. El escaner permitia abrir camara o fototeca sin un aviso previo que explicase seleccion, envio a IA, persistencia y contenido sensible.
3. Los purpose strings y la politica no describian con precision cartas, pizarras, expositores ni el tratamiento de recortes. La politica usaba una marca incoherente y no fijaba una retencion verificable de proveedores.
4. El flujo multietiqueta estaba validado con respuestas deterministas, no con el backend real. Compilar o recorrer fixtures no demostraba recall ni precision.

### P1

1. Deteccion, identidad y afinidad se presentaban demasiado cerca semanticamente; el porcentaje podia parecer una certeza unica.
2. La explicacion no separaba de forma suficiente dato visible, ficha, inferencia sensorial y preferencia aprendida.
3. La lectura de carta podia devolver confianzas repetidas de 90-95% y afinidades de 100%, sin evidencia textual enlazada por fila.

### P2

1. El E2E fisico con red lenta/sin red y cancelacion no estaba cerrado.
2. El build advertia chunks grandes; no existian presupuestos de rendimiento ni memoria para los recorridos de vision.
3. VoiceOver basico, Dynamic Type extremo y rotaciones necesitaban una matriz repetible posterior a cada cambio visual.

### P3

1. Seguian sin validacion de uso recurrente el modo sumiller, inventario visual, comparacion, feedback dimensional y diario de cata.
2. Monetizacion, procedencia de datos y privacidad debian supeditarse a exactitud y tiempo ahorrado, no a nuevas funciones decorativas.

## Contradicciones abiertas

- La QA determinista demostraba estados y layout, pero no precision del modelo.
- La carta podia producir una lista util, pero sus porcentajes no equivalian a probabilidades calibradas.
- El original no se guardaba en la cuenta por defecto, pero faltaba confirmar y publicar la retencion maxima del proveedor de IA.
- El simulador permitia comprobar interfaz nativa, pero no sustituia el E2E en iPhone fisico.

Estado de partida para TestFlight/deploy: **NO-GO**.
