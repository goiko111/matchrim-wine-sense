# Winerim App Store Readiness

## Estado actual

- Capacitor usa `Winerim` como nombre de app y `wine.winerim.app` como bundle/package id provisional.
- La app ya no carga la URL remota de Lovable desde Capacitor: empaqueta el build local de `dist`.
- Android e iOS estan generados en `android/` e `ios/`.
- Los assets nativos se generan desde `resources/icon.png` y `resources/splash.png`.
- Android declara solo `INTERNET`; no se ha anadido permiso de camara para evitar una declaracion Play Store innecesaria.
- iOS incluye textos de privacidad para camara y fototeca, alineados con el flujo de fotografiar o subir cartas de vino.
- La navegacion movil logueada tiene barra inferior fija con Inicio, Test, Codigo, aiRIM y Vinos.

## Validado localmente

- `npx tsc --noEmit`: OK.
- `npx eslint src/components/AppNav.tsx src/components/Header.tsx`: OK.
- `npm test`: OK.
- `npm run build`: OK, con warnings de chunk grande y Browserslist antiguo.
- `npx cap sync android`: OK.
- `npx cap copy ios`: OK.
- `npx cap doctor`: OK para Android/iOS con Capacitor 7.4.4 instalado.
- Playwright mobile smoke: home publica, home logueada simulada y `/usar-matchrim` logueada simulada renderizan sin overflow horizontal.

## Bloqueos de entorno para release

- Android debug build no puede terminar en esta maquina porque Gradle esta usando Java 8. El Android Gradle Plugin requiere Java 11 o superior; recomendado Java 17.
- iOS no puede ejecutar `pod install` ni compilar aqui porque no hay Xcode completo ni CocoaPods instalados.
- Para publicar faltan certificados, provisioning profiles, Apple Team, keystore Android y cuentas de App Store Connect / Google Play Console.

## Pendiente antes de subir a stores

- Confirmar si `wine.winerim.app` es el bundle/package id definitivo antes de registrar la app en Apple/Google.
- Instalar/configurar JDK 17+, Android Studio/SDK y Xcode + CocoaPods en la maquina de release.
- Ejecutar `./gradlew assembleRelease` o `bundleRelease` en Android y build/archive en Xcode.
- Crear y guardar el keystore Android con proceso de custodia claro.
- Completar los cuestionarios de privacidad: perfil sensorial, email/auth, vinos guardados, cartas subidas/escaneadas, restaurantes indicados por usuarios y procesamiento mediante Supabase/Edge Functions/API Winerim.
- Resolver o acotar el lint global: actualmente falla por deuda heredada en admin/importadores/functions y algunos hooks.
- Reducir bundle/chunks para mejorar arranque movil, especialmente `pdf.worker` y el bundle principal.
