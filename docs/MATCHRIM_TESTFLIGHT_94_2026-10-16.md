# Matchrim TestFlight94 - 2026-10-16

## Scope

Owner explicitly requests uploading94. Frozen application source remains
`6f45254b8e7e4aac817e7356d632f6fce352ed59`, with the identity/sensory corrections
and QA in [the identity94 report](MATCHRIM_IDENTITY_94_2026-10-16.md).
Production bundle `wine.matchrim.app`, version1.0(94), team `8X3XTD6XYX`.
Published web/backend/schema/accounts/provider settings are unchanged. No paid
vision calls, Lovable deployment or App Store release in this block.

## Distribution Defect Found And Fixed

The first upload was rejected at13:07:40 Madrid with exit70:
`CFBundleIdentifier Collision`, Apple validation ID
`d1db33b1-2080-467a-9eff-a51d210aa749`. It was NOT accepted or processing.

The inherited archive command globally supplied
`PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.app`, overriding all Pods targets too.
Actual exported Info.plist readback found that identifier in the App and all
three frameworks. The archived93 IPA has the same four-way collision; this is
a local packaging observation, not proof of93's remote processing state.

Rebuilt with clean, separate DerivedData/archive/export, using the exact existing
per-target project identifier/version settings. No global bundle/version
overrides; no code, resource, provisioning or build-number changes. Final IDs:

| Bundle | Identifier |
| --- | --- |
| App | `wine.matchrim.app` |
| Capacitor | `org.cocoapods.Capacitor` |
| CapacitorKeyboard | `org.cocoapods.CapacitorKeyboard` |
| Cordova | `org.cocoapods.Cordova` |

The verifier now checks uniqueness across every embedded Info.plist, exactly
one production identifier, and each expected CocoaPods identifier. Versioned
`scripts/check-ios-bundle-identifiers.mjs` also rejects the real defective IPA
contents (exit1) and approves the corrected contents (exit0); focused ESLintPASS.

## Final Artifact And QA Gate

- Signed App Store IPA SHA256:
  `2bf8bc0be6596ff67aafff5b9614cf419427e2997815d3713a0e2e66686c55ba`.
- 204/204 distribution checksPASS: strict signatures, profile/certificate, no
  debug entitlement, exact version/team, unique framework identifiers,
  archive/dSYM UUID parity, durable archive round-trip, production anon/schema/
  routing, no fixture/staging/private credentials and158/158exact tested resources.
-345 frozen application inputs unchanged. The committed post-source difference
  before packaging was documentation only. The new standalone packaging guard
  is not included in the app or counted as new functional QA.
- Existing source11gate groups, controlled mobile27cases/189checks and two
  bounded native methods are independently reconciled to the exact preparation.
  No new full-corpus recognition, physical or human preference validation.
- First local verifier correctly failed an inventory-domain mismatch:
  regression runner hashes344inputs excluding `capacitor.config.ts`; native
  preparation hashes345including it. Exact344intersection comparison plus all
  independent345/config checks nowPASS. Failed evidence is preserved.

## Upload Outcome

Apple accepted the corrected upload at13:10:59 Madrid /11:10:59UTC, exit0:
`Uploaded App`, `Upload succeeded.`, `Uploaded package is processing.` and
`EXPORT SUCCEEDED`. There were two94delivery attempts: one rejected validation,
then one accepted corrected package; no duplicate accepted delivery.

Receipt log SHA256:
`7cdd5e9b7105fcedf719c7fb0645266fa4951df2d111c540eedef511d8e70c96`.
Apple returned a nonblocking deployment-target warning: this package targets
iOS14.0; its warning says future uploads from April2027 must target15.0 or later.
No deployment-target/product change was made during this upload.

The post-upload `/apps` readback redirects to
`/login?targetUrl=%2Fapps&authResult=FAILED`, with no usable login form in the
observed Chrome session. TestFlight tester-group assignment, installability and
external invitation remain unverified. Upload acceptance is not installability.
Xcode signing/upload authentication is a separate working channel.

## Evidence And Reproduction

Private root:
`/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim94-testflight-20261016`.

- `candidate94-fixed-bundle/`: final signed IPA/archive,204check report and exact
  resource/config/signing manifests; previous attempts remain historical.
- `upload-fixed-bundle/`: corrected upload gate/start/log/result.
- `upload94.log/json`: rejected first delivery; do not rewrite as accepted.
- `bundle-collision-remediation94.json` and `bundle-guard-regression94.json`:
  defect provenance and real negative/positive artifact controls.

For a future candidate, use a NEW build number and isolated preparation with
`scripts/prepare-matchrim-release93.mjs --build=<number>`. Archive the prepared
production workspace without global `PRODUCT_BUNDLE_IDENTIFIER`,
`CURRENT_PROJECT_VERSION` or `MARKETING_VERSION` overrides. Run:

```bash
node scripts/check-ios-bundle-identifiers.mjs /absolute/export/Payload/App.app
```

Then require the full distribution verifier before separately authorized upload.
The original identity94 recognition/data/physical residuals remain open; beta
upload is not a declaration that the whole product is validated.
