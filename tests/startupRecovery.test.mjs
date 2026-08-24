import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSpeechRecognitionModule } from '../src/voice/speechRecognitionAdapter.mjs';
import { loadApplicationModule } from '../src/startup/appLoader.mjs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const completeSpeechModule = { addListener() {}, requestPermissionsAsync() {}, start() {}, stop() {}, abort() {} };

test('speech adapter accepts a complete compatible native module', async () => {
  const result = await loadSpeechRecognitionModule(async () => ({ ExpoSpeechRecognitionModule: completeSpeechModule }));
  assert.equal(result.ok, true); assert.equal(result.status, 'READY'); assert.equal(result.module, completeSpeechModule);
});

test('speech adapter converts module load failure into an unavailable result', async () => {
  const result = await loadSpeechRecognitionModule(async () => { throw new Error('native binding missing\nprivate stack'); });
  assert.deepEqual(result, { ok: false, status: 'UNAVAILABLE', error: 'native binding missing' });
});

test('speech adapter rejects incomplete native bindings', async () => {
  const result = await loadSpeechRecognitionModule(async () => ({ ExpoSpeechRecognitionModule: { start() {} } }));
  assert.equal(result.ok, false); assert.equal(result.status, 'UNAVAILABLE');
});

test('application module loader contains import-time failures as data', async () => {
  const failed = await loadApplicationModule(async () => { throw new Error('native import failed\nstack'); });
  assert.deepEqual(failed, { ok: false, status: 'UNAVAILABLE', error: 'native import failed' });
  const component = () => null;
  const ready = await loadApplicationModule(async () => ({ default: component }));
  assert.equal(ready.ok, true); assert.equal(ready.component, component);
});

test('startup recovery boundary is established before App is dynamically loaded', () => {
  const entry = read('index.js'); const app = read('App.js');
  assert.doesNotMatch(entry, /import\s+App\s+from\s+['"]\.\/App['"]/);
  assert.match(entry, /loadApplicationModule\(\(\)=>Promise\.resolve\(\)\.then\(\(\)=>require\('\.\/App'\)\)\)/);
  assert.match(entry, /function StartupErrorBoundary/); assert.match(entry, /registerRootComponent\(Bootstrap\)/);
  assert.doesNotMatch(app, /from 'expo-speech-recognition'/);
  assert.match(app, /loadSpeechRecognitionModule\(\)/);
  assert.match(app, /Startup recovery mode:/);
});

test('navigation effects do not own global stream/speech cleanup', () => {
  const app = read('App.js');
  assert.match(app, /return \(\) => backSubscription\.remove\(\)/);
  assert.ok(app.includes('for (const entry of streamRefs.current.values())'));
  assert.ok(app.includes('streamRefs.current.clear()'));
  assert.equal((app.match(/loadSpeechRecognitionModule\(\)/g) || []).length, 1);
});
