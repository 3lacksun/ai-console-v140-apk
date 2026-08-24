# AI Console v1.4.0 — GitHub-Ready Verification Status

Generated: 24/08/2026 03:01:41 BST

| Gate | Status | Current evidence |
|---|---:|---|
| Current Master Rules bootstrap | PASS | v1.2.14 / revision 20260823-02 used for this repository-preparation run. |
| Audited baseline SHA-256 | PASS | `64ac622862b3f22a9826582b955a35824341ef5f8e53e825e803f138f67fe72b` matched. |
| Audited hotfix SHA-256 | PASS | `85f33226150bd4a6c25c11e4648ba26d75f4119ac02d955be923d449689c4c0d` matched. |
| Input ZIP integrity/traversal checks | PASS | Both received inputs tested before composition. |
| GitHub repository-root structure | PASS | App, lockfile, workflow, scripts, tests, assets, specifications and repository support files present. |
| GitHub Action immutability | PASS | checkout/setup-node/setup-java/setup-android/upload-artifact use verified full commit SHAs. |
| Workflow permissions | PASS | `contents: read`. |
| Fixed hosted runner | PASS | `ubuntu-24.04`. |
| Workflow YAML parse | PASS | Current workflow parsed after final CI restructuring. |
| Static repository checks | PASS | `STATIC_CHECK: PASS`. |
| SDK/package version guard | PASS | `CI_VERSION_GUARD: PASS`; speech native compatibility remains a runtime gate. |
| Runtime contract verifier | PASS | `RUNTIME_CONTRACT: PASS`. |
| Locally executable test set | PASS | 54/54 PASS, 0 skipped, excluding only the package test file whose required `jszip` installation is absent locally. |
| Full zero-skip test suite | UNVERIFIABLE locally | The release-critical JSZip test intentionally fails to load when dependencies are not restored. GitHub runs it after `npm ci`. |
| Clean `npm ci` | UNVERIFIABLE locally | Registry resolution is unavailable/incomplete in this execution environment. |
| Production dependency audit | UNVERIFIABLE locally | Configured as a blocking GitHub Actions gate after `npm ci`. |
| Expo install check / pinned Expo Doctor | UNVERIFIABLE locally | Configured as blocking GitHub Actions gates. |
| Expo export / clean CNG prebuild | UNVERIFIABLE locally | Configured as blocking GitHub Actions gates. |
| Preview APK build | UNVERIFIABLE | Workflow now builds `assembleDebug`; no fresh GitHub run has occurred. |
| Production APK build/signing | UNVERIFIABLE | Workflow builds `assembleRelease` only with authorised GitHub Secrets and verifies signer SHA-256. |
| APK ZIP/ELF 16-KB alignment | UNVERIFIABLE | Blocking post-build gates configured; no APK built in this run. |
| Android 16 / API-36 cold launch | UNVERIFIABLE | Optional CI emulator gate uses `system-images;android-36;google_apis;x86_64`. |
| Dedicated 16-KB runtime | UNVERIFIABLE | Optional CI gate uses `system-images;android-35;google_apis_ps16k;x86_64` and requires `PAGE_SIZE=16384`. |
| Physical TalkBack/large-font/keyboard/rotation | UNVERIFIABLE | Requires real-device acceptance. |

## Decision

**READY FOR GITHUB — APK BUILD NOT VERIFIED.**

There is no known locally actionable repository-structure or CI-definition defect remaining from this pass. The remaining gates require dependency/network, GitHub Actions, Android emulator/device, signing secrets, or physical-device facilities. A GitHub workflow failure remains a failure to remediate; this status does not pre-approve the resulting APK.
