/**
 * Optional device-credential / biometric unlock.
 * Dynamic import so a missing native module cannot crash the PIN path.
 */
let authModulePromise = null;

async function loadLocalAuth() {
  if (!authModulePromise) {
    authModulePromise = import('expo-local-authentication')
      .then((mod) => mod || null)
      .catch(() => null);
  }
  return authModulePromise;
}

export async function canUseLocalAuth() {
  const mod = await loadLocalAuth();
  if (!mod) return { available: false, enrolled: false };
  try {
    const available = typeof mod.hasHardwareAsync === 'function' ? await mod.hasHardwareAsync() : false;
    const enrolled = available && typeof mod.isEnrolledAsync === 'function' ? await mod.isEnrolledAsync() : false;
    return { available: Boolean(available), enrolled: Boolean(enrolled) };
  } catch (_) {
    return { available: false, enrolled: false };
  }
}

export async function authenticateLocalUser(prompt = 'Unlock protected Command Centre settings') {
  const status = await canUseLocalAuth();
  if (!status.enrolled) return { ok: false, reason: 'UNAVAILABLE' };
  const mod = await loadLocalAuth();
  try {
    const result = await mod.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    return { ok: Boolean(result?.success), reason: result?.success ? 'OK' : (result?.error || 'FAILED') };
  } catch (_) {
    return { ok: false, reason: 'FAILED' };
  }
}
