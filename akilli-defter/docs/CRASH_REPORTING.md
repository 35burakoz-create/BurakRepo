# Crash Reporting (Firebase Crashlytics)

## Scope
- Platform: Android (Flutter)
- SDK: `firebase_core` + `firebase_crashlytics`
- Runtime init: `apps/mobile/lib/main.dart`

## Setup summary
1. Create Firebase project and register Android app.
2. Download `google-services.json` and place it at:
   - `akilli-defter/apps/mobile/android/app/google-services.json`
3. Ensure Android Gradle setup enables Crashlytics plugin and Google services plugin.
4. Build release and verify first startup sends non-fatal/fatal events.

## Hidden debug test action
- A debug-only Settings action exists:
  - Label: `(Gizli) Test çökmesi gönder`
  - Location: Settings list (only in debug builds)
- It records a non-fatal event, then throws a crash to validate the pipeline.

## Release symbol upload (Android)
Crashlytics needs mapping/symbol files for readable stack traces.

### If using standard Flutter + AGP setup
- Enable minification as needed in release build type.
- Ensure Crashlytics Gradle plugin task runs on release build.
- Typical command flow:
  1. `flutter build appbundle --release`
  2. Upload to Play internal testing track
  3. Confirm deobfuscated crashes in Firebase console

### Important
- Keep Firebase keys/config in platform config, not in Dart source.
- Verify Crashlytics collection/consent behavior against your privacy policy.

## Verification checklist
- [ ] App starts with Firebase initialized on Android.
- [ ] Debug test crash reaches Crashlytics console.
- [ ] Release stack traces are symbolicated/deobfuscated.
- [ ] Privacy policy mentions crash diagnostics usage.
