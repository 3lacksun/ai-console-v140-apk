# AI Console v1.4.0 — EXEC002 GitHub Readiness Remediation Report

> **SUPERSEDED RUNTIME STATUS (25/08/2026):** A startup-blocking Hermes `TextDecoder('latin1')` defect was later confirmed in the distributed v1.4.2 APK and remediated in source. The failed APK is NO-GO. See `RUNTIME_ROOT_CAUSE_REMEDIATION_REPORT_25082026203650.md` and `VERIFICATION_STATUS.md` for current status.


Generated: 24/08/2026 03:01:41 BST

## Authoritative remediation input

The working tree was composed from the exact two archives audited on 24 August 2026. The received archives were preserved unchanged.

- Baseline: `AI_CONSOLE_V1_4_0_GITHUB_CI_HOTFIX_STREAM_CLEANUP_23082026232200.zip`  
  SHA-256: `64ac622862b3f22a9826582b955a35824341ef5f8e53e825e803f138f67fe72b`
- Overlay: `AI_CONSOLE_CI_LATEST_HOTFIX_FILES_24082026004500.zip`  
  SHA-256: `85f33226150bd4a6c25c11e4648ba26d75f4119ac02d955be923d449689c4c0d`

Pre-remediation composition reproduced the audit failure state: 54 tests discovered, 51 passing and 3 failing, including the deterministic startup/hotfix mismatches and unavailable JSZip dependency.

## Source remediation completed

The candidate contains root-cause remediation across startup containment, speech-module loading, hydration/corruption recovery, automatic-write suppression during degraded recovery, durable persistence/read-back, workspace/chat schema preservation, parent-message branch lineage, retry semantics, offline queue state, transactional imports, recursive privacy sanitisation, property-path secret detection, bounded ZIP/PDF processing, per-document revision retention and restore, generation lifecycle integration, scoped destructive operations, Markdown preservation, PIN KDF/throttling, real bounded media payload handling, prompt scope/roles, light-only failure surfaces, SHA-256 archive integrity and Document Studio templates/responsive metadata.

## GitHub repository remediation completed

- Added/updated `.gitignore`, `.gitattributes`, `.editorconfig`, Dependabot configuration, pull-request template, `SECURITY.md`, build/release documentation and repository verification evidence.
- Kept Expo CNG native directories generated rather than committed.
- Pinned all external GitHub Actions used by the APK workflow to immutable full commit SHAs.
- Fixed runner to `ubuntu-24.04`, Node 24 and Java 17.
- Added blocking production dependency audit, zero-skip tests, runtime-contract verification, Expo package drift check and pinned Expo Doctor.
- Changed clean CNG generation to `npx expo prebuild --platform android --clean --no-install` with `EXPO_NO_GIT_STATUS=1`.
- Corrected preview build identity: preview uses `app:assembleDebug` and Android Debug signer verification; production uses `app:assembleRelease` and authorised certificate SHA-256 verification.
- Split Android runtime evidence into an Android 16/API-36 cold-launch gate and a dedicated Android-15 `google_apis_ps16k` 16-KB page-size/launch gate.
- Retained APK ZIP alignment and packaged 64-bit ELF load-alignment gates.
- Reduced failure diagnostics to selected generated Android configuration/log evidence rather than repackaging the full generated Android tree or duplicating the APK.
- Reconciled v1.4.0 specifications from stale planning-only wording to authoritative-target wording and removed the superseded dark-mode requirement.
- Removed the stale embedded Master Rules v1.2.12 snapshot so it cannot override or be mistaken for current Library authority.

## Verification result

Static check, workflow YAML parse, version guard and runtime-contract verification PASS. All tests that can execute with the currently present dependencies PASS **54/54 with zero skips**. The full suite remains locally UNVERIFIABLE because the sandbox cannot restore the exact lockfile JSZip dependency; that test remains mandatory in GitHub and has not been skipped or weakened.

No APK, GitHub Actions run, production signature, emulator launch or physical-device test was fabricated or inferred.
