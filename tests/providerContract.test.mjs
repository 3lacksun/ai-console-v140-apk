import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchModels } from '../src/utils/streamChat.js';

test('model sync requires an OpenRouter API key', async () => {
  await assert.rejects(() => fetchModels(''), /API key/);
});

test('model sync uses current OpenRouter authenticated models endpoint', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://openrouter.ai/api/v1/models');
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      return { ok: true, json: async () => ({ data: [] }) };
    };
    const result = await fetchModels('test-key');
    assert.deepEqual(result, { data: [] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
