import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMessageForPersistence } from '../src/utils/privacy.mjs';
import { UPLOAD_LIMITS } from '../src/utils/uploadLimits.mjs';
import { PROVIDERS, hasProviderKey } from '../src/utils/providers.mjs';

test('persists file/https imageUri and strips data URLs', () => {
  const fileMsg = sanitizeMessageForPersistence({ role: 'assistant', content: 'img', imageUri: 'file:///data/generated.png', attachment: { name: 'g.png', imageUri: 'file:///data/generated.png' } });
  assert.equal(fileMsg.imageUri, 'file:///data/generated.png');
  assert.equal(fileMsg.attachment.imageUri, 'file:///data/generated.png');
  const dataMsg = sanitizeMessageForPersistence({ role: 'assistant', content: 'img', imageUri: 'data:image/png;base64,AAAA' });
  assert.equal('imageUri' in dataMsg, false);
});

test('in-memory decode budget is below advertised source ceilings', () => {
  assert.ok(UPLOAD_LIMITS.maxJsDecodeBytes < UPLOAD_LIMITS.maxFileBytes);
  assert.ok(UPLOAD_LIMITS.maxImageEmbedBytes < UPLOAD_LIMITS.maxImageBytes);
  assert.ok(UPLOAD_LIMITS.contextWarningCharacters < UPLOAD_LIMITS.maxContextCharacters);
});

test('provider referer is product-owned and empty keys are rejected', () => {
  assert.match(PROVIDERS.openrouter.referer, /3lacksun\/ai-console-v140-apk/);
  assert.match(PROVIDERS.together.referer, /3lacksun\/ai-console-v140-apk/);
  assert.equal(hasProviderKey(''), false);
  assert.equal(hasProviderKey('  together-abc  '), true);
});
