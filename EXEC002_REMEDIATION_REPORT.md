# AI Console v1.4.2 EXEC002 Remediation Report

> **SUPERSEDED RUNTIME STATUS (25/08/2026):** A startup-blocking Hermes `TextDecoder('latin1')` defect was later confirmed in the distributed v1.4.2 APK and remediated in source. The failed APK is NO-GO. See `RUNTIME_ROOT_CAUSE_REMEDIATION_REPORT_25082026203650.md` and `VERIFICATION_STATUS.md` for current status.


Generated: 24/08/2026 Europe/London

## Baseline
- Source: AI_CONSOLE_V1_4_0_GITHUB_READY_24082026030600.zip
- Baseline source SHA-256: 17749d1f7f742e73f125a18681c774a3a24647bdde44b172c87039ea616c7b67
- Target release: AI Console v1.4.2, Android versionCode 11
- Package: com.nexarenew.aiconsole

## EXEC002 remediation applied
- Release identity advanced to v1.4.2 / versionCode 11.
- SYSTEM_ALERT_WINDOW blocked through Expo Android blockedPermissions.
- Persistent 5-attempt / 5-minute protected-settings PIN throttling added.
- CANCELLED offline turns made retryable and interrupted SENDING turns recovered to FAILED.
- Message deletion now recursively removes descendants, stale bookmarks, and stale branch selection.
- Active chat is strictly scoped to the active workspace; empty workspaces clear activeChatId.
- Base64 archive inputs are bounded before atob decoding.
- Residual message-count forced autoscroll effect removed; near-bottom tracking controls autoscroll.
- SHA-256 known-vector regression tests added.

## Previous APK audit finding disposition
| ID | Status | Disposition |
|---|---|---|
| APK-001 | RESOLVED ON NEW BUILD | New v1.4.2 binary supersedes stale v1.4.1 binary. |
| APK-002 | RESOLVED | v1.4.2 / versionCode 11. |
| APK-003 | PARTIAL | Preview APK remains debug-signed unless a stable production keystore is supplied. |
| APK-004 | RESOLVED | Light-only source/config baseline. |
| APK-005 | RESOLVED | PIN KDF v2 uses 600,000 PBKDF2-HMAC-SHA256 iterations with migration. |
| APK-006 | RESOLVED | Persistent 5 failures / 5-minute lockout. |
| APK-007 | RESOLVED | SYSTEM_ALERT_WINDOW blocked. |
| APK-008 | ACCEPTED | Legacy external-storage permissions are dependency/older-Android compatibility surface and are not removed without runtime proof. |
| APK-009 | RESOLVED | Typed missing/corrupt/read-failed state recovery with previous-state fallback. |
| APK-010 | RESOLVED | Durable writes/read-back verification and surfaced save failure paths. |
| APK-011 | RESOLVED | Parent-lineage branch semantics. |
| APK-012 | RESOLVED | Regeneration uses target lineage. |
| APK-013 | RESOLVED | Recursive descendant deletion added in this EXEC002 pass. |
| APK-014 | RESOLVED | Workspace-scoped active-chat selection fixed in this EXEC002 pass. |
| APK-015 | RESOLVED | Offline attachment metadata/reattach workflow retained by current source. |
| APK-016 | RESOLVED | Project AI configuration persistence retained by current source. |
| APK-017 | RESOLVED | Revision retention is per document. |
| APK-018 | RESOLVED | Restore creates checkpoint and restored-state revision lineage. |
| APK-019 | RESOLVED | Project archives use SHA-256. |
| APK-020 | RESOLVED | Document archives use SHA-256. |
| APK-021 | RESOLVED | Raw ZIP preflight, entry allowlist, expansion and ratio limits. |
| APK-022 | RESOLVED | Encoded-size bound before atob added in this EXEC002 pass. |
| APK-023 | RESOLVED | Privacy scanning is based on prohibited keys/paths rather than arbitrary benign values. |
| APK-024 | RESOLVED | Forced message-count autoscroll removed in this EXEC002 pass. |
| APK-025 | PARTIAL | APK size/ABI optimisation is a packaging optimisation, not a functional blocker. |
| APK-026 | UNVERIFIABLE LOCALLY | Android 16 runtime process-survival requires emulator/device execution. |
| APK-027 | RESOLVED ON NEW BUILD | Requires successful v1.4.2 APK generation from this exact source. |

## Local verification
- tests/exec002Remediation.test.mjs: PASS, 6/6, zero skipped.
- scripts/static-check.mjs: PASS.
- scripts/ci-version-guard.mjs: PASS with expected guarded native speech compatibility warning.
- scripts/verify-runtime-contract.mjs: PASS.
- Clean npm ci/full suite/prebuild/Gradle: UNVERIFIABLE in local sandbox because registry.npmjs.org returns EAI_AGAIN.

## Release classification before remote build
**PARTIAL** — source remediation and targeted regression gates pass; clean dependency restore and APK generation must complete on a networked runner before PASS.
