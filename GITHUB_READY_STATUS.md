# AI Console v1.4.0 — GitHub Repository Readiness

Prepared: 24/08/2026

## Repository-root contract

This package is intended to be extracted directly into the root of the GitHub repository.

Required GitHub build inputs are present, including `package.json`, `package-lock.json`, `index.js`, `App.js`, `app.json`, assets, tests, verification scripts, and `.github/workflows/android-apk.yml`.

## GitHub Actions workflow

The Android workflow:

- supports push, pull request, and manual dispatch;
- installs exact npm dependencies with `npm ci`;
- runs static checks and the full zero-skip test suite;
- verifies Expo package alignment and runtime contracts;
- runs Expo dependency/doctor and Metro export checks;
- prebuilds Android and verifies generated compile/target SDK 36 configuration;
- builds a preview debug-signed APK by default;
- supports production signing only when the required GitHub Secrets are configured;
- verifies APK package/version, embedded JS/Hermes payload, signing, ZIP alignment and native ELF 16-KB alignment;
- optionally runs Android 16/API 36 and dedicated 16-KB emulator process-survival gates;
- uploads the APK and diagnostics as GitHub Actions artefacts.

All external GitHub Action references are pinned to immutable 40-character commit SHAs.

## Local preparation evidence

- `scripts/ci-version-guard.mjs`: PASS
- `scripts/static-check.mjs`: PASS
- `scripts/verify-runtime-contract.mjs`: PASS
- workflow YAML parse: PASS
- immutable GitHub Action pin check: PASS
- forbidden secret/keystore/local.properties package scan: PASS
- focused post-remediation regression slice previously executed: 35/35 PASS, 0 skipped
- clean `npm ci` in the current sandbox: UNVERIFIABLE because registry restoration did not complete within the execution window

The GitHub workflow therefore remains the authoritative clean dependency/build environment. A successful workflow run is required before claiming APK/runtime/release PASS.

## Production signing secrets

For `signing_mode=production`, configure these GitHub Actions secrets:

- `AI_CONSOLE_ANDROID_KEYSTORE_BASE64`
- `AI_CONSOLE_ANDROID_KEYSTORE_PASSWORD`
- `AI_CONSOLE_ANDROID_KEY_ALIAS`
- `AI_CONSOLE_ANDROID_KEY_PASSWORD`
- `AI_CONSOLE_ANDROID_CERT_SHA256`

Do not commit the keystore or these values to the repository.
