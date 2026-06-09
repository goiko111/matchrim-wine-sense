# Winerim Store Release Checklist

Checked on 2026-06-09.

## Official references

- Google Play target API level: https://support.google.com/googleplay/android-developer/answer/11926878
- Android target SDK guide: https://developer.android.com/google/play/requirements/target-sdk
- Apple privacy manifest files: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
- Apple required reason APIs: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- App Store privacy details: https://developer.apple.com/app-store/app-privacy-details/

## Current app ids

- App name: `Winerim`
- Android application id: `wine.winerim.app`
- iOS bundle id: `wine.winerim.app`
- Android version: `versionName "1.0"`, `versionCode 1`
- iOS version: managed in Xcode via `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`

Confirm these ids before creating the apps in App Store Connect and Google Play Console. Changing them later means creating a different app listing.

## Release machine prerequisites

- Node dependencies installed with `npm install`.
- JDK 17 or newer selected by `JAVA_HOME`.
- Android Studio/SDK installed, with Android SDK Platform 35 available.
- Full Xcode installed and selected with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- CocoaPods installed for iOS sync/build.
- Apple Developer Program team and App Store Connect app created.
- Google Play Console app created.

This workspace currently cannot compile native release builds because it has Java 8, Command Line Tools instead of full Xcode, and no CocoaPods.

## Android signing

The Android release build reads signing credentials from environment variables. Do not commit keystores or passwords.

Required variables:

```sh
export WINERIM_UPLOAD_STORE_FILE=/absolute/path/to/winerim-upload.keystore
export WINERIM_UPLOAD_STORE_PASSWORD=...
export WINERIM_UPLOAD_KEY_ALIAS=...
export WINERIM_UPLOAD_KEY_PASSWORD=...
```

Generate the upload keystore only once and store it in a password manager or secure company vault:

```sh
keytool -genkeypair \
  -v \
  -keystore winerim-upload.keystore \
  -alias winerim-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Build Android release artifacts:

```sh
npm run android:bundle
npm run android:apk
```

Primary Play Console upload artifact:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## iOS release

Copy web assets into the iOS project:

```sh
npm run ios:copy
```

Then open `ios/App/App.xcworkspace` in Xcode and archive from there. Confirm:

- Team is set to the Winerim Apple Developer account.
- Bundle identifier is `wine.winerim.app`.
- Marketing version and build number are correct.
- Signing is automatic or uses the intended provisioning profile.
- The camera/photo usage descriptions match the scanner flow.

## Privacy and data disclosures

Before submitting, complete the store privacy forms using product decisions, not guesses.

Likely collected or processed data:

- Email/auth identifiers from Supabase Auth.
- Name/profile information entered during registration.
- Matchrim sensory quiz responses and generated profile.
- Saved wines, ratings and notes in "Mis vinos".
- Restaurant names/locations indicated by users.
- Uploaded or photographed wine menus for scanner analysis.
- Technical diagnostics if hosting or Supabase logs are used for debugging.

Decisions to confirm:

- Privacy policy URL for both stores.
- Whether uploaded menu images are stored permanently or processed transiently.
- Whether restaurant demand signals are linked to the signed-in user.
- Whether any analytics/tracking providers are enabled outside Supabase/API logs.
- Whether app data is used for advertising, tracking or third-party marketing.

## Store screenshots

Capture real simulator/device screenshots after release build validation:

- Native home with no Matchrim yet.
- Matchrim test first question.
- Generated Matchrim/passport profile.
- Use code / Winerim menu filtering.
- Scanner flow for restaurant without Winerim.
- Mis vinos with saved/rated wines.

Recommended first visual message: Winerim is a consumer app that turns a sensory profile code into better wine choices, and also creates visible demand for restaurants to adopt Winerim.

## Pre-submit validation

Run before uploading:

```sh
npm run lint
npm test
npm run build
npm run cap:sync
npm run android:bundle
npm run ios:copy
```

Then perform manual smoke tests in Android Studio and Xcode:

- App launches without remote Lovable dependency.
- Home renders with safe areas on iPhone and Android devices.
- Auth works.
- Matchrim test saves a profile.
- Code flow reaches Winerim filtering.
- Scanner route handles a non-Winerim restaurant.
- Mis vinos can save and rate wines.
