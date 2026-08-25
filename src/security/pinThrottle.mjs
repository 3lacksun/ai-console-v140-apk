export const PIN_THROTTLE_POLICY = Object.freeze({ maxFailures: 5, lockMs: 5 * 60 * 1000 });
export const EMPTY_PIN_THROTTLE = Object.freeze({ failures: 0, lockedUntil: 0 });

export function normalisePinThrottle(raw = {}, now = Date.now(), policy = PIN_THROTTLE_POLICY) {
  const failures = Math.max(0, Math.min(policy.maxFailures - 1, Number(raw?.failures) || 0));
  const lockedUntil = Math.max(0, Number(raw?.lockedUntil) || 0);
  if (lockedUntil && lockedUntil <= now) return { failures: 0, lockedUntil: 0 };
  return { failures, lockedUntil };
}

export function pinThrottleRemainingMs(raw = {}, now = Date.now(), policy = PIN_THROTTLE_POLICY) {
  const state = normalisePinThrottle(raw, now, policy);
  return Math.max(0, state.lockedUntil - now);
}

export function recordPinFailure(raw = {}, now = Date.now(), policy = PIN_THROTTLE_POLICY) {
  const state = normalisePinThrottle(raw, now, policy);
  if (state.lockedUntil > now) return state;
  const failures = state.failures + 1;
  if (failures >= policy.maxFailures) return { failures: 0, lockedUntil: now + policy.lockMs };
  return { failures, lockedUntil: 0 };
}

export function resetPinThrottle() { return { failures: 0, lockedUntil: 0 }; }
