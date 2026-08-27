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

test('startup recovery boundary lazy-loads App after a native-safe boot shell', () => {
  const entry = read('index.js'); const app = read('App.js');
  assert.match(entry, /require\('\.\/App'\)/);
  assert.match(entry, /loadApplicationModule/);
  assert.match(entry, /startup shell 24/);
  assert.match(entry, /ErrorUtils/);
  assert.doesNotMatch(entry, /expo-splash-screen/);
  assert.match(entry, /AppErrorBoundary/);
  assert.match(entry, /registerRootComponent/);
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
