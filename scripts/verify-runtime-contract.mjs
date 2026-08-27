import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const major = (value) => String(value || '').match(/\d+/)?.[0] || '';

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const app = readJson('app.json').expo;
const deps = pkg.dependencies || {};

const EXPECTED_VERSION = '1.5.5';
const EXPECTED_ANDROID_VERSION_CODE = 24;
const EXPECTED_ANDROID_PACKAGE = 'com.nexarenew.aiconsole';
const EXPECTED_EXPO_MAJOR = '57';
const EXPECTED_REACT = '19.2.3';
const EXPECTED_REACT_NATIVE = '0.86.2';
const EXPO_MAJOR_EXCEPTIONS = new Set([
  'expo-speech-recognition',
  'expo-av',
]);

if (pkg.version !== EXPECTED_VERSION || app.version !== EXPECTED_VERSION) {
  fail(`Command Centre release identity must be v${EXPECTED_VERSION}.`);
}

if (lock.version !== EXPECTED_VERSION || lock.packages?.['']?.version !== EXPECTED_VERSION) {
  fail(`package-lock release identity must be v${EXPECTED_VERSION}.`);
}

if (app.android?.versionCode !== EXPECTED_ANDROID_VERSION_CODE || app.android?.package !== EXPECTED_ANDROID_PACKAGE) {
  fail(`Android v${EXPECTED_VERSION} identity is inconsistent.`);
}

if (pkg.main !== 'index.js' || !fs.existsSync('index.js')) {
  fail('Crash-safe root entrypoint is missing.');
}

const entry = fs.readFileSync('index.js', 'utf8');
if (!entry.includes("require('./App')") || !entry.includes('startup shell 24') || !entry.includes('ErrorUtils')) {
  fail('Crash-safe lazy boot shell / ErrorUtils contract is missing from index.js.');
}

if (major(deps.expo) !== EXPECTED_EXPO_MAJOR) {
  fail(`Expo SDK ${EXPECTED_EXPO_MAJOR} alignment is required: ${deps.expo || 'missing'}`);
}

if (deps.react !== EXPECTED_REACT || deps['react-native'] !== EXPECTED_REACT_NATIVE) {
  fail(`React ${EXPECTED_REACT} / React Native ${EXPECTED_REACT_NATIVE} alignment is required.`);
}

for (const [name, version] of Object.entries(deps)) {
  if (name.startsWith('expo-') && !EXPO_MAJOR_EXCEPTIONS.has(name) && major(version) !== EXPECTED_EXPO_MAJOR) {
    fail(`${name} is not aligned to Expo SDK ${EXPECTED_EXPO_MAJOR}: ${version}`);
  }
}

if (deps['expo-speech-recognition'] && major(deps['expo-speech-recognition']) !== '56') {
  fail(`expo-speech-recognition remains pinned to the guarded SDK 56-compatible line pending SDK 57 runtime proof: ${deps['expo-speech-recognition']}`);
}

const pluginNames = (app.plugins || []).map((entry) => (Array.isArray(entry) ? entry[0] : entry));
if (pluginNames.includes('expo-speech-recognition')) {
  fail('expo-speech-recognition must not run as a config plugin; it injects a crash-prone native module.');
}
if (pluginNames.includes('expo-local-authentication')) {
  fail('expo-local-authentication must not run as a config plugin on the crash-safe Android path.');
}
if (pluginNames.includes('expo-screen-capture')) {
  fail('expo-screen-capture must stay a runtime-only screen guard, not a config plugin.');
}
if (!pluginNames.includes('./plugins/withExcludeUnsafeNativeModules')) {
  fail('Native-module exclusion config plugin is missing.');
}

const excluded = [...(pkg.expo?.autolinking?.exclude || []), ...(pkg.expo?.autolinking?.android?.exclude || [])];
for (const name of ['expo-speech-recognition', 'expo-screen-capture', 'expo-local-authentication']) {
  if (!excluded.includes(name)) fail(`autolink exclude missing ${name}`);
}

if (!app.android?.permissions?.includes('RECORD_AUDIO')) {
  fail('RECORD_AUDIO must remain declared after removing the speech config plugin.');
}

if (!['automatic', 'light', 'dark'].includes(app.userInterfaceStyle)) {
  fail('Release appearance contract is inconsistent.');
}

console.log('RUNTIME_CONTRACT: PASS');
