/**
 * Android FLAG_SECURE wrapper. expo-screen-capture is optional at runtime so
 * a missing native module cannot crash protected settings.
 */
let captureModulePromise = null;

async function loadCapture() {
  if (!captureModulePromise) {
    captureModulePromise = import('expo-screen-capture')
      .then((mod) => mod || null)
      .catch(() => null);
  }
  return captureModulePromise;
}

export async function protectSensitiveScreen() {
  const mod = await loadCapture();
  try {
    if (typeof mod?.preventScreenCaptureAsync === 'function') {
      await mod.preventScreenCaptureAsync();
      return true;
    }
  } catch (_) {}
  return false;
}

export async function unprotectSensitiveScreen() {
  const mod = await loadCapture();
  try {
    if (typeof mod?.allowScreenCaptureAsync === 'function') {
      await mod.allowScreenCaptureAsync();
      return true;
    }
  } catch (_) {}
  return false;
}
