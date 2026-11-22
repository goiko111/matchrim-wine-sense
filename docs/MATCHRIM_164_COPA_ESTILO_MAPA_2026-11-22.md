# Matchrim 164 · Cambió en la copa, estilo Matchrim, aromas y mapa (22-nov-2026)

Pedido por el propietario el 22-nov: un vino que no le gustó al principio y sí a los 20 minutos; ideas de la ficha
de una tienda (Wine is Social); y «¿se te ocurre hacer algo con nuestro mapa?». Aclaró: los estilos son los de
Matchrim y el mapa es de Mapbox.

## Qué hay
1. **«¿Cambió en la copa?»** (`CellarEvolution164`, `utils/evolution164.ts`). En la ficha de un vino guardado y
   valorado: «Mejoró con el rato» / «Fue a peor», un toque, se deshace tocando otra vez. Se guarda dentro de
   `place_details.matchrim_evolution164` (sin cambio de esquema). La valoración sigue siendo la impresión final y esto
   no entrena el perfil. Al volver a escanear esa botella, junto a «Tu valoración» sale «La otra vez te gustó más
   pasado un rato: dale tiempo en la copa». Con dos o más vinos en el mismo sentido, el perfil lo dice.
2. **Estilo Matchrim en la ficha** (`utils/styleWord164.ts`). La palabra junto a la añada sale de la tabla
   `wine_styles` (la misma del perfil) con los cinco atributos del vino redondeados; una lectura pequeña por
   combinación. Si el color del estilo contradice el tipo del vino, no se enseña.
3. **Juego de aromas** (`FlavourCards157` con `wineId`). Las fotos de «A qué sabe» se pueden tocar: «Has encontrado
   2 de 4». Se recuerda en el teléfono por vino (`matchrim.aromas164.v1`); no es dato sensorial ni entrena nada.
4. **Mapa** (`utils/wineMap164.ts`, `WineMap164.tsx`, `assets/map164/regions164.json`). Índice de las 3.075 zonas
   del mapa de Winerim (nombre, país, enlace, nivel, zona madre, coordenadas, tamaño), sacado el 22-nov de
   `europe_wwr_labels.geojson` del propio mapa. En la ficha, «De dónde viene»: la zona, enlace a
   `map.winerim.wine/?region=…` y tres denominaciones vecinas. En el perfil, «Tu mapa del vino»: zonas de los vinos
   valorados, cuántos te encantaron, y «Prueba al lado» de la que más te gusta. La app no dibuja mapa: abre el de
   Winerim, y cada apertura cuenta como carga en la cuenta de Mapbox de Winerim.

## Comprobado
- `scripts/check-matchrim-ux164.ts` 6/6; tipos sin errores.
- Simulador (`harness/ux164.mjs`, binario compile163-r1 con la web nueva): 16/16.

## Sin hacer o sin comprobar
- iPhone real. Tamaños de texto de accesibilidad de lo nuevo.
- El aviso «dale tiempo» solo sale al reescanear la etiqueta de una botella ya valorada; todavía no en la carta de
  un restaurante ni en la búsqueda.
- El aviso por estilo («a ti los tintos con cuerpo te ganan con aire») no está: hoy solo cuenta cuántos vinos.
- El estilo y «De dónde viene» están en la ficha de vinos de la tienda (WineSheet142), no en la de un vino guardado
  sin ficha de tienda.
- El enlace al mapa abre fuera de la app (no probado en dispositivo); el mapa no colorea tus zonas: eso pide cambiar
  la web del mapa.
- Si el mapa cambia sus zonas hay que regenerar el índice. Algunas zonas llevan el nombre en dos lenguas; en las vecinas se enseña la forma castellana.
- No hay build 164.

## Candidato 164-r1 listo (22-nov-2026, sin subir)
- Fuente `77971df` (3e68dfd más la admisión de la 164 en los runners). Preparación, compilación y archivo firmado:
  `qa-artifacts/native218-20261025/{candidate164-r1,compile164-r1,archive164-r1}`.
- QA nativo: r251 (añada, normal), r252 (añada, texto máximo), r253 (catálogo, normal) en verde. r254 (catálogo,
  texto máximo) falló: tras 24 arrastres, «Corregir identificación» quedó 2 pt bajo el pie fijo de la hoja (855 frente
  a 853). La repetición r255 sobre el mismo binario pasó. La hoja es ahora más larga (lleva «De dónde viene») y la
  prueba converge peor; no se ha demostrado que el botón quede inalcanzable ni que no lo quede. Se conserva r254.
- Simulador sobre compile164-r1: recorridos j02–j12 85/85, ux164 16, ux163 20, ux162 17, ux162b 8, ux161 7.
- La subida necesita el sí expreso del propietario (`scripts/distribute-matchrim164.mjs`, RELEASE.json preparado).
