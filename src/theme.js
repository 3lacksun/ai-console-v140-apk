/**
 * Dr Stone's Command Centre — monochrome system
 * Light: pure white surfaces, black + charcoal ink
 * Dark: pure black surfaces, light charcoal ink
 * Accent keys (cyan*) are remapped to charcoal hierarchy for compatibility.
 */
export const DARK_COLORS = {
  black: '#000000',
  bg: '#000000',
  bgHeader: '#0a0a0a',
  panel: '#141414',
  panelAlt: '#1c1c1c',
  surfaceElevated: '#1a1a1a',
  shadow: '#000000',
  border: '#2a2a2a',
  borderLight: '#3a3a3a',
  textPrimary: '#f5f5f5',
  textSecondary: '#e0e0e0',
  textMuted: '#a3a3a3',
  textFaint: '#737373',
  // charcoal accent hierarchy (legacy cyan* keys)
  cyan: '#e5e5e5',
  cyanBright: '#ffffff',
  cyanDim: 'rgba(255,255,255,0.08)',
  cyanBorder: 'rgba(255,255,255,0.22)',
  rose: '#f87171',
  roseBg: 'rgba(248,113,113,0.12)',
  roseBorder: 'rgba(248,113,113,0.28)',
  roseToast: 'rgba(220,38,38,0.94)',
  emerald: '#4ade80',
  overlay: 'rgba(0,0,0,0.72)',
  userText: '#ffffff',
  userBubble: '#2a2a2a',
  assistantBubble: '#141414',
  navActive: 'rgba(255,255,255,0.08)',
  sheetHandle: '#3a3a3a',
};

export const LIGHT_COLORS = {
  black: '#ffffff',
  bg: '#ffffff',
  bgHeader: '#ffffff',
  panel: '#ffffff',
  panelAlt: '#f4f4f4',
  surfaceElevated: '#ffffff',
  shadow: '#0a0a0a',
  border: '#e5e5e5',
  borderLight: '#d4d4d4',
  textPrimary: '#0a0a0a',
  textSecondary: '#1a1a1a',
  textMuted: '#525252',
  textFaint: '#737373',
  // charcoal accent hierarchy
  cyan: '#1a1a1a',
  cyanBright: '#0a0a0a',
  cyanDim: 'rgba(10,10,10,0.06)',
  cyanBorder: 'rgba(10,10,10,0.18)',
  rose: '#dc2626',
  roseBg: '#fef2f2',
  roseBorder: '#fecaca',
  roseToast: '#dc2626',
  emerald: '#16a34a',
  overlay: 'rgba(10,10,10,0.48)',
  userText: '#ffffff',
  userBubble: '#1a1a1a',
  assistantBubble: '#ffffff',
  navActive: 'rgba(10,10,10,0.06)',
  sheetHandle: '#d4d4d4',
};

export const getColors = (mode) => (mode === 'light' ? LIGHT_COLORS : DARK_COLORS);
export const colors = LIGHT_COLORS;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const BRAND = Object.freeze({
  name: "Dr Stone's Command Centre",
  shortName: 'Command Centre',
  eyebrow: 'COMMAND CENTRE',
  tagline: 'Focused AI operations. Local control. Charcoal precision.',
});
