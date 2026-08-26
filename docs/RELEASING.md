# Releasing Command Centre v1.5.5

## Preview APK

Run the **AI Console Android APK CI** workflow with:

- `signing_mode`: `preview`

The workflow runs Expo prebuild, `app:assembleRelease` with debug signing in preview mode, verifies an embedded JS/Hermes bundle, and uploads `CommandCentre_v1.5.5_preview-debug-signed.apk`. Diagnostics are retained even when the build fails.

## Production APK

Production mode is deliberately blocked unless all of these GitHub Secrets are configured:

- `AI_CONSOLE_ANDROID_KEYSTORE_BASE64`
- `AI_CONSOLE_ANDROID_KEYSTORE_PASSWORD`
- `AI_CONSOLE_ANDROID_KEY_ALIAS`
- `AI_CONSOLE_ANDROID_KEY_PASSWORD`
- `AI_CONSOLE_ANDROID_CERT_SHA256`

The workflow reconstructs the keystore only in runner temporary storage, configures release signing after Expo Prebuild, runs `app:assembleRelease`, and fails closed if required secrets are missing. Production signing material must never be committed to the repository or included in project ZIPs.

## Release acceptance

A source package being **READY FOR GITHUB — APK BUILD NOT VERIFIED** means repository engineering and locally available source/package verification are complete, but it does not claim a GitHub-hosted APK was built. APK build, signing and physical-device results become PASS only from their actual execution evidence.

## Build-path policy

A publishable APK must come from `.github/workflows/android-apk.yml`. `npm run build:apk` intentionally refuses to create an APK. `npm run build:apk:diagnostic` may create an EAS diagnostic build, but that output is not release evidence and must not be promoted.
