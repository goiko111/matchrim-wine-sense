# Auditoría solo lectura: redespliegue de las funciones antiguas en el despliegue 72

## Datos confirmados (lecturas de este turno)

1. **Las fuentes antiguas del repositorio ya eran v4 antes de este turno.** Ninguno de nuestros commits las tocó.
   - Último commit que tocó `detect-wine-regions`, `analyze-wine-region` y `scan-wine-menu`: `538a065` (2026-09-01, "harden Matchrim regional recognition QA").
   - Versiones que declaran hoy esos archivos:
     - `matchrim-region-detector-v4-candidate`
     - `matchrim-region-analysis-v4-candidate`
     - `scan-wine-menu-2026-08-27-regional-v4-candidate`
   - Commits de hoy: `dac738c`, `86239db`, `476bebc`, `0cfc2a5` y `91e269d`. Solo afectan a `*-v72`, `_shared/matchrim72` y `config.toml`.
2. **El código que se ejecutaba no coincidía con el repositorio.** Hasta las 04:54 UTC las funciones respondían v3 / v3-grounded / grounded-v3. Eso corresponde al despliegue manual del 26-08 (anterior a `538a065`). Las fuentes v4 llegaron después por sincronización con GitHub y nadie las desplegó.
3. **Hubo arranques nuevos de las funciones antiguas en este intervalo** (registros de las funciones):
   - `detect-wine-regions`, `analyze-wine-region` y `scan-wine-menu` arrancaron a las 05:33:57 UTC.
   - Respondieron ya con los errores del código v4.
   - Ids de función: `a10117ed…`, `7db5a7d0…` y `7a5a8f47…`.
4. **Causa más probable, sin confirmar del todo:** la plataforma despliega automáticamente las funciones cuya fuente difiere de lo desplegado, al cerrar un turno con cambios en `supabase/functions/`. Los turnos de 476bebc y 91e269d habrían desplegado también las tres antiguas, porque su fuente v4 seguía pendiente. La llamada explícita solo pidió las cuatro v72; el despliegue de las otras tres no aparece en ninguna salida de herramienta.

## Limitaciones del canal (precisas)

- **Registros HTTP de funciones:** muestran `version` y `deployment_id` por petición, por ejemplo `search-wines` v38. Pero en las últimas 72 h no hay ninguna petición indexada a las tres rutas antiguas. Por eso no puedo dar la versión ni el id de despliegue de antes y después. No me los invento.
- **Herramientas de este canal:**
  - No pueden listar el historial de despliegues de una función.
  - No pueden revertir una función a un despliegue anterior por id.
  - No exponen la fecha exacta de despliegue de las funciones antiguas.
- **Única forma de "restaurar" aquí:** volver a desplegar desde una fuente del repositorio. Recuperar v3 exigiría poner las fuentes de `795fe3c`/`253f5aa` en esas rutas. Eso revierte las fuentes v4, y lo has prohibido. Además, el siguiente turno con diferencias volvería a desplegar lo que haya en el repositorio.

## Pasos propuestos (solo lectura, si apruebas)

1. Repetir la consulta de registros HTTP pasados unos minutos, por si se indexan las llamadas de las 05:33. Así obtendríamos `version` y `deployment_id` actuales de las tres funciones, sin llamarlas de nuevo.
2. Revisar si hay peticiones antiguas a esas rutas en otros periodos para fijar la versión anterior. Si no las hay, documentarlo como no disponible.
3. Entregar el informe final con los datos obtenidos o con la limitación confirmada.

## Opciones de restauración (no se ejecutan sin una nueva autorización)

- **A.** Aceptar v4 como versión de ejecución. Coincide con el repositorio, que es la fuente de verdad, y no hay que hacer nada.
- **B.** Restaurar v3 en ejecución mediante el soporte de Lovable, que tiene acceso al historial de despliegues. Es el único canal que podría hacer un rollback por id sin tocar las fuentes.
- **C.** Revertir en el repositorio solo esas tres carpetas a la fuente v3 y desplegarlas. Contradice "no revertir fuentes v4" y no lo recomiendo.
