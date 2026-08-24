# AI Console v1.4.0

AI Console is an Android-first Expo 57 / React Native 0.86 application with four first-class domains: **Chats, Workspaces, Documents and Settings**, including the full **Document Studio Pro** workflow. This repository is prepared for a GitHub Actions APK build using Expo Continuous Native Generation (CNG): native `android/` and `ios/` directories are generated in CI and are intentionally not committed.

## GitHub readiness

**Repository status: READY FOR GITHUB — APK BUILD NOT VERIFIED**

Prepared under EXEC002 on 24/08/2026 03:01:41 BST. The exact audited v1.4.0 baseline and hotfix were composed and remediated before repository hardening. Local source/static verification passes; clean dependency restoration, Expo prebuild, Gradle APK compilation, Android runtime, physical accessibility and production signing remain CI/device evidence gates and are not claimed as PASS.

### Repository identity

- App: **AI Console**
- Version: **1.4.0**
- Android package: `com.nexarenew.aiconsole`
- Android `versionCode`: **9**
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
4. For the first manual build use `signing_mode=preview` and `run_emulator_checks=false`.
5. Download the `AI_Console_v1.4.0_preview-debug-signed` Actions artefact after the workflow succeeds.
6. After APK generation is proven, run again with `run_emulator_checks=true` to execute Android 16/API-36 cold-launch and dedicated 16-KB runtime gates.

## CI gates

The workflow performs exact lockfile installation, production dependency audit, source/static tests, the full zero-skip Node test suite, SDK/package drift checks, pinned Expo Doctor, Android bundle export, clean Expo prebuild, Gradle APK build, APK/package inspection, signer verification, 16-KB ZIP/ELF alignment, optional Android 16 runtime survival and optional dedicated 16-KB runtime survival.

GitHub Actions dependencies are pinned to immutable full commit SHAs. Workflow permissions are `contents: read`.

### Preview versus production

Preview mode builds `app:assembleDebug` and requires Android Debug signer evidence. Production mode builds `app:assembleRelease` and requires these GitHub Actions secrets:

- `AI_CONSOLE_ANDROID_KEYSTORE_BASE64`
- `AI_CONSOLE_ANDROID_KEYSTORE_PASSWORD`
- `AI_CONSOLE_ANDROID_KEY_ALIAS`
- `AI_CONSOLE_ANDROID_KEY_PASSWORD`
- `AI_CONSOLE_ANDROID_CERT_SHA256`

Production mode fails closed if any required secret is absent or the resulting signer certificate SHA-256 differs from the authorised certificate.

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

In the current execution environment, registry dependency restoration could not complete. All locally executable tests not requiring the missing JSZip installation pass **54/54 with zero skips**. The release-critical JSZip test remains enabled and is executed normally by GitHub after `npm ci`; it has not been weakened or skipped.

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
