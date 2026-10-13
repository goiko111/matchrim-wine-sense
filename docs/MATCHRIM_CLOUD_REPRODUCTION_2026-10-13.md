# Reproducción cloud de Matchrim

Baseline obligatoria: `0c1a29728fb2f6b7f033b7d5e68bc8ea8e5335b1`, rama de traspaso `codex/matchrim-cloud-20261013-3e75f30`. Sus 387 fingerprints corresponden a la fuente local `3e75f30abc79c6262f96b06515437aec1e728a90`; ese objeto Git local y los 42 commits históricos no se presuponen disponibles. El manifiesto original no se modifica.

## Runtime explícito

```sh
npm ci --ignore-scripts
python3 -m pip install -r scripts/requirements-matchrim-cloud.txt
python3 -m playwright install chromium
npm run test:cloud
npm run qa:cloud -- --output /tmp/matchrim-cloud-qa --browser /ruta/absoluta/a/chromium --production --memory-cycles 30
```

Se puede omitir `--browser` si Chromium está instalado por Playwright. `--python` permite seleccionar explícitamente el intérprete. En este entorno la descarga de Playwright devolvió ZIP inválido; se extrajo el ejecutable del paquete `@sparticuz/chromium@153.0.0` fuera del repositorio. No se añadió como dependencia del producto ni se cambió el lockfile. Chromium observado: `153.0.8010.0`, Playwright Python: `1.58.0`.

El wrapper lanza Vite/preview y el harness en el mismo namespace de red Linux. Mantener un servidor en otra llamada de shell no permite necesariamente alcanzarlo. El modo `--production` significa build/preview local, nunca deploy. Usa dominios `.invalid`, clave sintética inválida, analytics desactivado y fixtures de bypass desactivadas. Cada harness registra interceptores HTTP/WS antes de navegar, bloquea service workers y no escribe datos alojados.

`node --import tsx` sustituye el ejecutable `tsx`, cuyo socket IPC no estaba permitido aquí. `npm test`, typecheck y lint siguen verificando el producto. La suite cloud añade integridad del snapshot y contratos actuales; los resultados históricos permanecen separados.

## Memoria

```sh
python3 scripts/qa-matchrim-local-server.py --production --log /tmp/memory/server.log -- \
  python3 scripts/qa-matchrim-memory-oct13.py --url http://127.0.0.1:4469 \
  --browser /ruta/a/chromium --output /tmp/memory --seconds 1800 --cycles 600 \
  --gc-every 20 --bounded-waits --dispose-chooser --dispose-console --clear-console \
  --heap-snapshot --native-sampling
node scripts/check-matchrim-cloud-memory.mjs /tmp/memory
node scripts/inspect-matchrim-cloud-heap.mjs /tmp/memory/final.heapsnapshot /tmp/memory/retainers.json
```

`--bounded-waits` es obligatorio para el gate nuevo. En Playwright Python 1.58.0 `Locator.wait_for` descarta el `ElementHandle` devuelto por `wait_for_selector`; la versión JavaScript usa `omitReturnValue`. Las raíces fuertes CDP y la traza de protocolo reprodujeron esa retención. Se usan aserciones que no dejan esos handles y liberación explícita de handles propios. El modo antiguo permanece para comparación, pero no aprueba el gate de retención.

Los contadores post-GC, árboles DOM desprendidos, DOM vivo y RSS se reportan por separado. RSS suma procesos Chromium descendientes del harness en su mismo namespace y puede contar páginas compartidas varias veces. Se lee el grafo PPid porque este runtime no expone `/proc/.../task/.../children`. Un perfil de muestreo vacío no acredita ausencia de asignaciones nativas. Los heaps completos y perfiles Chromium temporales permanecen fuera del repositorio.

Controles diagnósticos: `qa-matchrim-cloud-image-memory.py` prepara y recorta el canario sin React/Vaul/backend; `qa-matchrim-cloud-cdp-control.py` usa CDP pipe sin Playwright ni `Network.enable`, con los mismos flags de Chromium. El segundo requiere un JSON explícito de flags de lanzamiento y conserva su provenance. Ambos son diagnóstico, no gates de precisión ni reconocimiento. El endpoint TCP/protocolo del headless shell falló aquí; se conserva el fallo y se usa el pipe.

## Alcance de los inputs

Se conserva la foto pública original `qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg`, SHA256 `9980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9`. Sus respuestas antiguas se extraen sin modificar `qa-multi-wine-ui.py`, SHA256 `f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40`. La carta usa los payloads registrados de `qa/fixtures/menu-food-evidence-oct8.json`.

Esto valida píxeles, interacción y contratos del cliente, no que una carta de comida contenga vinos ni precisión OCR. Perfil null, catálogo vacío. Los bytes JPEG inválidos de recuperación son un input sintético de fallo, no una foto HEIC del propietario. Los 60 puntos del test de agrupación son geometría matemática sintética, no escenas ni identidades nuevas. No se regeneran datasets.

El gate histórico `check-matchrim-second-hour-oct13.ts` sale con código 2 y `blocked-prerequisite` si falta `3ad38f28badb59c03a1217c0ed1deb1a1581421a`. No se rebaja una aserción ni se transforma esa ausencia en verde.

## Gates independientes

No se certifican proveedor/modelo, precision/recall, calibración humana, RLS/persistencia alojada, permisos/cámara nativos, HEIC en iPhone, VoiceOver/Dynamic Type físicos, Apple/Xcode/firma o TestFlight. La emulación móvil y el árbol AX son únicamente web Chromium. No hay push, PR, merge a main, Edge Functions, deploy o publicación.
