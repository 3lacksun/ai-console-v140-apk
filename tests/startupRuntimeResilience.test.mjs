import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync(new URL('../App.js', import.meta.url), 'utf8');
const appConfig = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const workflowPath = new URL('../.github/workflows/android-apk.yml', import.meta.url);
const legacyWorkflowPath = new URL('../../.github/workflows/android-apk.yml', import.meta.url);
const workflow = fs.readFileSync(fs.existsSync(workflowPath) ? workflowPath : legacyWorkflowPath, 'utf8');
const errorBoundarySource = fs.readFileSync(new URL('../src/components/AppErrorBoundary.js', import.meta.url), 'utf8');
const speechAdapterSource = fs.readFileSync(new URL('../src/voice/speechRecognitionAdapter.mjs', import.meta.url), 'utf8');


test('root render failures degrade to a recoverable shell instead of an uncaught blank/crash path', () => {
  assert.match(appSource, /<AppErrorBoundary><AIConsoleApp \/><\/AppErrorBoundary>/);
  assert.match(errorBoundarySource, /getDerivedStateFromError/);
  assert.match(errorBoundarySource, /Your saved data has not been cleared/);
  assert.match(errorBoundarySource, /Retry AI Console/);
});

test('optional speech recognition cannot fail during App module import', () => {
  assert.equal(appSource.includes("from 'expo-speech-recognition'"), false);
  assert.equal(appSource.includes("require('expo-speech-recognition')"), false);
  assert.match(appSource, /loadSpeechRecognitionModule/);
  assert.match(appSource, /speechRecognitionAdapter\.mjs/);
  assert.match(speechAdapterSource, /import\('expo-speech-recognition'\)/);
  assert.match(speechAdapterSource, /REQUIRED_METHODS/);
});

test('startup hydration has recovery and write-protection on failure', () => {
  assert.match(appSource, /try \{[\s\S]*Promise\.all/);
  assert.match(appSource, /Startup recovery mode: saved state could not be restored safely/);
  assert.match(appSource, /hydrationDegradedRef\.current/);
  assert.match(appSource, /if \(!hydrated \|\| hydrationDegradedRef\.current\) return;/);
  assert.match(appSource, /hydrated && !hydrationDegradedRef\.current/);
  assert.match(appSource, /if \(!hydrated \|\| hydrationDegradedRef\.current\) return undefined;/);
});

test('Android speech package visibility covers modern and legacy Google services', () => {
  const plugin = appConfig.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-speech-recognition');
  assert.ok(plugin);
  assert.ok(plugin[1].androidSpeechServicePackages.includes('com.google.android.googlequicksearchbox'));
  assert.ok(plugin[1].androidSpeechServicePackages.includes('com.google.android.tts'));
});

test('CI verifies SDK 57 tooling, 16 KB alignment and actual cold launch', () => {
  assert.match(workflow, /NODE_VERSION: \"24\"/);
  assert.match(workflow, /expo install --check/);
  assert.match(workflow, /APK_ZIPALIGN_16K/);
  assert.match(workflow, /APK_NATIVE_ELF_16K/);
  assert.match(workflow, /EMULATOR_PAGE_SIZE_16K/);
  assert.match(workflow, /ANDROID_16_PROCESS_SURVIVAL/);
  assert.match(workflow, /zipalign/);
  assert.match(workflow, /-P 16/);
  assert.match(workflow, /system-images;android-36;google_apis;x86_64/);
  assert.match(workflow, /system-images;android-35;google_apis_ps16k;x86_64/);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /expo-doctor@1\.20\.2/);
  assert.match(workflow, /ANDROID_16_PROCESS_SURVIVAL=PASS/);
  assert.match(workflow, /ANDROID_16K_PROCESS_SURVIVAL=PASS/);
  assert.match(workflow, /app:assembleDebug/);
  assert.match(workflow, /app:assembleRelease/);
});
