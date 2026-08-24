import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('conversation streaming is keyed by chat and request id with stale-callback guard', () => {
  const source = read('App.js');
  assert.match(source, /streamRefs = useRef\(new Map\(\)\)/);
  assert.match(source, /streamRefs\.current\.get\(chatId\)\?\.requestId === requestId/);
  assert.match(source, /streamRefs\.current\.set\(chatId, \{ requestId, stream \}\)/);
  assert.match(source, /stopGenerationForChat\(chatId\)/);
  assert.match(source, /const handleDeleteChat = \(chatId\) => \{\s*stopGenerationForChat\(chatId\)/);
});

test('speech and mobile accessibility contract is present', () => {
  const app = read('App.js');
  const bubble = read('src/components/MessageBubble.js');
  const picker = read('src/components/ModelPicker.js');
  assert.match(app, /lang: 'en-GB'/);
  const primitives = read('src/ui/primitives.js');
  assert.match(primitives, /accessibilityLiveRegion="assertive"/);
  assert.match(app, /settingsBtn: \{ width: 48, height: 48/);
  assert.match(bubble, /AccessibilityInfo\.isReduceMotionEnabled/);
  assert.match(bubble, /reduceMotionChanged/);
  assert.match(picker, /accessibilityState=\{\{ selected: active \}\}/);
});

test('general settings cannot configure LLM/provider/prompt values', () => {
  const general = read('src/components/SettingsSheet.js');
  const protectedSettings = read('src/components/LLMSettingsSheet.js');
  for (const forbidden of ['OpenRouter API Key', 'System prompt', 'Select Model', 'Temperature', 'Max Tokens']) {
    assert.equal(general.includes(forbidden), false, `${forbidden} leaked into general settings`);
  }
  for (const required of ['OpenRouter API Key', 'Prompt System / Assistant Instructions', 'Temperature', 'Max Tokens']) {
    assert.equal(protectedSettings.includes(required), true, `${required} missing from protected settings`);
  }
});
