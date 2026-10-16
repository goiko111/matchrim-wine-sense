# Matchrim: plan de infraestructura propia

Fecha: 2026-10-16. Estado: inventario realizado; migracion NO autorizada ni iniciada.

Este inventario conserva el estado observado a las10:29Madrid. La candidata nativa91 y el backend citados como baseline fueron superados durante el carril paralelo; consultar [Release93](MATCHRIM_RELEASE_93_2026-10-16.md) para la version final. Eso no cambia los datos/metadatos remotos observados ni autoriza una migracion.

## Respuesta practica

Si, podemos sacar Matchrim de Lovable Cloud sin rehacer el producto. Necesitamos controlar el backend completo, no solo alojar el codigo: datos, Auth, permisos, funciones, configuracion y recuperacion ante fallos. El trabajo delicado es conservar identidades y acceso, reconciliar el estado real con el repo y cambiar los endpoints de los clientes instalados sin crear dos bases de datos divergentes.

Hay dos objetivos distintos, sin elegir proveedor ahora:

| Objetivo | Que controlamos | Que seguimos delegando |
| --- | --- | --- |
| Servicios en una cuenta cloud propia | Titularidad, administradores, facturacion, datos/exportaciones, configuracion, despliegue y claves bajo nuestra organizacion | Operacion de los servicios gestionados contratados; no equivale a administrar sus servidores |
| Stack autoalojado en infraestructura que operamos | Lo anterior mas sistema, red, Postgres, Auth, Storage, API y runtime | Hardware/cloud subyacente si se alquila; servicios externos que decidamos conservar |

Mi criterio: decidir primero el nivel de control y quien lo opera; preparar una salida reproducible y ensayada antes de cambiar produccion. El autoalojamiento completo necesita un responsable operativo, mantenimiento y recuperacion comprobada. No basta con instalar Postgres. La plataforma/editor de Lovable no se autoaloja; la aplicacion si es portable. [Lovable: propiedad y opciones](https://docs.lovable.dev/tips-tricks/deployment-hosting-ownership).

## Alcance y evidencia

- Unico entregable escrito: este documento. Sin cambios de app, configuracion, cuentas, permisos, secretos, DNS, migraciones o datos; sin exportar/importar, provisionar, desplegar, publicar, commit o push. No se invoco al agente de Lovable ni a modelos.
- Checkout compartido: `/Users/GOIKO/2matchrim76-recognition-20261008`, rama `codex/matchrim82-cloud-integration-20261013`, HEAD inicial `fd13745`. Los cambios paralelos de release en otros archivos no pertenecen a este trabajo y no se modifican.
- Inspeccion local: `package.json`, configuracion Vite/Capacitor, cliente/tipos Supabase, Auth, persistencia local, integraciones, funciones, migraciones, preparadores de despliegue y documentacion actual.
- Lectura remota: `Lovable.get_database_status` confirma Cloud habilitado, stack Supabase, proyecto Lovable `7e9b6f66-d4ee-404a-8678-c9afab22de75`. Consultas exclusivamente SELECT mediante `Lovable.query_database`: catalogos, recuentos y relaciones agregadas, sin filas personales, contrasenas, hashes, tokens, secretos ni cuerpos de jobs. Lecturas alrededor de 08:29 UTC / 10:29 Madrid; no son una instantanea transaccional de migracion.
- Backend actual: `cbjynrbvrhcmpaojmqdp`. Supabase MCP directo devuelve falta de permiso; no implica que Lovable no pueda consultar/desplegar. No se solicita reconexion ni transferencia de cuentas por ese error.
- Configuracion de produccion leida del repo Lovable en `c9d7b91b8aeb913978ccaab0df8b80f505a7b099`. Los resultados de despliegue OpenAI son evidencia previa del informe [OpenAI92](MATCHRIM_OPENAI_92_2026-10-16.md), no nuevas llamadas ni certificacion de todas las inferencias por este inventario.
- Documentacion oficial consultada en esta fecha. Supabase changelog revisado: version de Postgres/extensiones y compatibilidad TLS deben fijarse en el ensayo; no se actualiza ningun runtime aqui. [Changelog](https://supabase.com/changelog).

## Inventario real

### Codigo, cliente y control

- Repo Git existente: `goiko111/matchrim-wine-sense`. Tener checkout/remote no demuestra titularidad de la organizacion, administradores de respaldo, proteccion de ramas o recuperacion de cuenta: confirmar con el owner.
- React 18 + Vite + TypeScript; salida estatica `dist`, sin necesidad de introducir un servidor SSR. Capacitor 7 empaqueta esos recursos en la app; el backend sigue siendo remoto. La web publica esta congelada.
- `capacitor.config.ts` e iOS usan `wine.matchrim.app`; Xcode declara `1.0 (91)`. Android conserva `wine.winerim.app`, versionCode 1: discrepancia existente que debe reconciliarse con las tiendas antes de una distribucion Android, sin renombrarla aqui. No se ha releido el estado de Apple/Google ni el telefono.
- El informe OpenAI92 mantiene candidato nativo 91 sin subir y gates de reconocimiento/rendimiento/QA abiertos. La migracion de infraestructura no cierra esos gates ni autoriza TestFlight o publicar web.
- No hay workflows GitHub versionados ni Docker/Compose/IaC de produccion en la raiz inspeccionada. Hay scripts de preparacion y QA, no un sistema de operacion/restauracion propio demostrado.
- Ser owner del repo es distinto de poder exportar/restaurar datos, administrar Auth, operar runtime, gestionar facturacion y recuperar el control-plane. Hoy esos servicios estan bajo Lovable Cloud, no bajo el acceso personal Supabase comprobado.

Fuentes locales: [cliente Supabase](../src/integrations/supabase/client.ts), [Capacitor](../capacitor.config.ts), [routing de funciones](../src/utils/matchrimEdgeRouting.ts), [contexto](../PROJECT_CONTEXT.md), [estado actual](../CURRENT_STATE.md). Las guias antiguas de tienda aun contienen identificadores Winerim; no son la autoridad para una nueva firma.

### Base de datos y permisos

Produccion observada: PostgreSQL `17.6`, base de `45,698,195` bytes, 16 tablas publicas, todas con RLS habilitado. El tamano no es una estimacion de capacidad futura, de trafico ni del archivo comprimido.

| Tabla publica | Filas observadas |
| --- | ---: |
| profiles | 21 |
| user_roles | 4 |
| quiz_results | 15 |
| wine_preferences | 0 |
| dietary_preferences | 0 |
| user_wines | 29 |
| wines | 6781 |
| wine_styles | 7776 |
| matchrim_profiles | 7776 |
| wine_recommendations | 126 |
| classification_history | 0 |
| contact_submissions | 24 |
| restaurant_matchrim_sessions | 11 |
| liquid_intelligence_queries | 5 |
| account_deletion_requests | 0 |
| app_events | 3540 |

- Esquema `private` presente; `matchrim_qa` ausente en esta produccion. No se observaron vistas/materializadas en `public/private`.
- Extensiones: `pg_stat_statements 1.11`, `pgcrypto 1.3`, `plpgsql 1.0`, `supabase_vault 0.3.1`, `uuid-ossp 1.1`. Vault existe, pero no se han leido sus secretos ni determinado si contiene datos que requieran tratamiento criptografico especial.
- Funciones SQL: ocho clasificadores/auxiliares `winerim_*_v4_1`; `public/private.has_role`, `handle_new_user`, `handle_updated_at`, `matchrim_email_registered`. Preservar firmas, ACL, owner, `search_path` y semantica, no solo su codigo.
- Trigger `auth.users -> handle_new_user` y actualizacion de solicitudes de borrado observados. Siete FK observadas, incluyendo `user_wines -> profiles`, recomendaciones -> quiz y varias tablas -> Auth. RLS/grants y triggers sobre esquemas gestionados tambien forman parte de la restauracion.
- 42 archivos de migracion locales frente a 7 entradas remotas en `supabase_migrations.schema_migrations`; ultima version registrada `20260622045356`. El historial no prueba por si solo que falten todos los cambios posteriores: hay que comparar objetos/semantica.
- Derivas confirmadas: no hay columnas `canonical*` ni funcion `matchrim_identity_token` en la lectura remota; la migracion local de identidad sigue siendo un candidato, no una base de produccion aprobada. El archivo de marzo recrea tablas que aparecen ya en migraciones de 2025: no ejecutar los 42 archivos a ciegas ni sobre un restore completo.
- La politica remota `Admins can read restaurant demand` no exige `restaurant_lead_opt_in`; la migracion local de octubre si lo contempla. Separar esta reconciliacion de consentimiento del traslado de infraestructura; no ampliar accesos ni declarar esa migracion aplicada.
- Riesgo de permisos concreto: `app_events` conserva una politica que llama a `public.has_role`, cuyo EXECUTE esta revocado a `authenticated`; `private.has_role` si es ejecutable por ese rol. Hay que ensayar las lecturas reales con JWT de usuario/admin y resolver el contrato en un cambio separado. No se ha reproducido aqui un fallo de usuario ni modificado el permiso.
- `matchrim_email_registered` es SECURITY DEFINER y ejecutable por anon/authenticated: incluir control de abuso/enumeracion en la revision de exposicion. No consultar emails para probarlo en produccion.

Fuentes locales: [tipos](../src/integrations/supabase/types.ts), [hardening](../supabase/migrations/20260608100000_harden_security_policies.sql), [identidad candidata](../supabase/migrations/20260929040430_matchrim_user_wines_canonical_identity.sql), [consentimiento candidato](../supabase/migrations/20261005062000_restaurant_signal_consent.sql). Los recuentos anteriores proceden de SELECT remotos, no de los tipos generados.

### Auth, ficheros y trabajo en segundo plano

- Auth: 14 usuarios, 14 identidades, todas de proveedor `email`; 0 factores MFA. Esto no demuestra que no haya proveedores OAuth configurados sin usuarios. El cliente observado implementa email/contrasena, confirmacion, recuperacion, cambio de contrasena y cierre de sesion; no se encontro un flujo OAuth activo en el codigo inspeccionado.
- 7 perfiles sin usuario Auth y 7 filas `user_wines` sin usuario Auth asociado; ninguna fila de bodega carece de perfil y ningun usuario Auth carece de perfil. Su causa no se sabe: no borrar, fusionar, asignar a otro usuario ni recrear cuentas por inferencia. Conservar IDs y pedir decision de conservacion/recuperacion al owner.
- Storage remoto: 0 buckets y 0 objetos en esta lectura. No hay llamadas `supabase.storage` ni politicas `storage.objects` en los fuentes/migraciones inspeccionados. Esto reduce el traslado actual, pero hay que repetir el censo antes del corte, incluyendo exportaciones que Cloud pueda guardar despues en Storage.
- Fotos/PDF de Restaurante91 se guardan localmente en IndexedDB `matchrim.restaurant91`; quiz, historial y feedback tambien usan localStorage con aislamiento de owner. No son objetos de Cloud y no viajan en un dump. Los cambios paralelos del release pueden modificar esa persistencia: fijar su version al ensayar.
- `cron.job` no existe en la lectura remota; no se encontro programacion cron/webhook en los fuentes inspeccionados. No equivale a demostrar ausencia de Jobs externos, automatizaciones del panel o webhooks configurados fuera del repo: falta inventario del control-plane, sin leer cabeceras/credenciales.
- Publicacion `supabase_realtime` existe con 0 tablas publicadas; no se encontro suscripcion Realtime en cliente. No activar replicacion nueva por defecto.
- `send-auth-email` contiene integracion Resend y remitente `noreply@winerim.com`; no se ha comprobado si esta enganchada realmente como Auth hook o si se usa SMTP/servicio Cloud. Hay que inventariar la configuracion activa, dominio verificado, plantillas y entrega, no asumir que copiar la funcion basta.

Fuentes: [Auth](../src/contexts/AuthContext.tsx), [redirects](../src/utils/authRedirect.ts), [sesiones locales](../src/utils/restaurantSession91.ts), [owner local](../src/utils/matchrimLocalOwner.ts), [correo](../supabase/functions/send-auth-email/index.ts).

### Funciones e integraciones

El checkout tiene 32 directorios con `index.ts`; NO son un espejo exacto de las funciones desplegadas. El paquete de produccion OpenAI92 registra 29 entrypoints/41 fuentes e incluye aliases v72 ausentes como directorios propios en este checkout. No desplegar todo el checkout ni confundir 29 funciones IA con el total del backend.

| Grupo local | Funciones / dependencia |
| --- | --- |
| Reconocimiento y afinidad | detect-wine-regions, analyze-wine-region, scan-wine-menu, scan-food-pairing, calculate-wine-affinity |
| aiRIM y busqueda | ai-wine-chat, search-wines, search-wines-v75, search-wines-qa89, wine-search, wine-details, search-wine-image |
| Importacion | extract-wine-label-ocr; extract-wines-ocr/pdf/text; extract-restaurant-ocr/pdf/text; extract-distributor-ocr/pdf/text |
| Precios y tienda | analyze-distributor-prices, analyze-restaurant-prices, analyze-shop-link |
| Restaurante91 | restaurant-import91, restaurant-workspace91 |
| Catalogo / lugares / email | winerim-wines, matchrim-recommendations, detect-location, search-places, send-auth-email |

- Produccion OpenAI92: las 29 funciones IA pasan por `_shared/matchrim-openai.ts`; nombre preferido `openai_matchrim`, alias compatible `OPENAI_API_KEY`. Chat/Responses conservan contratos JSON/SSE y no tienen fallback a Lovable/Anthropic. Tener IA en cuenta propia NO mueve Postgres/Auth/ejecucion fuera de Cloud; OpenAI sigue siendo una dependencia externa incluso con backend autoalojado.
- El preparador de produccion distingue codigo base `67b9086`, despliegue documentado `40f6f97` y restauracion de frontend `c9d7b91`; no fusionar toda la rama movil para migrar. Antes de un ensayo futuro, releer el release aprobado porque esta captura puede quedar superada.
- Config remoto comprobado: JWT habilitado explicitamente para `detect-wine-regions-v72`, `analyze-wine-region-v72`, `scan-wine-menu-v72`, `calculate-wine-affinity-v72`, `calculate-wine-affinity-v73`, `search-wines-v75`, `restaurant-workspace91`, `restaurant-import91`. El config local solo explicita v75; no usarlo como inventario exhaustivo de politicas gateway.
- `calculate-wine-affinity-v73` y `restaurant-import91` no invocan modelos segun el manifiesto; migran igual como contratos de API. Catalogo, mapas y correo tambien son necesarios aunque no sean IA. El inventario total de funciones/versiones del runtime debe releerse por Cloud antes del traslado.
- Restaurante91 URL requiere `Deno.resolveDns`, conexion TCP a IP publica validada y `startTls` con hostname original. Probar egress/TLS/SSRF en el nuevo runtime; no cambiarlo a un fetch sin validacion para hacerlo funcionar.
- Winerim sigue siendo otro sistema: `app.winerim.com/api/v1/matchrim/recommendations`, `/api/v1/restaurant/{uuid}/wines[/match]`, busqueda/detalle de Library y fichas en `web.winerim.com`. Los proxies observados usan GET con Accept JSON, sin credencial Winerim en esos caminos; eso no garantiza acceso contractual, ausencia de limites o continuidad de permisos.
- La tabla local `wines` con UUID NO es el catalogo original Winerim. Conservar IDs externos, slug, productor, anada, precios, moneda y procedencia; no reconstruir fichas oficiales a partir de UUID locales. No trasladar CRM, middleware ni sus credenciales como parte de Matchrim.
- Google Places/geolocalizacion usa `GOOGLE_MAPS_API_KEY`; hay Mapbox en resultados del quiz. Revisar APIs habilitadas, restricciones por origen/IP, cuotas y owner. `wine-search` tiene ruta opcional Spoonacular (`WINE_API_PROVIDER`, `WINE_API_KEY`); verificar si se usa realmente. Enlaces de compra, WhatsApp, placeholders e imagenes remotas son dependencias/enlaces, no proveedores ya contratados por este plan.
- Imports Deno/npm/esm.sh, PDF.js/worker y assets `public/lovable-uploads` deben estar disponibles/reproducibles en el build. No son ficheros Storage que debamos inventar.

Evidencia: [preparador OpenAI92](../scripts/prepare-matchrim-openai92-deployment.mjs), [helper IA](../supabase/functions/_shared/matchrim-openai.ts), [transport URL](../supabase/functions/_shared/matchrim-restaurant-url-transport91.ts), [integracion Winerim](../src/services/winerimApi.ts), [Library](../supabase/functions/_shared/matchrim-public-library89.ts), [informe Restaurante91](MATCHRIM_RESTAURANT_91_2026-10-16.md).

QA separado: los informes y el constructor staging apuntan a `qpbmqvfnunkylvtvnyyx`, esquema `matchrim_qa`, aliases `-qa89/-qa84` y bundles aislados. No consultar ni mover ese proyecto por este plan; no es la produccion cbjyn ni debe mezclarse con sus usuarios/corpus. [Staging documentado](MATCHRIM_PENDING_REMEDIATION_2026-10-15.md), [constructor](../scripts/build-matchrim-staging-candidate.cjs).

## Exportacion e importacion necesarias

### Base y Auth

Usar como base el estado real exportado y un manifiesto de reconciliacion con Git. La guia actual de Lovable documenta exportacion completa desde Cloud > Overview > Advanced settings: incluye estructura, datos, cuentas y hashes de contrasena, pero NO ficheros Storage, codigo Edge ni secretos. Limites publicados hoy: base hasta 15 GB, archivo hasta 5 GB, una solicitud cada 24 horas. No se ha solicitado ninguna. [Exportacion oficial](https://docs.lovable.dev/features/advanced-settings#export-lovable-cloud-data).

La exportacion descrita es `.backup` custom de PostgreSQL con zstd, no SQL para pegar. En el ensayo autorizado se inspeccionaria su indice con herramientas compatibles y se planificaria una restauracion selectiva frente a los esquemas gestionados del destino. No mezclar restore completo, seeds y reproduccion de las 42 migraciones; no usar limpieza destructiva para resolver conflictos. [Guia de migracion Lovable](https://docs.lovable.dev/tips-tricks/external-deployment-hosting#what-migrates-and-how).

Necesitamos verificar en un destino aislado: tablas y contenido, UUID, FK incluso donde no hay constraint, secuencias, indices, columnas generadas, enums, grants, RLS, funciones, triggers, owner, `search_path`, historial y esquemas expuestos por Data API. La historia remota de 7 entradas se reconcilia, no se sustituye inventando 42 aplicaciones. Preservar catalogos de 7776 perfiles/estilos con sus valores originales, aprendizaje, notas, cantidades y consentimientos.

**Contrasenas:** no hace falta conocerlas ni desencriptarlas. El objetivo soportado es conservar hashes e IDs para que el usuario use la misma contrasena, tras restauracion compatible. NO prometerlo antes del ensayo. Mantener `auth.users`, identidades y relaciones; importar solo emails/CSV no lo resuelve. Planificar nuevo login por nuevas claves de firma; no copiar claves JWT antiguas para evitarlo. Probar login y recuperacion con cuentas autorizadas sin que el operador vea contrasenas/hashes. Si el destino no admite restaurar esas cuentas, contingencia de reset/reinvitacion que conserve el mapeo de IDs y evite duplicados. [Supabase: usuarios y passwords](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects).

Reconfigurar aparte Site URL, allowlist de redirects, confirmacion de email, registro/anonymous, limites y protecciones antiabuso, TTL/sesiones, SMTP/hook y plantillas; OAuth/Apple/Google y callbacks si realmente estan configurados. `authRedirect.ts` usa origen web y, en nativo, `VITE_AUTH_REDIRECT_ORIGIN` / `VITE_MATCHRIM_WEB_URL` / `VITE_WINERIM_APP_URL`, con fallback `winerim.wine`. Una app nativa necesita que sus enlaces de email sigan funcionando aunque la web permanezca congelada.

### Storage, datos locales y jobs

- Repetir censo de buckets/objetos en el corte. Si sigue vacio, registrar manifiesto vacio; si cambia, copiar bytes y metadatos con rutas, owner, MIME, tamano y hashes, politicas public/private y limites. Regenerar URLs firmadas y tratar referencias absolutas antiguas sin romperlas. Un backup de BD guarda metadatos, no los bytes de Storage. [Supabase: alcance de backups](https://supabase.com/docs/guides/platform/backups).
- No borrar/recuperar el sandbox nativo para cambiar endpoint: se perderian borradores locales. Mismo bundle/origen y UUID ayudan a mantenerlos, pero hay que probar la actualizacion real, logout/login y separacion de owners. Un cambio de dominio web no transporta su localStorage/IndexedDB automaticamente.
- Inventariar Jobs del panel, triggers HTTP/webhooks, tareas externas y publicaciones/replication slots, aunque ahora no haya `cron.job` ni tablas Realtime publicadas. Anotar horario/zona, ultimo resultado, owner, destino e idempotencia, nunca tokens. Habilitar cada tarea en un solo backend y demostrar una ejecucion sin duplicados. [Lovable: funciones y jobs](https://docs.lovable.dev/tips-tricks/external-deployment-hosting#what-migrates-and-how).
- Datasets QA, originales privados y artefactos firmados no son backups de produccion. Conservar procedencia y accesos fuera de un repositorio publico.

## Infraestructura y operacion que necesitamos

Para cuenta propia: organizacion titular de Matchrim, administradores de respaldo/MFA, acceso de despliegue acotado, entornos separados, exportacion independiente y facturacion con limites aprobados. Para autoalojar: ademas red/firewall/TLS, almacenamiento persistente y de objetos, Postgres y pool, Auth, REST/API gateway, Edge Runtime Deno, y Realtime solo si se necesita; Studio/administracion y DB fuera de exposicion publica innecesaria. Infra, versiones y configuracion reproducibles; no poner en internet el stack local de desarrollo.

Supabase autoalojado no ofrece el mismo control-plane gestionado: Management API, branching, backups/PITR gestionados y parte de las metricas no se trasladan. Habra que operarlos o definir equivalentes; copiar Docker no compra disponibilidad. [Supabase: diferencias y responsabilidades](https://supabase.com/docs/guides/self-hosting). La restauracion de BD tampoco despliega funciones ni mueve objetos por si sola. [Restore a self-host](https://supabase.com/docs/guides/self-hosting/restore-from-platform).

| Area | Requisito previo a produccion |
| --- | --- |
| Secrets | Matriz nombre/uso/owner/origen/rotacion; introducir valores por un canal seguro en el destino, nunca Git, documento, bundle o chat. Claves de destino nuevas; secret/service-role solo servidor. No asumir que un export migra el gestor de secretos. |
| Config cliente | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_DB_SCHEMA`, `VITE_MATCHRIM_EDGE_RELEASE`; redirects/share origin y Winerim. Son valores de build, no un cambio remoto que actualice binarios instalados. Fixtures QA desactivadas en produccion. |
| Config servidor | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MATCHRIM_DB_SCHEMA`; `openai_matchrim` y overrides `MATCHRIM_OPENAI_FAST_MODEL/QUALITY_MODEL/VISION_MODEL`; Google Maps, Resend, Winerim y ruta WINE_API solo si proceden. No llevar toggles historicos de proveedor al destino. |
| Observabilidad | Logs estructurados con request ID, release/function/modelo, fase, duracion, estado y reintentos; metricas de Auth, DB/pool, RLS denegada, egress, 429/5xx, SSE incompleta, tokens/uso y gasto. Redaccion de PII/imagenes/prompts/URLs sensibles; retencion y acceso definidos. |
| Alertas | Pruebas de error/timeout y canal al operador; capacidad/disco, antiguedad de backup, certificado, fallo de email, latencia y presupuesto. `app_events` y logs de consultas no sustituyen monitorizacion de salud. |
| Backups | BD + Auth + objetos + configuracion + artefactos de funciones; cifrados, copia independiente y retencion aprobada. Custodia criptografica si se usa Vault/cifrado: no confundir restaurar ciphertext con poder usarlo. |
| Restore | Restaurar en entorno aislado sin emails/jobs reales, validar acceso e integridad y medir RPO/RTO; ensayar perdida del servidor y recuperacion del control-plane. Un backup sin restore no es gate aprobado. |
| CI/CD | Builds reproducibles con lockfile/runtime fijados, migraciones revisadas, manifiesto de hashes y config, escaneo de secretos, aprobacion explicita de produccion, despliegue y rollback independientes de la app. |
| Datos personales | Owner responsable, region/residencia y encargados, retencion y borrado real: la app crea solicitudes, no demuestra eliminacion automatica. No reintroducir por restore cuentas/datos ya borrados; reconciliar bajas. |

No se dimensiona ni se cotiza sin MAU/concurrencia, escaneos por usuario, paginas/imagenes por lectura, llamadas y tokens, almacenamiento/egress, disponibilidad requerida y horas operativas. La simulacion de 10000 usuarios no mide carga real. El informe actual observa un escaneo clasico aun cargando a 65.678 s y completo en la observacion de 156.685 s; no hay p95/coste medido para extrapolar. Separar gasto IA, servicios, trafico, backups, correo y operacion; aqui no se elige proveedor ni se autoriza gasto.

## Corte de release y rollback

1. Fijar dos manifiestos: release cliente realmente distribuido y backend que ese release consume. Mapear web congelada, cada version nativa y aliases legacy/QA. No asumir que la rama local, el candidato 91 y todos los clientes instalados llaman igual.
2. Ensayar en despliegue/bundle aislado que no sustituya al instalado. Verificar REST/Auth, apikey, JWT/JWKS, esquemas, CORS para origenes web y WKWebView/Android, limites de carga/duracion y SSE sin buffering. No deshabilitar JWT/RLS para conseguir un PASS.
3. Elegir convivencia antes del corte: endpoint incrustado `cbjyn...supabase.co` no puede reasignarse cambiando nuestro DNS. Sin configuracion remota ya existente, la app necesita nueva build firmada para otro endpoint. Un proxy/dominio estable futuro necesita diseno y autorizacion, no es un recurso ya disponible.
4. Mantener un unico escritor canonico para datos de usuario. La web congelada y las apps viejas seguiran llamando a Cloud: conservar compatibilidad/control de escritura, o aprobar una actualizacion y ventana de mantenimiento que de verdad impida escrituras antiguas. No abrir el destino a escrituras si no se ha resuelto esto. No improvisar doble escritura.
5. Tras ensayo y aprobacion: ventana anunciada, bloqueo efectivo de escritores/jobs, exportacion final o delta completo verificado (incluye altas Auth, cambios de password, borrados y ficheros), restauracion/reconciliacion y pruebas. El limite diario de export Cloud condiciona el ensayo y el dia de corte; no se presupone CDC/delta disponible.
6. Activar primero canary autorizado, luego distribucion escalonada y observacion durante la ventana acordada; actualizar APIs/callbacks/DNS solo cuando correspondan. No redirigir dominios Winerim compartidos o correo para solucionar un endpoint de Matchrim. No publicar la web congelada sin nueva autorizacion.
7. **Rollback antes de escrituras nuevas:** volver al backend/build/ruta anterior y mantener jobs nuevos apagados, con lectura independiente del resultado. **Despues de escrituras nuevas:** parar escritores y reconciliar journal/delta inverso probado, incluidos Auth/borrados; volver solo DNS o IPA perderia datos y no cambia apps ya instaladas. Si ese retorno no esta ensayado, mantener mantenimiento y recuperar hacia delante segun runbook aprobado.
8. Retirar Cloud solo tras demostrar que ninguna version web/nativa ni integracion lo necesita, pasar restore y vencer retencion/rollback aprobados. No pausar ni eliminar ahora; retirar temprano cortaria usuarios, enlaces y acceso a exportaciones.

## Fases y pruebas de aceptacion

Todas las fases posteriores a este inventario necesitan autorizacion nueva. Las pruebas con usuarios, correo, modelos o carga se presupuestan y autorizan antes; las escrituras de prueba se limitan al destino de ensayo.

| Fase | Trabajo | Aceptacion para avanzar |
| --- | --- | --- |
| 0. Inventario, realizado | Fuentes/config, SELECT de metadatos y recuentos, documentos oficiales, riesgos | Este documento; ninguna migracion ni prueba de restore ejecutada. Pendientes de control-plane identificados. |
| 1. Decisiones y acceso | Owner define objetivo/cuenta ya disponible, operador, region, RPO/RTO, presupuesto, permisos de export y dominios; completar inventario Cloud | Matriz de owners/accesos, alcance de datos/QA, plan de convivencia y reversa aprobado; no requiere revelar secretos. |
| 2. Diseno y paquete | Arquitectura y versiones, DDL real + historia reconciliada, manifiesto de funciones/ACL/jobs y export seguro | Todos los objetos y endpoints del release tienen destino; diferencias de consentimiento, permisos y perfiles huerfanos con decision explicita; nada de aplicar cambios candidatos tacitamente. |
| 3. Restauracion aislada | Infra de ensayo autorizada, restore BD/Auth/Storage y configuracion; correo/jobs sin salida real | Recuentos/PK/FK/hashes cuadran al snapshot; sin duplicados por triggers/seeds; mismos UUID y ownership. Login con misma password, reset y confirmacion entregados al buzon de prueba; nuevo JWT valido y antiguo rechazado. Recuperacion completa medida dentro de RPO/RTO. |
| 4. Contratos y nativo | Reproducir rutas del release aprobado y actualizar candidato aislado | Anon/A/B/admin: cada uno ve/edita solo lo permitido; B no lee A ni cambia owner/rol; anon no escribe catalogo ni invoca funciones privadas. Roles/RPC, consentimiento y solicitudes de borrado funcionan. URLs privadas/firmadas no filtran datos. |
| 4. Integraciones y fallos | Winerim, IA, email, mapas, URL/PDF, monitorizacion | IDs/procedencia Winerim y campos sensoriales/precios intactos; JSON/errores/SSE/cancelacion conservados; sin fallback IA. SSRF/IP privada/redirect bloqueados, TLS valido. Timeout, desconexion, 429 y 5xx no duplican escrituras ni llamadas sin limite; alertas y techo de gasto probados con mocks primero. Canaries reales solo con cupo aprobado. |
| 4. Distribucion | Actualizacion sobre la version instalada, no reinstalacion destructiva | Borradores/quiz/historial sobreviven cuando corresponde; cambio de usuario no filtra cache; reset nativo vuelve al origen correcto; camara/galeria/PDF, memoria, texto grande y VoiceOver/rotacion pasan. Gates de producto siguen separados. |
| 5. Corte y reversa | Final sync bajo ventana, canary y writer unico, ensayo de rollback | Cero escrituras perdidas/dobles o jobs duplicados; tambien altas/password/bajas reconciliadas. Reversa con una escritura de prueba demostrada; criterios/tiempo de rollback y persona que decide registrados. |
| 6. Operacion | Observar uso real, backups, soporte y costes; retirar dependencias antiguas tras aprobacion | Restore periodico y runbook usados por operador de respaldo; todos los clientes soportados cubiertos, sin trafico dependiente del origen a retirar; cierre expreso del owner. |

## Inputs del owner y pendientes exactos

1. **Que significa propia:** cuenta cloud bajo vuestra organizacion, stack completamente operado por vosotros, o ambas por etapas. Que cuentas/infra ya existen y se pueden usar; no se elige una nueva aqui.
2. **Quien responde:** titular/backup del repo, Cloud, dominio/DNS, correo, OpenAI, mapas, Apple y Android; responsable tecnico de incidencias, restauraciones y mantenimiento. El acceso Winerim de otros proyectos no otorga permisos a Matchrim.
3. **Prioridades operativas:** region/residencia requerida, disponibilidad, perdida de datos tolerable (RPO), tiempo de recuperacion (RTO), ventana de mantenimiento, soporte de apps antiguas y presupuesto maximo. No hay plazo/precio fiable sin esto.
4. **Datos existentes:** por que hay 7 perfiles y 7 vinos sin Auth; si se conservan o recuperan y como se atienden derechos/bajas. No entregar contrasenas ni IDs personales en chat para resolverlo.
5. **Control-plane por verificar:** capacidad real de export y restore del owner; proveedores Auth habilitados, SMTP/hook real, plantillas/dominio de email, URLs/callbacks, secretos por nombre/owner, Jobs externos, versiones de todas las funciones, backups/retencion/PITR y uso de Vault. No se han inspeccionado valores secretos ni ejecutado exportaciones.
6. **Dependencias y release:** autorizacion de continuidad/licencia/limites Winerim y claves ya existentes; resolver divergencia Android/iOS; decidir como no dejar a web congelada/apps antiguas escribiendo en una BD retirada. IA propia ya esta encaminada con OpenAI92, pero no implica independencia completa.

Conclusion: la salida es tecnicamente viable y el volumen observado es acotado; falta demostrar restauracion y continuidad de acceso/escrituras. El siguiente paso util es cerrar estas decisiones y autorizar un ensayo aislado, no mover produccion ni contratar infraestructura por adelantado.
