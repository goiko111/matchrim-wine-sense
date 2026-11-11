# Matchrim 138 · Las propuestas aprobadas del informe 137 (11-nov-2026)

Goiko: «sube la 137 y todo esto lo hacemos». La 137 está subida a TestFlight (upload137-r1, Apple acusó recibo).
La 138 lleva las ocho propuestas. Solo iOS; la web, `main` y el backend no se han tocado.

## Qué cambia

1. **Registro en una pantalla.** Email, contraseña, nombre opcional y una casilla de condiciones (con los dos
   documentos legibles dentro de la app). Desaparecen teléfono, apellido, país, ciudad, fecha de nacimiento y los dos
   pasos de preferencias. La web conserva sus tres pasos.
2. **Buscar un vino abre su ficha con la afinidad**, no el formulario «Añadir vino». Tres casos:
   - Con ficha verificada en la Library de Winerim: la misma ficha que una recomendación.
   - Sin ficha verificada pero en la tienda pública de Winerim: afinidad marcada como **estimación**.
   - Sin datos: lo dice y deja guardarlo en Mis vinos.
3. **Pestaña «Mis vinos»** en lugar de «Bodega».
4. **Veredictos directos:** «Muy de tu estilo» (80+), «Probablemente te guste» (65+), «Puede que sí, puede que no»
   (45+), «No es tu estilo».
5. **Aviso del escáner corto:** dos frases y «Ver el detalle» con las tres notas completas. OpenAI sigue nombrado en la
   versión corta: Apple exige decir a qué servicio de IA se envía la foto.
6. **Maridajes con tus gustos.** Bajo cada vino del paso 3: «Para ti: probablemente te guste · ≈72/100». A igual
   calidad de maridaje, sube el que más encaja contigo. Se calcula en el iPhone con la ficha o la tienda de Winerim.
7. **Vinos de la tienda pública.** Medido el 11-nov sobre 611 vinos de la tienda: todos traen los cinco datos de
   sabor y ninguno es de relleno (todo a 3); los ceros son el tanino de blancos y espumosos. La Library verificada,
   en cambio, no tiene vinos corrientes (Protos, Mar de Frades, Ramón Bilbao, Marqués de Riscal no están). Por eso la
   búsqueda y los maridajes usan ahora la tienda como estimación avisada.
8. **Perfil rehecho** con el estilo de Inicio: tu paladar en una frase, cinco rasgos con palabras (Cuerpo: intermedio),
   estilos en lista, uvas y regiones en etiquetas, y aprendizaje y código Matchrim plegados. De siete pantallas a
   unas cuatro y media; lo que más ocupa ahora son las tres fichas de «Vinos para probar».

## Lo que conviene que sepas

- **La estimación de la tienda relaja una regla anterior.** Hasta ahora esos datos no se usaban porque Winerim no
  distingue un valor real de uno por defecto. Se descartan los vectores sospechosos (todo igual, cuatro treses, ceros
  donde no caben) y el resto se muestra como «estimación». El escáner de botellas y cartas y el aprendizaje del perfil
  siguen usando solo fichas verificadas. Si prefieres no mostrar estimaciones, se quita en un archivo
  (`src/utils/storeEstimate138.ts`).
- **Alta sin nombre.** El backend recibe nombre y apellido vacíos si la persona no los escribe. No he podido
  comprobarlo contra el backend real porque no creo cuentas; conviene una alta de prueba tuya en la 138.
- **Teléfono, país y preferencias** ya no se piden en iOS. Si los quieres, el sitio natural es el Perfil, más adelante.

## Comprobación
- Recorridos en simulador (backend simulado): 11 recorridos, 86/86. Nuevos pasos para registro corto, los tres casos
  de búsqueda y el veredicto personal en maridajes.
- Checks del repositorio: los 189 de la base más `check-matchrim-ux137` y `check-matchrim-ux138` (7/7).
- No probado en iPhone real.

## Sigue pendiente (backend u otra decisión)
- Maridaje y afinidad calculados juntos en el servidor (ahora se combinan en el iPhone).
- Que Winerim marque qué datos de sabor de la tienda son reales, para dejar de llamarlo estimación.
- La nota guardada desde el escáner aún lleva texto técnico.
- Silueta de botella en lugar de «Sin foto».
