# AI Console v1.4.0 — CI Stabilisation Report

> **SUPERSEDED RUNTIME STATUS (25/08/2026):** A startup-blocking Hermes `TextDecoder('latin1')` defect was later confirmed in the distributed v1.4.2 APK and remediated in source. The failed APK is NO-GO. See `RUNTIME_ROOT_CAUSE_REMEDIATION_REPORT_25082026203650.md` and `VERIFICATION_STATUS.md` for current status.


## Status

PARTIAL. The package is better suited for a first GitHub preview APK attempt, but APK generation, dependency restoration, Android runtime survival and full 16-KB acceptance are still UNVERIFIABLE until executed in CI.

## External audit findings accepted

1. The workflow used Android SDK tools without first setting up the Android SDK command-line environment.
2. Android API 36 emulator, 16-KB page-size and process-survival diagnostics were too fragile for the default first preview build path.
3. `expo-speech-recognition ^56.0.1` remains a native-module compatibility risk under Expo SDK 57.
4. Production signing remains blocked without real GitHub Secrets.

## Remediation applied

1. Added `android-actions/setup-android@v4` before direct Android CLI usage.
2. Added Android environment evidence capture for `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `sdkmanager`, and `adb`.
3. Changed `run_emulator_checks` default to `false`.
4. Kept emulator/system-image installation behind explicit runtime-check opt-in.
5. Preserved APK ZIP alignment and native ELF alignment gates for generated APK validation.
6. Preserved Android runtime 16-KB and process-survival gates as explicit workflow-dispatch diagnostics.
7. Preserved the guarded speech-recognition warning instead of claiming SDK 57 compatibility.
8. Updated static checks to require Android SDK bootstrap and optional-by-default runtime diagnostics.

## Verification executed

| Check | Result |
|---|---:|
| Workflow YAML parse | PASS |
| Static checks | PASS |
| SDK/version guard | PASS |
| Full tests | FAIL |
| npm ci | UNVERIFIABLE |
| Expo install check | UNVERIFIABLE |
| expo-doctor | UNVERIFIABLE |
| Expo prebuild | UNVERIFIABLE |
| Gradle APK build | UNVERIFIABLE |
| Android 16 runtime survival | UNVERIFIABLE |
| Full 16-KB acceptance | UNVERIFIABLE |

## Remaining blocker

The local sandbox still cannot complete dependency restoration. The test suite continues to fail at the release-critical `jszip` package test because dependencies are not installed.

## First CI run recommendation

Use workflow dispatch with:

- `signing_mode=preview`
- `run_emulator_checks=false`

Do not mark Android 16 runtime acceptance or full 16-KB acceptance as PASS from that run. Enable runtime checks only after preview APK generation succeeds.
