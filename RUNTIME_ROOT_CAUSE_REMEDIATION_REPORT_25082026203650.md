# AI Console v1.4.2 — Runtime Root-Cause Remediation Report

Generated: 25/08/2026 20:36:50 BST

## Baseline

- Input: `AI_CONSOLE_V1_4_2_EXEC002_REMEDIATED_SOURCE_24082026230300.zip`
- Input SHA-256: `e2c8e6d6e26f822041d6549c2f53dcfc38d9ceb7f2f422c1f30bd56f52771cf7`
- Failed distributed APK: v1.4.2 / versionCode 11 / `com.nexarenew.aiconsole`

## Confirmed root cause

`App.js` imports `src/documents/localPdfAdapter.js`, which imports `src/documents/pdfTextExtract.mjs`. The latter created `new TextDecoder('latin1')` at module scope. On the Android Hermes runtime this unsupported encoding throws during application-module evaluation, preventing normal startup.

## Remediation

1. Replaced module-scope `TextDecoder('latin1')` with a deterministic chunked byte-to-codepoint decoder.
2. Added a regression test that rejects reintroduction of the unsupported constructor and verifies exact byte preservation.
3. Changed CI runtime checks to default on for push/PR and release-candidate manual runs.
4. Added a release runtime acceptance gate requiring both API-36 and 16-KB process-survival evidence.
5. Blocked APK artefact publication when runtime gates are disabled or fail.
6. Corrected current release/build/handover documentation that described runtime gates as optional.

## Verification executed here

- `npm run check`: PASS.
- Dedicated startup-resilience suite: 6/6 PASS.
- Full test suite with exact `jszip 3.10.1` supplied from the preinstalled local toolchain: 75/75 PASS, 0 skipped.
- Direct startup-sensitive source scan: no `TextDecoder('latin1')` remains.

## Verification not executable here

- Clean `npm ci` did not complete within the execution environment; offline retry proved at least `zod-3.25.76.tgz` was absent from cache.
- Therefore dependency-tree certification, Expo export/prebuild, Gradle build, emulator launch and physical-device verification are not claimed PASS.

## Release verdict

- Original failed APK: **NO-GO**.
- Remediated source: **LOCALLY VERIFIED FOR THE EXECUTED STATIC/UNIT SCOPE**.
- Fresh APK: **UNVERIFIABLE until rebuilt and the mandatory runtime gates execute against that exact candidate**.
