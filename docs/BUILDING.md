# Building Command Centre v1.5.5

## Build model

AI Console is an Expo SDK 57 / React Native 0.86 project using **Continuous Native Generation (Expo Prebuild)**. The `android/` directory is generated from the checked-in Expo configuration and is intentionally excluded from the repository.

## Controlled project inputs

- Node.js: 24 in GitHub Actions
- Java: 17 (Temurin) in GitHub Actions
- Android compile/target validation: API 36 after Expo Prebuild
- Android Build Tools: 36.0.0 in GitHub Actions
- npm lockfile: `package-lock.json`
- Application ID: `com.nexarenew.aiconsole`
- Expo app version: `1.5.5`
- Android versionCode: `24`

## Clean local verification

From the repository root:

```bash
npm ci --no-fund
npm audit --omit=dev --audit-level=high
npm run check
npm test
node scripts/ci-version-guard.mjs
node scripts/verify-runtime-contract.mjs
npx expo install --check
npx --yes expo-doctor@1.20.2
```

`npm test` is release-critical. The GitHub workflow fails if any test is skipped, including the JSZip-backed document/project archive tests.

## Native Android generation

Generate Android source exactly as CI does:

```bash
EXPO_NO_GIT_STATUS=1 npx expo prebuild --platform android --clean --no-install
```

Run this only after `npm ci` has restored the exact lockfile dependency tree.

## APK release-path policy

`npm run build:apk` is deliberately fail-closed. Publishable preview or production APKs must be built by `.github/workflows/android-apk.yml`. This prevents an EAS/local build from being mistaken for a release-accepted APK.

For build diagnostics only, `npm run build:apk:diagnostic` uses the EAS `diagnostic-preview` profile. Any APK produced by that command is **diagnostic only** and must not be published, promoted, or described as runtime-accepted.

## Preview APK

```bash
cd android
./gradlew app:assembleRelease --no-daemon --max-workers=2
```

GitHub CI publishes it as `CommandCentre_v1.5.5_preview-debug-signed.apk` after Expo prebuild, release assemble and embedded-JS verification.

## Production APK

```bash
cd android
./gradlew app:assembleRelease --no-daemon --max-workers=2
```

Expected output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Production CI additionally verifies the certificate SHA-256 against `AI_CONSOLE_ANDROID_CERT_SHA256`. Never commit a production keystore or signing password.

## GitHub build

Use `.github/workflows/android-apk.yml`. The source ZIP is intended to be extracted directly at repository root. No pre-generated `android/`, `node_modules/`, APK or signing material is required in Git.
