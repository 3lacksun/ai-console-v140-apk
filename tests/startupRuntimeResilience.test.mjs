import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyAppReadyUi } from '../scripts/verify-app-ready-ui.mjs';

const appSource = fs.readFileSync(new URL('../App.js', import.meta.url), 'utf8');
const appConfig = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
const workflowPath = new URL('../.github/workflows/android-apk.yml', import.meta.url);
const legacyWorkflowPath = new URL('../../.github/workflows/android-apk.yml', import.meta.url);
const workflow = fs.readFileSync(fs.existsSync(workflowPath) ? workflowPath : legacyWorkflowPath, 'utf8');
const errorBoundarySource = fs.readFileSync(new URL('../src/components/AppErrorBoundary.js', import.meta.url), 'utf8');
const speechAdapterSource = fs.readFileSync(new URL('../src/voice/speechRecognitionAdapter.mjs', import.meta.url), 'utf8');
const pdfExtractorSource = fs.readFileSync(new URL('../src/documents/pdfTextExtract.mjs', import.meta.url), 'utf8');


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


test('startup import graph contains no unsupported latin1 TextDecoder and byte mapping is exact', async () => {
  assert.doesNotMatch(pdfExtractorSource, /new\s+TextDecoder\(\s*['"]latin1['"]/i);
  const { bytesToLatin1 } = await import('../src/documents/pdfTextExtract.mjs');
  const decoded = bytesToLatin1(new Uint8Array([0x00, 0x41, 0x7f, 0x80, 0xff]));
  assert.deepEqual(Array.from(decoded, (character) => character.charCodeAt(0)), [0x00, 0x41, 0x7f, 0x80, 0xff]);
});

test('Android speech package visibility covers modern and legacy Google services', () => {
  const plugin = appConfig.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-speech-recognition');
  assert.ok(plugin);
  assert.ok(plugin[1].androidSpeechServicePackages.includes('com.google.android.googlequicksearchbox'));
  assert.ok(plugin[1].androidSpeechServicePackages.includes('com.google.android.tts'));
});

test('CI requires executed Android cold-launch gates before an APK artefact can be published', () => {
  assert.match(workflow, /NODE_VERSION: "24"/);
  assert.match(workflow, /expo install --check/);
  assert.match(workflow, /APK_ZIPALIGN_16K/);
  assert.match(workflow, /APK_NATIVE_ELF_16K/);
  assert.match(workflow, /EMULATOR_PAGE_SIZE_16K/);
  assert.match(workflow, /ANDROID_16_PROCESS_SURVIVAL=PASS/);
  assert.match(workflow, /ANDROID_16K_PROCESS_SURVIVAL=PASS/);
  assert.match(workflow, /system-images;android-36;google_apis;x86_64/);
  assert.match(workflow, /system-images;android-35;google_apis_ps16k;x86_64/);
  assert.match(workflow, /default:\s*true/);
  assert.match(workflow, /github\.event_name != 'workflow_dispatch' \|\| inputs\.run_emulator_checks/);
  assert.match(workflow, /name:\s*Release runtime acceptance gate[\s\S]*grep -Fx 'ANDROID_16_PROCESS_SURVIVAL=PASS'[\s\S]*grep -Fx 'ANDROID_16K_PROCESS_SURVIVAL=PASS'/);
  assert.match(workflow, /name:\s*Upload APK artefact[\s\S]*if:\s*\$\{\{ success\(\) && env\.RUN_EMULATOR_CHECKS == 'true' \}\}/);
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /expo-doctor@1\.20\.2/);
  assert.match(workflow, /app:assembleDebug/);
  assert.match(workflow, /app:assembleRelease/);
});

test('Android release gate requires positive real-app UI readiness, not process survival alone', () => {
  assert.match(appSource, /const APP_RELEASE_LABEL = 'AI Console v1\.4\.2'/);
  assert.match(appSource, /testID="ai-console-app-ready"/);
  assert.match(appSource, /\$\{currentModelName\(\)\} · \$\{APP_RELEASE_LABEL\}/);
  assert.match(workflow, /uiautomator dump/);
  assert.match(workflow, /node scripts\/verify-app-ready-ui\.mjs/);
  assert.match(workflow, /ANDROID_16_APP_READY=PASS/);
  assert.match(workflow, /ANDROID_16K_APP_READY=PASS/);
  assert.match(workflow, /name:\s*Release runtime acceptance gate[\s\S]*grep -Fx 'ANDROID_16_APP_READY=PASS'[\s\S]*grep -Fx 'ANDROID_16K_APP_READY=PASS'/);
});

test('app-ready UI classifier rejects both recovery shells and accepts only the real v1.4.2 marker', () => {
  assert.deepEqual(classifyAppReadyUi('<node text=\"AI Console v1.4.2\"/>', 'AI Console v1.4.2'), { ok: true, code: 0, status: 'APP_READY', marker: 'AI Console v1.4.2' });
  assert.equal(classifyAppReadyUi('<node text=\"AI Console could not start safely.\"/>', 'AI Console v1.4.2').status, 'RECOVERY_SHELL');
  assert.equal(classifyAppReadyUi('<node text=\"AI Console could not open this screen safely.\"/>', 'AI Console v1.4.2').status, 'RECOVERY_SHELL');
  assert.equal(classifyAppReadyUi('<node text=\"Opening AI Console…\"/>', 'AI Console v1.4.2').status, 'READY_MARKER_NOT_FOUND');
});

test('publishable APK build command is fail-closed and EAS route is diagnostic-only', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const eas = JSON.parse(fs.readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
  const policy = fs.readFileSync(new URL('../scripts/build-apk-policy.mjs', import.meta.url), 'utf8');
  assert.equal(pkg.scripts['build:apk'], 'node scripts/build-apk-policy.mjs');
  assert.equal(pkg.scripts['build:apk:diagnostic'], 'eas build -p android --profile diagnostic-preview');
  assert.deepEqual(Object.keys(eas.build), ['diagnostic-preview']);
  assert.match(policy, /BUILD_APK_RELEASE_GATE=BLOCKED/);
  assert.match(policy, /run_emulator_checks=true/);
});

test('current release identity is v1.4.2 / versionCode 11 across user-facing build guidance', () => {
  const building = fs.readFileSync(new URL('../docs/BUILDING.md', import.meta.url), 'utf8');
  assert.match(building, /^# Building AI Console v1\.4\.2/m);
  assert.match(building, /Expo app version: `1\.4\.2`/);
  assert.match(building, /Android versionCode: `11`/);
  assert.match(building, /AI_Console_v1\.4\.2_preview-debug-signed\.apk/);
  assert.doesNotMatch(building, /AI_Console_v1\.4\.0_preview-debug-signed\.apk/);
  assert.doesNotMatch(appSource, /AI Console v1\.4\.0/);
});
