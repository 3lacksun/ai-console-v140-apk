# Releasing AI Console v1.4.0

## Preview APK

Run the **AI Console Android APK CI** workflow with:

- `signing_mode`: `preview`
- `run_emulator_checks`: `false` for the first build

The workflow builds `app:assembleDebug`, verifies Android Debug signer evidence and uploads `AI_Console_v1.4.0_preview-debug-signed.apk` plus diagnostics.

After the preview build succeeds, rerun manually with `run_emulator_checks: true`. That execution performs two independent runtime checks: Android 16/API 36 cold-launch survival and the dedicated Android 15 `google_apis_ps16k` 16-KB runtime gate.

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
- Android 16/API-36 install/start/process-survival logs when enabled;
- dedicated 16-KB page-size/install/start/process-survival logs when enabled;
- npm/static/test/Expo validation output from the same workflow run.

## Release acceptance

A source package being **READY FOR GITHUB — APK BUILD NOT VERIFIED** means repository engineering and locally available source/package verification are complete, but it does not claim a GitHub-hosted APK was built. APK build, signing, emulator and physical-device results become PASS only from their actual execution evidence.
