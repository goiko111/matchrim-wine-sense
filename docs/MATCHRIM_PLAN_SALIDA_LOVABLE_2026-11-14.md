# Matchrim · Plan para salir de Lovable (14-nov-2026)

Plan, no ejecución. Ningún paso de este documento está hecho. Los que tocan producción necesitan el OK de Goiko en
el momento.

## 1. Cómo está montado hoy (comprobado en el repositorio)

| Pieza | Estado |
|---|---|
| Código | GitHub `goiko111/matchrim-wine-sense`. `main` la escribe sobre todo Lovable (135 de los últimos 200 commits son de su bot; el último, del 25-oct). Nuestro trabajo va en la rama `codex/matchrim82-cloud-integration-20261013`, sin fusionar. |
| App iOS | Se compila en el Mac y sube a TestFlight. Empaqueta su propia copia de la web; no carga nada de Lovable. Sí habla con el backend. |
| Web | Publicada por Lovable (`matchrim-wine-sense.lovable.app`). El código prevé dominio propio (`VITE_AUTH_REDIRECT_ORIGIN=https://winerim.wine`, `matchrim.winerim.wine` como alternativa). |
| Backend | Supabase, proyecto `cbjynrbvrhcmpaojmqdp`: 11 tablas, 42 migraciones, 35 funciones, cuentas de usuario. Sin almacenamiento de archivos ni tareas programadas en el código. |
| Secretos del backend | `OPENAI_API_KEY`, `RESEND_API_KEY`, `GOOGLE_MAPS_API_KEY`, `WINE_API_KEY`/`WINE_API_PROVIDER`, `WINERIM_API_URL`, `MATCHRIM_GOIKO_KEY`, `MATCHRIM_DB_SCHEMA`. Ninguna función llama a la pasarela de IA de Lovable. |
| Correo | Función `send-auth-email` con Resend. El enlace de confirmación acabó en la dirección de Lovable (visto el 11-nov). |
| Restos en el código | `lovable-tagger` en `package.json`/`vite.config.ts`, iconos en `/lovable-uploads/`, README de Lovable. |

**Lo que no está comprobado y decide todo el plan:** de quién es el proyecto de Supabase. Los registros dicen que los
despliegues los hizo Lovable y que no teníamos permiso de gestión, lo que apunta a Supabase gestionado por Lovable.

## 2. Paso 0 · Averiguar de quién es el backend (Goiko, 5 minutos)
- Entrar en supabase.com con la cuenta de Winerim/GuGo y mirar si aparece el proyecto `cbjynrbvrhcmpaojmqdp`.
- En Lovable, abrir el proyecto y mirar la sección de backend/Cloud: si dice «Lovable Cloud», es de ellos.
- Resultado A: **el proyecto es vuestro** → se salta la fase 4 (solo se desconecta Lovable).
- Resultado B: **es de Lovable** → fase 4 completa.

## 3. Fases

### Fase 1 · Código (sin riesgo, reversible)
1. Decidir dónde vive el código: seguir en GitHub o pasar al GitLab propio (`git.gugocreative.com`, como CRIM).
2. Fusionar la rama de trabajo en `main` (hoy `main` no tiene nada de las builds 82–154). Requiere revisar qué ha
   cambiado Lovable en `main` desde el 13-oct para no pisarlo.
3. Desconectar Lovable del repositorio (en Lovable: Settings → GitHub → Disconnect) para que deje de escribir en `main`.
4. Limpiar restos: quitar `lovable-tagger`, mover los iconos de `/lovable-uploads/` a `/assets/`, reescribir el README.
Hecho cuando: `main` contiene la app actual y Lovable ya no puede escribir en el repositorio.

### Fase 2 · Web (riesgo bajo)
1. Elegir alojamiento estático (Cloudflare Pages, donde ya está la web de GuGo, es lo más directo).
2. Publicar ahí la web con el dominio `matchrim.winerim.wine` (un registro DNS).
3. Añadir el archivo que iOS necesita para abrir enlaces dentro de la app (`apple-app-site-association`), que en el
   dominio de Lovable no se podía servir.
4. Cambiar las direcciones de vuelta permitidas en el backend (confirmación de correo, restablecer contraseña) al
   dominio nuevo, manteniendo las antiguas durante la transición.
5. Dejar una redirección desde la dirección de Lovable mientras exista.
Hecho cuando: registrarse y restablecer contraseña funcionan de principio a fin en el dominio nuevo.

### Fase 3 · Correo (riesgo bajo)
1. Comprobar a nombre de quién está la cuenta de Resend y verificar el dominio remitente (`winerim.wine`).
2. Plantillas en castellano con enlaces al dominio nuevo.
Hecho cuando: el correo de confirmación llega desde un remitente vuestro y su enlace abre el dominio nuevo.

### Fase 4 · Backend (solo si es de Lovable; es la parte delicada)
1. Crear un proyecto Supabase propio (región UE) y un segundo de pruebas.
2. Aplicar las 42 migraciones en el de pruebas y comparar el esquema con el actual.
3. Desplegar las 35 funciones y cargar los secretos (hay que tener a mano cada clave: OpenAI, Resend, Google Maps…;
   las que solo existan dentro de Lovable habrá que generarlas de nuevo).
4. Ensayo completo en pruebas: copia de datos, la batería de recorridos de la app apuntando al backend nuevo.
5. Pedir a Lovable la exportación de la base de datos **con las cuentas de usuario**. De esto depende que los
   usuarios conserven su contraseña. Si no la dan: los usuarios entran con «restablecer contraseña» la primera vez.
6. Día del cambio: parar escrituras, exportar, importar en el proyecto propio, comprobar recuentos por tabla.
7. Build de iOS apuntando al backend nuevo (las builds antiguas seguirían hablando con el viejo: hay que mantenerlo
   vivo unas semanas o forzar la actualización).
8. Apagar el backend antiguo cuando ya nadie use builds viejas.
Hecho cuando: una cuenta existente entra en la build nueva y ve sus vinos, y una cuenta nueva se registra entera.

### Fase 5 · Cerrar Lovable
Cancelar el plan de Lovable solo cuando las fases anteriores lleven dos semanas sin incidencias. Guardar antes una
exportación final.

## 4. Orden y esfuerzo estimado
| Fase | Depende de | Trabajo mío | Necesita de Goiko |
|---|---|---|---|
| 0 | — | — | Mirar de quién es el backend |
| 1 | — | 1 día | OK para fusionar en `main` y desconectar Lovable |
| 2 | 1 | 1 día | DNS del dominio; OK para publicar |
| 3 | 2 | medio día | Acceso a Resend |
| 4 | 0 (resultado B) | 3–5 días con ensayo | Cuenta Supabase, claves, OK el día del cambio |
| 5 | todas | — | Cancelar el plan |
Las estimaciones son orientativas; la fase 4 depende de lo que Lovable permita exportar.

## 5. Riesgos
- **Cuentas de usuario** (fase 4): es lo único difícil de deshacer. Por eso conviene hacerlo ahora, en beta privada.
- **`main` divergente** (fase 1): Lovable ha seguido escribiendo en `main`; fusionar exige revisar sus cambios.
- **Builds antiguas** (fase 4): cualquier iPhone con una build anterior al cambio seguirá usando el backend viejo.
- **Claves que solo existen en Lovable**: si alguna no se puede leer, hay que emitirla de nuevo en su proveedor.

## 6. Lo que no cambia
La API de Winerim, la lectura de etiquetas en el iPhone, OpenAI para las cartas y TestFlight no pasan por Lovable.
