# Winerim App Store Readiness

## Estado actual

- Capacitor usa `Winerim` como nombre de app y `wine.winerim.app` como bundle/package id provisional.
- La app ya no carga la URL remota de Lovable desde Capacitor: empaqueta el build local de `dist`.
- Android e iOS estan generados en `android/` e `ios/`.
- Los assets nativos se generan desde `resources/icon.png` y `resources/splash.png`.
- Android declara solo `INTERNET`; no se ha anadido permiso de camara para evitar una declaracion Play Store innecesaria.
- iOS incluye textos de privacidad para camara y fototeca, alineados con el flujo de fotografiar o subir cartas de vino.
- La navegacion web movil logueada tiene barra inferior fija con Inicio, Test, Codigo, aiRIM y Vinos.
- La version nativa detecta Capacitor y usa una home de app, orientada a acciones directas, en lugar de la landing larga de la web.
- En nativo, la barra inferior prioriza Inicio, Test, Codigo, Perfil y Vinos para que la experiencia se parezca a una app de consumo y no a la web empaquetada.
- El flujo nativo inicial explica el uso esperado: crear codigo, filtrar carta Winerim y guardar/puntuar vinos para afinar el perfil.
- El checklist operativo de publicacion esta en `docs/STORE_RELEASE_CHECKLIST.md`.
- Android release puede firmarse con variables de entorno `WINERIM_UPLOAD_STORE_FILE`, `WINERIM_UPLOAD_STORE_PASSWORD`, `WINERIM_UPLOAD_KEY_ALIAS` y `WINERIM_UPLOAD_KEY_PASSWORD`.
- El scanner de cartas carga PDF.js solo cuando el usuario sube un PDF; el chunk principal del scanner queda alrededor de 10 kB.

## Validado localmente

- `npx tsc --noEmit`: OK.
- `npm run lint`: OK, con advertencias heredadas de `any`, algunos hooks y Fast Refresh.
- `npm test`: OK.
- `npm run build`: OK, con warnings de chunks bajo demanda grandes y Browserslist antiguo.
- `npx cap sync android`: OK.
- `npx cap copy ios`: OK.
- `npx cap doctor`: OK para Android/iOS con Capacitor 7.4.4 instalado.
- Scripts de release disponibles: `npm run cap:sync`, `npm run android:bundle`, `npm run android:apk` y `npm run ios:copy`.
- Playwright mobile smoke: home publica, home logueada simulada y `/usar-matchrim` logueada simulada renderizan sin overflow horizontal.
- Playwright smoke despues del split de rutas: home web, scanner movil y home nativa iOS simulada renderizan correctamente.
- La home nativa debe revisarse en simulador/dispositivo real despues de compilar con Xcode/Android Studio.

## Bloqueos de entorno para release

- Android debug build no puede terminar en esta maquina porque Gradle esta usando Java 8. El Android Gradle Plugin requiere Java 11 o superior; recomendado Java 17.
- iOS no puede ejecutar `pod install` ni compilar aqui porque no hay Xcode completo ni CocoaPods instalados.
- Para publicar faltan certificados, provisioning profiles, Apple Team, keystore Android y cuentas de App Store Connect / Google Play Console.

## Pendiente antes de subir a stores

- Confirmar si `wine.winerim.app` es el bundle/package id definitivo antes de registrar la app en Apple/Google.
- Instalar/configurar JDK 17+, Android Studio/SDK y Xcode + CocoaPods en la maquina de release.
- Ejecutar `./gradlew assembleRelease` o `bundleRelease` en Android y build/archive en Xcode.
- Crear y guardar el keystore Android con proceso de custodia claro.
- Exportar las variables de firma Android antes de `npm run android:bundle`.
- Completar los cuestionarios de privacidad: perfil sensorial, email/auth, vinos guardados, cartas subidas/escaneadas, restaurantes indicados por usuarios y procesamiento mediante Supabase/Edge Functions/API Winerim.
- Reducir deuda de lint heredada: ahora no bloquea, pero conviene tipar los `any` y revisar dependencias de hooks antes de endurecer reglas.
- Seguir reduciendo chunks bajo demanda para mejorar experiencia movil, especialmente `pdf.worker` y `RegionMap`/Mapbox.
- Preparar capturas reales de App Store/Google Play usando la home nativa, el flujo de codigo, el scanner y Mis Vinos.
