# Matchrim: ejecucion del release web y gate de TestFlight

Fecha: 2026-09-04

Baseline: `docs/MATCHRIM_LOVABLE_RELEASE_GATE_2026-09-02.md`

## Estado ejecutivo

- Commit integrado: `66b0ab4058bc57fe3abfeafc0fd894a1b6b46a62`.
- `origin/main`: actualizado desde `a0b7f63` hasta `66b0ab4`.
- Web Lovable: publicada desde `66b0ab4` en
  `https://matchrim-wine-sense.lovable.app`.
- Cliente web: PASS en smoke movil publico, sin overflow horizontal ni errores
  de consola.
- Edge Functions v4: desplegadas solo en el proyecto aislado de staging
  `qpbmqvfnunkylvtvnyyx`; produccion no se modifico.
- TestFlight: NO-GO. No se genero ni subio build 62 porque la inferencia v4 real
  no puede ejecutarse sin la credencial gestionada del proveedor.

Progreso real del release completo: `95%`. El cliente y la publicacion web estan
cerrados; quedan la certificacion real v4, el smoke fisico del binario firmado y
la subida autorizada a TestFlight.

## Publicacion web

Lovable termino de sincronizar `66b0ab4`, genero Preview y publico el mismo
artefacto. La Preview requiere autenticacion de Lovable y no permite un smoke
anonimo, por lo que el gate decisivo se ejecuto inmediatamente despues sobre la
URL publica.

| Ruta | Comprobacion | Resultado |
| --- | --- | --- |
| `/` | home de decision, entrada a carta y multietiqueta | PASS |
| `/escanear` | carta completa, varias etiquetas y aiRIM contextual | PASS |
| `/escanear/etiqueta` | varias botellas y aviso previo de privacidad | PASS |
| `/escanear/carta-vinos` | carta/pizarra y aviso previo de privacidad | PASS |

Viewport del smoke: `393 x 852`. Las cuatro rutas devolvieron ancho de scroll
igual al viewport. Consola: cero errores. La inspeccion visual confirmo barra
inferior legible, CTAs dentro de pantalla, texto sin solapes y contenido
desplazable bajo el gate de privacidad.

## Staging v4

Las tres funciones requeridas estan activas en staging, version `1`, con
`verify_jwt=true`:

| Funcion | Contrato de codigo |
| --- | --- |
| `detect-wine-regions` | `matchrim-region-detector-v4-candidate` |
| `analyze-wine-region` | `matchrim-region-analysis-v4-candidate` |
| `scan-wine-menu` | `scan-wine-menu-2026-08-27-regional-v4-candidate` |

Una peticion minima valida a `detect-wine-regions` alcanzo la funcion desplegada
y termino en HTTP `500` en `599 ms` con el error controlado
`LOVABLE_API_KEY no configurada`. Esto demuestra que despliegue, URL y runtime
funcionan, y acota el bloqueo a la credencial de inferencia. No se envio ninguna
de las cinco escenas reales y no se consumio cuota de vision.

El proyecto original `cbjynrbvrhcmpaojmqdp` sigue fuera de la lista de proyectos
accesibles para esta cuenta y el canal de gestion continua rechazando el acceso.
No se intento sustituir ni modificar sus funciones de produccion.

## Gate restante

Accion unica del propietario: configurar `LOVABLE_API_KEY` como secreto de Edge
Functions en el staging `qpbmqvfnunkylvtvnyyx`, o conceder acceso de gestion al
proyecto original si ese debe ser el staging autorizado. La credencial no debe
compartirse en texto ni versionarse en el repositorio.

Tras esa accion, la secuencia reproducible es:

1. ejecutar las cinco escenas reales contra las tres funciones v4;
2. exigir `5/5`, precision y recall >= `0.90`, deriva maxima <= `2` y ausencia de
   identidades inventadas;
3. si pasa, incrementar a build `62`, compilar, archivar y firmar;
4. instalar en el iPhone conectado y repetir captura, galeria, cancelacion,
   reintento y cierre/reapertura;
5. subir a TestFlight solo con el gate real verde.

Hasta entonces, `Matchrim 1.0 (61)` sigue siendo el ultimo build fisico validado.
