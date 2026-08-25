# AI Console v1.4.2 — Release-Gate Remediation Continuation Prompt

Continue from `AI_CONSOLE_V1_4_2_RELEASE_GATE_REMEDIATED_SOURCE_25082026212533.zip`. Do not use the previously distributed v1.4.2 APK as an accepted baseline; it remains NO-GO.

Before substantive work, retrieve/read the current `/Master Documents/MASTER_LLM_OPERATING_RULES.md`.

## Current verified source state

- The Hermes startup defect caused by `TextDecoder('latin1')` is removed and regression guarded.
- Audit DEFECT-006 is remediated in source: Android runtime acceptance now requires positive UI evidence from the real application, not only PID survival/no fatal log. Both emulator targets must produce the real-app marker and must not display either recovery shell.
- Audit DEFECT-007 is remediated in source: `npm run build:apk` fails closed; EAS is retained only as the explicitly diagnostic `npm run build:apk:diagnostic` path.
- Audit DEFECT-008 is remediated in source: current release guidance/UI identity is v1.4.2 / versionCode 11.
- Local source verification: `npm run check` PASS, `node scripts/ci-version-guard.mjs` PASS, `node scripts/verify-runtime-contract.mjs` PASS, workflow YAML parse PASS, full locally executable test suite 79/79 PASS with zero skips when exact jszip 3.10.1 is supplied from the preinstalled local toolchain.
- Clean `npm ci`, Expo validation/prebuild, Gradle build, emulator execution, fresh APK package forensics and physical-device/provider acceptance remain unexecuted here.

## Required sequence

1. Verify this handover ZIP SHA-256 and embedded checksum manifest before changing source.
2. Extract directly at repository root.
3. Run clean `npm ci --no-fund`; then `npm audit --omit=dev --audit-level=high`.
4. Run `npm run check`, `npm test`, `node scripts/ci-version-guard.mjs`, `node scripts/verify-runtime-contract.mjs`, `npx expo install --check`, and pinned Expo Doctor. No release-critical skip is permitted.
5. Build the candidate only through `.github/workflows/android-apk.yml` with `run_emulator_checks=true`.
6. Require, for the same candidate APK:
   - `ANDROID_16_PROCESS_SURVIVAL=PASS`
   - `ANDROID_16_APP_READY=PASS`
   - `EMULATOR_PAGE_SIZE_16K=PASS`
   - `ANDROID_16K_PROCESS_SURVIVAL=PASS`
   - `ANDROID_16K_APP_READY=PASS`
   - `RELEASE_RUNTIME_ACCEPTANCE=PASS`
7. Confirm the UI-ready evidence came from `uiautomator` inspection using `scripts/verify-app-ready-ui.mjs`; process survival alone is insufficient.
8. Reject any candidate displaying `AI Console could not start safely` or `AI Console could not open this screen safely`.
9. Do not promote output from `npm run build:apk:diagnostic`; it is diagnostic-only.
10. Inspect the resulting APK identity, manifest/components, embedded Hermes payload, signing evidence, ZIP/ELF alignment and SHA-256.
11. Re-test the previous APK-only findings (FileProvider paths, hardware feature filtering, 16-KB native alignment, predictive-back configuration) against the fresh APK; do not mark them resolved merely because source changed.
12. Production signing requires only authorised secrets and signer-certificate SHA-256 verification.
13. Physical-device/provider checks remain separate external gates and cannot be inferred from emulator/static PASS.

## Locked identity

- Product: AI Console
- Version: 1.4.2
- Android package: `com.nexarenew.aiconsole`
- Android versionCode: 11
- Framework: Expo SDK 57 / React Native 0.86.2
- CI Node: 24
- Appearance: light only

Do not silently change package identity, feature locks, security architecture or signing identity merely to make CI pass.
