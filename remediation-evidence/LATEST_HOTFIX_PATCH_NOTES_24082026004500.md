# AI Console CI Latest Hotfix Files

Timestamp: 24082026004500

This patch ZIP contains the current CI hotfix files applied through GitHub:

- `tests/startupRecovery.test.mjs`
  - Replaces the brittle one-line stream cleanup regex with direct behaviour checks.
- `scripts/verify-runtime-contract.mjs`
  - Updates the stale v1.4.1 / Expo SDK 56 contract to the current v1.4.0 / Expo SDK 57 contract.
- `src/voice/speechRecognitionAdapter.js`
  - Speech recognition adapter required by `startupRecovery.test.mjs`.

Related commits:

- `3f13196c9253674f99796858cd1793b530f58d73` — Fix brittle stream cleanup test
- `89f2465148bcc9e3cc872eea791b58b06d6afec9` — Fix runtime contract release metadata

Apply these files at repository root, preserving paths.
