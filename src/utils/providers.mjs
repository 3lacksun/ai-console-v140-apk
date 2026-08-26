export const PROVIDERS = Object.freeze({
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    defaultModel: 'openrouter/auto',
    keyPlaceholder: 'sk-or-v1-...',
    referer: 'https://github.com/3lacksun/ai-console-v140-apk',
    title: "Dr Stone's Command Centre",
  },
  together: {
    id: 'together',
    label: 'Together.ai',
    chatUrl: 'https://api.together.xyz/v1/chat/completions',
    modelsUrl: 'https://api.together.xyz/v1/models',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    keyPlaceholder: 'together-...',
    referer: 'https://github.com/3lacksun/ai-console-v140-apk',
    title: "Dr Stone's Command Centre",
  },
});

export const DEFAULT_PROVIDER = 'openrouter';

export function resolveProvider(id) {
  return PROVIDERS[id] || PROVIDERS.openrouter;
}

export function isValidProvider(id) {
  return Boolean(PROVIDERS[id]);
}

export function hasProviderKey(key) {
  return Boolean(String(key || '').trim());
}
