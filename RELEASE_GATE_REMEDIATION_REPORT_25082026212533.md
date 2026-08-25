# AI Console v1.4.2 — Release-Gate Remediation Report

Generated: 25/08/2026 21:25:34 BST

## Baseline

- Input: `AI_CONSOLE_V1_4_2_RUNTIME_CRASH_REMEDIATED_SOURCE_25082026203650.zip`
- Input SHA-256: `9ff6141fa0bd4f6e63594498fc780b028bc6eb39997eac60999d791567783e3e`
- Previous audit release verdict: NO-GO.
- Remediation scope: DEFECT-006, DEFECT-007 and DEFECT-008, preserving the already-remediated DEFECT-005 startup fix.

## DEFECT-006 — Positive real-app readiness

**Resolved in source.**

- The real application renders a current-release marker: `AI Console v1.4.2`.
- Both Android emulator gates now collect a current `uiautomator` window dump after launch.
- `scripts/verify-app-ready-ui.mjs` accepts only the real-app marker and rejects both recovery-shell texts.
- The Android 16 gate must emit `ANDROID_16_APP_READY=PASS`.
- The dedicated 16-KB gate must emit `ANDROID_16K_APP_READY=PASS`.
- The final release acceptance gate requires both UI-ready statuses in addition to process-survival/page-size evidence.
- Executable unit coverage confirms ready/recovery/loading classifications.

This removes the prior false-positive path where a live process displaying a recovery shell could be treated as a successful application launch.

## DEFECT-007 — Alternate unverified APK route

**Resolved in source.**

- `npm run build:apk` now invokes `scripts/build-apk-policy.mjs` and exits non-zero with `BUILD_APK_RELEASE_GATE=BLOCKED`.
- EAS remains only as `npm run build:apk:diagnostic` using the `diagnostic-preview` profile.
- `eas.json` no longer defines a release/production EAS profile that could be confused with the GitHub runtime-accepted APK path.
- Documentation explicitly forbids promotion of diagnostic EAS outputs.

## DEFECT-008 — Release identity drift

**Resolved in source.**

- User-visible release label is `AI Console v1.4.2`.
- `docs/BUILDING.md` now identifies v1.4.2, versionCode 11 and v1.4.2 APK naming.
- Regression tests reject reintroduction of v1.4.0 release identity in current build guidance/UI.
- The v1.4.0 Build Specification / Feature Lock / Technical Specification filenames remain intentionally unchanged because they are the controlling v1.4.0 feature baseline implemented by the v1.4.2 maintenance release.

## Verification actually executed

- `npm run check`: PASS.
- `node scripts/ci-version-guard.mjs`: PASS.
- `node scripts/verify-runtime-contract.mjs`: PASS.
- GitHub workflow YAML parse: PASS.
- `npm test`: 79/79 PASS, 0 skipped, using exact jszip 3.10.1 from the preinstalled local toolchain via a temporary test-only resolution symlink.
- `npm run build:apk`: expected FAIL-CLOSED; exit code 1 with `BUILD_APK_RELEASE_GATE=BLOCKED`.

## Not executed / external

- Clean `npm ci` from registry/cache: NOT_EXECUTED in this remediation pass; prior environment remained incomplete.
- `npm audit`, Expo install check, Expo Doctor, Expo export/prebuild: NOT EXECUTED after clean dependency restore.
- Gradle APK build: NOT EXECUTED.
- Android emulator runtime gates: NOT EXECUTED.
- Fresh APK package/signing/alignment forensics: NOT EXECUTED.
- Physical-device/TalkBack/camera/microphone/OpenRouter acceptance: UNVERIFIABLE HERE.

## Verdict

- DEFECT-005: RESOLVED_VERIFIED_IN_SOURCE.
- DEFECT-006: RESOLVED_VERIFIED_IN_SOURCE.
- DEFECT-007: RESOLVED_VERIFIED_IN_SOURCE.
- DEFECT-008: RESOLVED_VERIFIED_IN_SOURCE.
- Previous broken APK: NO-GO.
- Remediated source: READY FOR GITHUB REBUILD.
- Fresh APK release readiness: UNVERIFIABLE until the mandatory build + runtime + package gates execute.
