import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const fail = (message) => { throw new Error(message); };
const major = (value) => String(value || '').match(/\d+/)?.[0] || '';

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const app = readJson('app.json').expo;
const deps = pkg.dependencies || {};

const EXPECTED_VERSION = '1.4.2';
const EXPECTED_ANDROID_VERSION_CODE = 11;
const EXPECTED_ANDROID_PACKAGE = 'com.nexarenew.aiconsole';
const EXPECTED_EXPO_MAJOR = '57';
const EXPECTED_REACT = '19.2.3';
const EXPECTED_REACT_NATIVE = '0.86.2';

if (pkg.version !== EXPECTED_VERSION || app.version !== EXPECTED_VERSION) {
  fail(`AI Console release identity must be v${EXPECTED_VERSION}.`);
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

if (major(deps.expo) !== EXPECTED_EXPO_MAJOR) {
  fail(`Expo SDK ${EXPECTED_EXPO_MAJOR} alignment is required: ${deps.expo || 'missing'}`);
}

if (deps.react !== EXPECTED_REACT || deps['react-native'] !== EXPECTED_REACT_NATIVE) {
  fail(`React ${EXPECTED_REACT} / React Native ${EXPECTED_REACT_NATIVE} alignment is required.`);
}

for (const [name, version] of Object.entries(deps)) {
  if (name.startsWith('expo-') && name !== 'expo-speech-recognition' && major(version) !== EXPECTED_EXPO_MAJOR) {
    fail(`${name} is not aligned to Expo SDK ${EXPECTED_EXPO_MAJOR}: ${version}`);
  }
}

if (deps['expo-speech-recognition'] && major(deps['expo-speech-recognition']) !== '56') {
  fail(`expo-speech-recognition remains pinned to the guarded SDK 56-compatible line pending SDK 57 runtime proof: ${deps['expo-speech-recognition']}`);
}

if (!app.plugins?.some((entry) => (Array.isArray(entry) ? entry[0] : entry) === 'expo-speech-recognition')) {
  fail('Speech-recognition native configuration is missing.');
}

if (app.userInterfaceStyle !== 'light' || app.backgroundColor !== '#f8fafc') {
  fail('Light-only release appearance contract is inconsistent.');
}

console.log('RUNTIME_CONTRACT: PASS');
