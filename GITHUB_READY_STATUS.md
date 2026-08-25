# AI Console v1.4.2 — GitHub Rebuild Readiness

Updated: 25/08/2026 21:25:35 BST

## Current decision

**READY FOR GITHUB REBUILD — DEFECT-006/007/008 REMEDIATED IN SOURCE — FRESH APK RUNTIME VERIFICATION REQUIRED.**

The previously distributed v1.4.2 APK is not an acceptable release candidate. Its Hermes startup path evaluated `new TextDecoder('latin1')` during module import, causing the confirmed Android startup failure. The source has now been remediated to use deterministic byte-preserving decoding without `TextDecoder('latin1')`.

## Remediation completed

- Removed the Hermes-unsupported `TextDecoder('latin1')` constructor from `src/documents/pdfTextExtract.mjs`.
- Added an executable regression test that verifies both absence of the unsupported constructor and exact byte-to-codepoint mapping for `0x00`, `0x80` and `0xFF`.
- Changed Android CI so runtime emulator checks default on for push/PR and manual release-candidate runs.
- Added release runtime acceptance that requires process survival **and positive real-app UI readiness** on both Android 16/API-36 and the dedicated 16-KB emulator. Recovery shells explicitly fail the gate.
- Changed APK artefact publication to fail closed when runtime checks are disabled, fail, or do not expose the real-app `AI Console v1.4.2` readiness marker.
- Corrected release/build/handover documentation that previously encouraged a first build with runtime checks disabled.
- `npm run build:apk` now fails closed; EAS remains available only as the explicitly non-release `build:apk:diagnostic` path.
- Reconciled current user-facing build identity to v1.4.2 / versionCode 11.

## Local verification

- `npm run check`: **PASS**.
- Full Node test suite with the exact `jszip 3.10.1` test dependency supplied from the preinstalled local toolchain: **79/79 PASS, 0 skipped**.
- Dedicated startup-resilience tests: **6/6 PASS**.
- Startup-sensitive API scan after remediation: no `TextDecoder('latin1')` remains; remaining module-scope decoder usage is UTF-8.
- Clean `npm ci`: **NOT_EXECUTABLE_HERE / ENVIRONMENT BLOCKED** because registry restoration did not complete in the available execution window. The interrupted install must not be treated as a clean dependency-verification PASS.
- Expo export / clean prebuild / Gradle APK build: **NOT_EXECUTED** locally because the clean dependency environment was not established.

## Release rule

A newly built APK is not accepted merely because Gradle, signing, ZIP alignment, static tests or process survival pass. The same candidate must complete the Android 16/API-36 and dedicated 16-KB gates **and** expose the real-app `AI Console v1.4.2` UI marker while neither recovery shell is present before the workflow publishes the APK artefact.

Production signing remains separately gated by the authorised GitHub Secrets and certificate SHA-256 verification.
