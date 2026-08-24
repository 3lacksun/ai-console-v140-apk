# Building AI Console v1.4.0

## Build model

AI Console is an Expo SDK 57 / React Native 0.86 project using **Continuous Native Generation (Expo Prebuild)**. The `android/` directory is generated from the checked-in Expo configuration and is intentionally excluded from the repository.

## Controlled project inputs

- Node.js: 24 in GitHub Actions
- Java: 17 (Temurin) in GitHub Actions
- Android compile/target validation: API 36 after Expo Prebuild
- Android Build Tools: 36.0.0 in GitHub Actions
- npm lockfile: `package-lock.json`
- Application ID: `com.nexarenew.aiconsole`
- Expo app version: `1.4.0`
- Android versionCode: `9`

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

## Preview APK

The preview path deliberately uses Gradle's debug variant so its signing state is deterministic and does not depend on production secrets:

```bash
cd android
./gradlew app:assembleDebug --no-daemon --max-workers=2
```

Expected output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

GitHub CI publishes it as `AI_Console_v1.4.0_preview-debug-signed.apk` after verifying that the APK exposes Android Debug signer evidence.

## Production APK

Production uses the release variant only after the authorised keystore has been reconstructed in runner temporary storage and the generated Gradle project has been configured for release signing:

```bash
cd android
./gradlew app:assembleRelease --no-daemon --max-workers=2
```

Expected output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Production CI additionally verifies the certificate SHA-256 against `AI_CONSOLE_ANDROID_CERT_SHA256`. Never commit a production keystore or signing password.

## Android 16 and 16-KB acceptance

The workflow intentionally treats these as two separate runtime gates:

1. **Android 16/API 36 cold launch** — `system-images;android-36;google_apis;x86_64`, requiring API level 36, successful install/start, 30-second process survival and no fatal startup log evidence.
2. **Dedicated 16-KB runtime** — `system-images;android-35;google_apis_ps16k;x86_64`, requiring `adb shell getconf PAGE_SIZE` to return `16384`, successful install/start and process survival.

Before either runtime gate, CI also checks APK ZIP alignment with `zipalign -c -P 16 -v 4` and checks 64-bit native ELF LOAD alignment.

## GitHub build

Use `.github/workflows/android-apk.yml`. The source ZIP is intended to be extracted directly at repository root. No pre-generated `android/`, `node_modules/`, APK or signing material is required in Git.
