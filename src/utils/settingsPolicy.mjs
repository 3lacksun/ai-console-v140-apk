export const SETTINGS_PIN_LENGTH = 6;

export function normaliseSettingsPin(value = '') {
  return String(value).replace(/\D/g, '').slice(0, SETTINGS_PIN_LENGTH);
}

export function isValidSettingsPin(value = '') {
  return /^\d{6}$/.test(String(value));
}
