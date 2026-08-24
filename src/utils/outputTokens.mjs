export const MIN_OUTPUT_TOKENS = 256;
export const DEFAULT_OUTPUT_TOKENS = 4096;
export const MAX_OUTPUT_TOKENS = 65536;

export function normaliseOutputTokens(value, fallback = DEFAULT_OUTPUT_TOKENS) {
  const numeric = Number.parseInt(value, 10);
  const candidate = Number.isFinite(numeric) ? numeric : fallback;
  const rounded = Math.round(candidate / MIN_OUTPUT_TOKENS) * MIN_OUTPUT_TOKENS;
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(MIN_OUTPUT_TOKENS, rounded));
}

export const formatOutputTokenLimit = (value) => {
  const tokens = normaliseOutputTokens(value);
  return tokens >= 1000 ? `${tokens / 1000}k`.replace(/\.0k$/, 'k') : String(tokens);
};
