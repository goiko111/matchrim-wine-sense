# Matchrim 155 · «Compartir → Matchrim» (14-nov-2026)

Goiko: «adelante con esto» sobre la extensión de compartir (pedida por su mujer el 12-nov: tiene capturas de botellas
en el teléfono y quiere mandarlas a la app como hace con otras).

## Qué hace
- Matchrim aparece en el menú de compartir del iPhone cuando se comparte **una foto** (Fotos, WhatsApp, el navegador).
- La extensión redimensiona la foto, la deja en una carpeta que comparte con la app (grupo de apps
  `group.wine.matchrim.app`) y pide abrir Matchrim. No envía nada a ningún sitio.
- La app, al arrancar o al volver al frente, recoge la foto (una sola vez; el archivo se borra al leerlo), abre el
  escáner de etiquetas y la lee por el mismo camino que una foto de galería.
- Si iOS no deja abrir la app sola, la extensión muestra «Foto enviada. Abre Matchrim para ver el vino» y la app la
  recoge al abrirse.

## Qué se ha añadido
- Objetivo nuevo en Xcode `ShareExtension` (`wine.matchrim.app.share`), con la misma versión y equipo que la app.
- Grupo de apps en la app y en la extensión; dirección `matchrim://` para abrir la app.
- En el plugin nativo: `takeSharedImage` y el aviso `sharedImage` cuando la app vuelve al frente con una foto esperando.
- En la web de la app: `sharedPhoto155.ts` (recogida) y el arranque del escáner con la foto compartida.
- **En la cuenta de Apple Developer de Goiko** (creado por la firma automática al archivar): el identificador
  `wine.matchrim.app.share` y el grupo `group.wine.matchrim.app`, y el permiso de grupos en `wine.matchrim.app`.
- Scripts de build: el archivo puede pedir perfiles a Apple desde la 155; las copias de prueba renombran también la
  extensión (el simulador rechazaba instalarlas).

## Comprobación
- `check-matchrim-ux155.ts` 9/9; barrido con los mismos 15 fallos de antes.
- candidate155-r1: prepare y compile PASS; pruebas nativas r201–r204 PASS (la primera tanda, r197, falló al instalar
  por el nombre de la extensión en la copia de prueba y se corrigió en el script); archivo firmado PASS, con el grupo
  de apps en la app y en la extensión.
- En simulador, con una copia firmada con el grupo: compartir una foto desde Fotos → la extensión la guarda → iOS
  pregunta «¿Abrir en Matchrim?» → la app abre el escáner y lee la etiqueta. También: foto esperando con la app
  cerrada (la recoge al arrancar) y con la app en segundo plano (la recoge al volver).
- E2E 85/85.

## Sin comprobar
- En un iPhone real: que Matchrim salga en el menú (puede estar bajo «Más» la primera vez), y si iOS abre la app
  directamente, pregunta antes o no la abre.
- La exportación para TestFlight con la extensión (necesita perfiles de distribución nuevos; se verá al subir).
