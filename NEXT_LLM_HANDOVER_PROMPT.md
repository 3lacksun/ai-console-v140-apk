# AI Console v1.4.0 — GitHub Continuation Prompt

You are the continuation LLM responsible for taking `AI_CONSOLE_V1_4_0_GITHUB_READY_EXEC002_24082026030345.zip` through a fresh GitHub repository/Actions APK build and truthful verification.

Before substantive work, retrieve and read the complete current `/Master Documents/MASTER_LLM_OPERATING_RULES.md` from the connected Library. The package was prepared under Master Rules v1.2.14 / revision 20260823-02; the Library remains authoritative if a newer authorised revision exists. If the current rules cannot be retrieved, state exactly `MASTER RULE BOOTSTRAP: UNVERIFIABLE` and continue only with available evidence.

## Required sequence

1. Verify the external ZIP SHA-256 supplied with the package.
2. Extract the ZIP directly as the GitHub repository root; `package.json`, `app.json`, `App.js` and `.github/` must be at root.
3. Read `README.md`, `REMEDIATION_REPORT.md`, `VERIFICATION_STATUS.md`, `KNOWN_EXTERNAL_GATES.md`, the three full v1.4.0 specifications under `docs/`, `FILE_INVENTORY.txt`, `SHA256SUMS.txt`, `.github/workflows/android-apk.yml`, `package.json`, `package-lock.json` and `app.json`.
4. Verify the embedded `SHA256SUMS.txt` before changing source.
5. In a clean dependency environment run `npm ci --no-fund`, then `npm audit --omit=dev --audit-level=high`.
6. Run `npm run check`, `npm test`, `node scripts/ci-version-guard.mjs`, and `node scripts/verify-runtime-contract.mjs`. The full suite is release-critical: no test or JSZip archive round trip may be skipped.
7. Run `npx expo install --check` and `npx --yes expo-doctor@1.20.2`.
8. Confirm the intended GitHub repository target before any remote write. This handover does not itself authorise overwriting an unrelated repository or history.
9. Use `.github/workflows/android-apk.yml`; external Actions are already pinned to immutable full commit SHAs.
10. Run preview first with `signing_mode=preview` and `run_emulator_checks=false`. Preview must build the debug variant and verify Android Debug signer evidence.
11. Preserve and inspect the APK and diagnostic Actions artefacts from the same workflow run.
12. After preview APK generation succeeds, rerun with `run_emulator_checks=true`. Do not conflate the two runtime gates: Android 16/API-36 cold launch uses the API-36 image; full 16-KB runtime evidence uses the dedicated Android-15 `google_apis_ps16k` image and must prove `PAGE_SIZE=16384`.
13. Do not mark 16-KB acceptance PASS unless the same candidate establishes `APK_ZIPALIGN_16K=PASS`, `APK_NATIVE_ELF_16K=PASS`, `EMULATOR_PAGE_SIZE_16K=PASS`, and `ANDROID_16K_PROCESS_SURVIVAL=PASS`.
14. Do not mark Android 16 runtime acceptance PASS unless the API-36 cold-launch gate establishes `ANDROID_16_PROCESS_SURVIVAL=PASS`.
15. For production, configure the authorised GitHub Secrets listed in `docs/RELEASING.md`; production must build the release variant and verify the resulting signer SHA-256 against `AI_CONSOLE_ANDROID_CERT_SHA256` without logging secret values.
16. If any CI/build/runtime gate fails, repair the root cause and rerun the affected and regression gates. Do not treat this package's GitHub-ready status as pre-approval of an APK.
17. Return PASS / FAIL / PARTIAL / UNVERIFIABLE classifications for dependency restoration, source tests, preview APK, production signing, Android 16 runtime, dedicated 16-KB runtime, and physical-device acceptance.

## Locked identity

- Product: AI Console
- Version: 1.4.0
- Android package: `com.nexarenew.aiconsole`
- Android versionCode: 9
- Framework: Expo SDK 57 / React Native 0.86 CNG
- Appearance: light only

Do not silently change framework, package identity, release version, security architecture, authorised feature scope or signing identity merely to make CI pass.
