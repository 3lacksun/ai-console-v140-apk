# Known External Gates

The startup-blocking source defect is remediated locally. The following acceptance gates still require facilities outside the current execution environment:

1. Clean `npm ci` from the committed lockfile in a complete network/cache environment.
2. `npm audit --omit=dev --audit-level=high`, `expo install --check`, pinned Expo Doctor, Android Expo export and clean CNG prebuild.
3. Fresh Gradle preview APK generation from the remediated source.
4. Mandatory Android 16/API-36 cold-launch, 30-second process survival and **positive `ANDROID_16_APP_READY=PASS` UI evidence** for the same candidate APK.
5. Mandatory Android 15 `google_apis_ps16k` evidence with `PAGE_SIZE=16384`, install/start, process survival and **positive `ANDROID_16K_APP_READY=PASS` UI evidence** for the same candidate APK.
6. Production signing requires the authorised GitHub Secrets and certificate SHA-256 verification.
7. Physical TalkBack, dynamic/large text, keyboard/IME, rotation, camera, microphone, OpenRouter and rendered-output acceptance require suitable device/provider evidence.

The GitHub workflow is now fail-closed for APK publication: disabling runtime emulator checks is diagnostic-only, recovery-shell UI fails acceptance, and process survival without the real-app readiness marker cannot produce a distributable APK artefact.
