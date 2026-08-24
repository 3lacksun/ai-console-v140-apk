# Known External Gates

The repository itself is prepared for GitHub. These acceptance gates still require facilities outside the current local execution environment:

1. Clean `npm ci` from `package-lock.json` and the mandatory full zero-skip test suite, including JSZip package/import tests.
2. Production dependency `npm audit`, `expo install --check`, pinned Expo Doctor, Expo export and clean Expo prebuild.
3. Gradle preview APK generation and post-build APK package/bundle/signature checks.
4. Android 16/API-36 emulator cold-launch and process-survival evidence.
5. Dedicated Android 15 `google_apis_ps16k` emulator evidence with `PAGE_SIZE=16384` and process survival.
6. Production signing requires real GitHub Secrets: `AI_CONSOLE_ANDROID_KEYSTORE_BASE64`, `AI_CONSOLE_ANDROID_KEYSTORE_PASSWORD`, `AI_CONSOLE_ANDROID_KEY_ALIAS`, `AI_CONSOLE_ANDROID_KEY_PASSWORD`, and `AI_CONSOLE_ANDROID_CERT_SHA256`.
7. Physical TalkBack, dynamic/large text, keyboard/IME, rotation and rendered-PDF acceptance require suitable devices and manual/device automation evidence.
8. `expo-speech-recognition ^56.0.1` is startup-guarded and currently the published package line used by the project, but native Expo-57/Android compatibility remains a build/runtime evidence gate.

A failure at any of these gates is not pre-approved by this repository package and must be remediated before the corresponding acceptance status can become PASS.
