# Releasing AI Console v1.4.2

## Preview APK

Run the **AI Console Android APK CI** workflow with:

- `signing_mode`: `preview`
- `run_emulator_checks`: `true` (default; required for APK artefact publication)

The workflow builds `app:assembleDebug`, verifies Android Debug signer evidence and uploads `AI_Console_v1.4.2_preview-debug-signed.apk` only after the Android runtime acceptance gates pass. Diagnostics are retained even when the runtime gates fail or are intentionally disabled.

APK publication requires the runtime gates to execute in the same candidate workflow. `run_emulator_checks: true` is the default and performs two independent runtime checks: Android 16/API 36 cold-launch survival and the dedicated Android 15 `google_apis_ps16k` 16-KB runtime gate. Setting it to false is diagnostic-only and blocks APK artefact publication.

## Production APK

Production mode is deliberately blocked unless all of these GitHub Secrets are configured:

- `AI_CONSOLE_ANDROID_KEYSTORE_BASE64`
- `AI_CONSOLE_ANDROID_KEYSTORE_PASSWORD`
- `AI_CONSOLE_ANDROID_KEY_ALIAS`
- `AI_CONSOLE_ANDROID_KEY_PASSWORD`
- `AI_CONSOLE_ANDROID_CERT_SHA256`

The workflow reconstructs the keystore only in runner temporary storage, configures release signing after Expo Prebuild, runs `app:assembleRelease`, rejects Android Debug signing, and verifies the resulting certificate digest against the authorised SHA-256. Production signing material must never be committed to the repository or included in project ZIPs.

## Release evidence

For an acceptance run retain at least:

- the labelled APK Actions artefact;
- APK metadata and SHA-256 diagnostics;
- `apksigner` certificate evidence;
- `zipalign -P 16` evidence;
- native ELF alignment evidence;
- Android 16/API-36 install/start/process-survival **and positive app-ready UI** logs for every published APK candidate;
- dedicated 16-KB page-size/install/start/process-survival **and positive app-ready UI** logs for every published APK candidate;
- npm/static/test/Expo validation output from the same workflow run.

## Release acceptance

A source package being **READY FOR GITHUB — APK BUILD NOT VERIFIED** means repository engineering and locally available source/package verification are complete, but it does not claim a GitHub-hosted APK was built. APK build, signing, emulator and physical-device results become PASS only from their actual execution evidence.

## Build-path policy

A publishable APK must come from `.github/workflows/android-apk.yml` and must record both process-survival and positive UI readiness for the same APK. `npm run build:apk` intentionally refuses to create an APK. `npm run build:apk:diagnostic` may create an EAS diagnostic build, but that output is not release evidence and must not be promoted.
