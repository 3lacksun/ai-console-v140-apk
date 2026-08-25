# AI Console v1.4.2

AI Console v1.4.2 is the EXEC002 maintenance release implementing the v1.4.0 feature-lock baseline while superseding the older v1.4.1 preview APK.

AI Console is an Android-first Expo 57 / React Native 0.86 application with four first-class domains: **Chats, Workspaces, Documents and Settings**, including the full **Document Studio Pro** workflow. This repository is prepared for a GitHub Actions APK build using Expo Continuous Native Generation (CNG): native `android/` and `ios/` directories are generated in CI and are intentionally not committed.

## GitHub readiness

**Repository status: READY FOR GITHUB — APK BUILD NOT VERIFIED**

Updated after release-gate remediation on 25/08/2026 21:25:35 BST. The exact audited v1.4.2 baseline and hotfix were composed and remediated before repository hardening. Local source/static verification passes; clean dependency restoration, Expo prebuild, Gradle APK compilation, Android runtime, physical accessibility and production signing remain CI/device evidence gates and are not claimed as PASS.

### Repository identity

- App: **AI Console**
- Version: **1.4.2**
- Android package: `com.nexarenew.aiconsole`
- Android `versionCode`: **11**
- Expo: **57**
- React Native: **0.86.2**
- Node in CI: **24**
- Java in CI: **17 / Temurin**
- Runner: **ubuntu-24.04**
- Appearance: **light only**

## First GitHub build

1. Extract the repository ZIP so `package.json`, `app.json`, `App.js` and `.github/` are at repository root.
2. Commit and push the extracted files to the repository's `main` branch.
3. GitHub Actions runs `.github/workflows/android-apk.yml` automatically on push/PR, or it can be started with **workflow_dispatch**.
4. For a publishable preview candidate use `signing_mode=preview` and keep `run_emulator_checks=true` (the default).
5. Download the `AI_Console_v1.4.2_preview-debug-signed` Actions artefact only after the same workflow run passes both runtime gates **and both positive real-app UI readiness gates**.
6. A manual run may set `run_emulator_checks=false` only for build diagnostics; that mode deliberately does not publish an APK artefact.

## CI gates

The workflow performs exact lockfile installation, production dependency audit, source/static tests, the full zero-skip Node test suite, SDK/package drift checks, pinned Expo Doctor, Android bundle export, clean Expo prebuild, Gradle APK build, APK/package inspection, signer verification, 16-KB ZIP/ELF alignment, mandatory-for-publication Android 16 runtime survival + positive app-ready UI evidence and dedicated 16-KB runtime survival + positive app-ready UI evidence.

GitHub Actions dependencies are pinned to immutable full commit SHAs. Workflow permissions are `contents: read`.

### Preview versus production

Preview mode builds `app:assembleDebug` and requires Android Debug signer evidence. Production mode builds `app:assembleRelease` and requires these GitHub Actions secrets:

- `AI_CONSOLE_ANDROID_KEYSTORE_BASE64`
- `AI_CONSOLE_ANDROID_KEYSTORE_PASSWORD`
- `AI_CONSOLE_ANDROID_KEY_ALIAS`
- `AI_CONSOLE_ANDROID_KEY_PASSWORD`
- `AI_CONSOLE_ANDROID_CERT_SHA256`

Production mode fails closed if any required secret is absent or the resulting signer certificate SHA-256 differs from the authorised certificate.

## APK build-path policy

`npm run build:apk` is intentionally fail-closed and exits non-zero. Publishable APKs must come from `.github/workflows/android-apk.yml` with runtime checks enabled. `npm run build:apk:diagnostic` is EAS diagnostic-only and its output is not release evidence.

## Local verification

With dependencies installed from `package-lock.json`:

```bash
npm ci
npm run check
npm test
node scripts/ci-version-guard.mjs
node scripts/verify-runtime-contract.mjs
npx expo install --check
npx --yes expo-doctor@1.20.2
```

In the current execution environment, clean registry dependency restoration still has not been established. The complete locally executable Node suite nevertheless passes **79/79 with zero skips** when the exact locked `jszip 3.10.1` dependency is supplied from the preinstalled local toolchain. That temporary test-resolution path is not packaged as `node_modules` and is not represented as a clean `npm ci` PASS.

## Documentation

- `docs/AI_CONSOLE_V1_4_0_FULL_BUILD_SPECIFICATION.md`
- `docs/AI_CONSOLE_V1_4_0_FULL_FEATURE_LOCK.md`
- `docs/AI_CONSOLE_V1_4_0_TECHNICAL_SPECIFICATION.md`
- `docs/BUILDING.md`
- `docs/RELEASING.md`
- `VERIFICATION_STATUS.md`
- `REMEDIATION_REPORT.md`

## Repository hygiene

Generated native trees, `node_modules/`, Expo caches, CI diagnostics, build outputs, APK/AAB files, keystores, private keys and `.env` files are excluded by `.gitignore`. No production credentials are included in this repository package.

No `LICENSE` or `CODEOWNERS` file has been invented because no repository licence or ownership identities were authorised. Add those only when the repository owner chooses them.
