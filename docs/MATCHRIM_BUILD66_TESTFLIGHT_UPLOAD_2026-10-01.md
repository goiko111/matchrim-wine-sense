# Matchrim 1.0 (66): TestFlight upload

Date: 2026-10-01

## Result

The owner explicitly authorized uploading build 66 for hands-on testing. Xcode 26.0.1 exported the validated archive with App Store Connect distribution and uploaded it successfully.

- Bundle: `wine.matchrim.app`
- Version/build: `1.0 (66)`
- Team: `8X3XTD6XYX`
- Preserved archive: `~/Library/Developer/Xcode/Archives/2026-09-30/Matchrim 1.0 (66).xcarchive`
- Upload result: `Upload succeeded`
- App Store Connect state at 06:00 CEST: package processing
- Source commit: `3747ac6dec23577232c813b1fc69347bccb90704`

At 06:07 CEST the same signed build was installed directly on the connected iPhone 16 Pro Max. `devicectl` confirmed bundle `wine.matchrim.app`, version `1.0`, build `66`, and launched the app successfully. This makes the candidate available for immediate hands-on testing while TestFlight finishes processing; it does not replace the pending workflow QA.

Apple emitted one non-blocking warning: the deployment target remains iOS 14 and must move to iOS 15 before April 2027.

No web, Lovable or Supabase deployment was performed. The isolated-staging cabinet identity gate remains unresolved and distribution must not be expanded beyond this requested test until that gate and physical QA are accepted.
