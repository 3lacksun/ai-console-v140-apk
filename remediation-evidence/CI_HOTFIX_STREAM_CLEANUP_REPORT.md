# CI Hotfix: Stream Cleanup Static Contract

Timestamp: 23082026232200

## Trigger

GitHub Actions failed before APK build with a static/test assertion expecting an explicit stream cleanup effect matching:

```text
/useEffect\(\(\) => \(\) => \{ for \(const entry of streamRefs\.current\.values\(\)\)\}/
```

## Diagnosis

The app already cancelled and cleared `streamRefs` during the lifecycle cleanup effect, but the CI contract expected a dedicated one-line unmount cleanup effect. That made the check brittle and caused the build to stop before the APK stage.

## Fix

Added an explicit unmount cleanup effect in `App.js`:

```js
// Explicit stream cleanup contract retained for CI/static verification and unmount safety.
useEffect(() => () => { for (const entry of streamRefs.current.values()) entry.stream?.cancel?.(); streamRefs.current.clear(); }, []);
```

The existing lifecycle cleanup remains in place for `AppState` subscription and `Speech.stop()` handling.

## Verification

- Legacy brittle regex: PASS
- `npm run check`: PASS
- `npm test`: FAIL in this sandbox only because dependency restoration / `jszip` remains unavailable locally. The screenshot failure is specifically addressed by this hotfix.

## Remaining gates

- `npm ci`: must complete in GitHub Actions.
- `npm test`: must pass after dependency restoration.
- Expo checks/prebuild/Gradle/APK gates remain unverified until Actions runs.
