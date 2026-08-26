# Dr Stone's Command Centre v1.5.5

Command Centre v1.5.5 is the current GitHub APK line. It retains the v1.4.x feature-lock baseline (Chats, Workspaces, Documents, Settings and Document Studio Pro) under the Command Centre product identity.

AI Console is an Android-first Expo 57 / React Native 0.86 application with four first-class domains: **Chats, Workspaces, Documents and Settings**, including the full **Document Studio Pro** workflow. This repository is prepared for a GitHub Actions APK build using Expo Continuous Native Generation (CNG): native `android/` and `ios/` directories are generated in CI and are intentionally not committed.

## GitHub readiness

**Repository status: READY FOR GITHUB — APK BUILD NOT VERIFIED**

Updated 26/08/2026 for Command Centre v1.5.5 identity alignment. Local source/static verification is the gate for this push; Expo prebuild and Gradle APK compilation remain CI evidence. Physical-device acceptance and production signing remain separate external gates.

### Repository identity

- App: **Dr Stone's Command Centre**
- Version: **1.5.5**
- Android package: `com.nexarenew.aiconsole`
- Android `versionCode`: **20**
- Expo: **57**
- React Native: **0.86.2**
- Node in CI: **24**
- Java in CI: **17 / Temurin**
- Runner: **ubuntu-24.04**
- Appearance: **automatic (light/dark)**

## First GitHub build

1. Extract the repository ZIP so `package.json`, `app.json`, `App.js` and `.github/` are at repository root.
2. Commit and push the extracted files to the repository's `main` branch.
3. GitHub Actions runs `.github/workflows/android-apk.yml` automatically on push/PR, or it can be started with **workflow_dispatch**.
4. For a preview candidate use `signing_mode=preview` (the default on push).
5. Download the `CommandCentre_v1.5.5_preview-debug-signed` Actions artefact after Expo prebuild, `app:assembleRelease` and embedded-JS verification succeed.
6. Production signing remains fail-closed unless the authorised GitHub Secrets are present.

## CI gates

The workflow performs npm install, Expo prebuild, Gradle `app:assembleRelease`, embedded JS/Hermes verification and artefact upload. Production signing fails closed without the authorised GitHub Secrets.

GitHub Actions dependencies are pinned to immutable full commit SHAs. Workflow permissions are `contents: read`.

## Local verification

```bash
npm install --no-fund --legacy-peer-deps
npm run check
npm test
node scripts/ci-version-guard.mjs
node scripts/verify-runtime-contract.mjs
```

## Documentation

- `docs/BUILDING.md`
- `docs/RELEASING.md`
