# Installed-app native QA

This is the exact XCTest source/project used against the installed candidate75, not a recognition mock runner. It controls `wine.matchrim.app` already installed on the selected device. It does not uninstall the app or clear owner data.

The project name and cold-launch diagnostic label retain historical `73` naming. They are not assertions about the installed app version; verify the installed bundle before running. The runner bundle identifier is also historical and independent of the app identifier.

```bash
DEVELOPER_DIR=/Applications/Xcode-26.0.1.app/Contents/Developer xcodebuild test \
  -project qa/native-candidate75/Matchrim73QA.xcodeproj \
  -scheme MatchrimCandidateQA \
  -destination 'platform=iOS Simulator,id=YOUR_SIMULATOR_UUID' \
  -derivedDataPath /private/tmp/Matchrim-native-qa \
  -resultBundlePath /private/tmp/Matchrim-native-qa-run.xcresult
```

Use a fresh result path per run. For the owner's authorized physical device, select `platform=iOS,id=DEVICE_UDID` and a separate derived-data path. The configured signing team must be available. Copy the project to a local scratch directory if macOS file coordination stalls builds under Documents.

Six scenarios: cold starts/safe area, basic accessibility audit, photo-picker return, primary navigation/aiRIM, scanner modes, rotation/background. Attachments deliberately avoid the owner's photo-picker thumbnails.

Not covered: spoken VoiceOver, fresh permission allow/deny, real-photo recognition, authenticated CRUD, recommendation correctness, memory/network profiling. Real-provider browser evidence is documented separately in `docs/MATCHRIM_75_QA_2026-10-08.md`.
