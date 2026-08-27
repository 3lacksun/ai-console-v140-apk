import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const app = readJson('app.json');
const fail = (message) => { throw new Error(message); };
const dep = (name) => pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '';

const EXPECTED_VERSION = '1.5.5';
const EXPECTED_NAME = 'command-centre';
const EXPECTED_VERSION_CODE = 25;

if (pkg.name !== EXPECTED_NAME) fail(`package.json name drift: ${pkg.name}`);
if (pkg.version !== EXPECTED_VERSION) fail(`package.json version drift: ${pkg.version}`);
if (lock.name !== pkg.name) fail(`package-lock root name drift: ${lock.name} !== ${pkg.name}`);
if (lock.version !== pkg.version) fail(`package-lock root version drift: ${lock.version} !== ${pkg.version}`);
if (lock.packages?.['']?.version !== pkg.version) fail(`package-lock packages[''] version drift: ${lock.packages?.['']?.version} !== ${pkg.version}`);
if (lock.packages?.['']?.name && lock.packages[''].name !== pkg.name) {
  fail(`package-lock packages[''] name drift: ${lock.packages[''].name} !== ${pkg.name}`);
}

for (const [name, version] of Object.entries(pkg.dependencies || {})) {
  const lockSpec = lock.packages?.['']?.dependencies?.[name];
  if (lockSpec !== version) fail(`dependency lock drift for ${name}: package.json=${version}, package-lock=${lockSpec}`);
}
for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
  const lockSpec = lock.packages?.['']?.devDependencies?.[name];
  if (lockSpec !== version) fail(`devDependency lock drift for ${name}: package.json=${version}, package-lock=${lockSpec}`);
}

if (!/^~?57\./.test(dep('expo'))) fail(`Expo SDK 57 expected, found ${dep('expo')}`);
if (dep('react') !== '19.2.3') fail(`React 19.2.3 expected for this SDK 57 baseline, found ${dep('react')}`);
if (!/^0\.86\./.test(dep('react-native'))) fail(`React Native 0.86.x expected for this SDK 57 baseline, found ${dep('react-native')}`);
if (!lock.packages?.['node_modules/jszip']) fail('jszip is required by repository/package archive tests but is absent from package-lock.json');
if (dep('expo-speech-recognition') && !/^\^?56\./.test(dep('expo-speech-recognition'))) {
  console.warn(`SDK57_NATIVE_MODULE_WARNING: expo-speech-recognition declares ${dep('expo-speech-recognition')}; startup must remain guarded.`);
}

const expo = app.expo || {};
if (expo.version !== EXPECTED_VERSION) fail(`app.json version drift: ${expo.version}`);
if (!['automatic', 'light', 'dark'].includes(expo.userInterfaceStyle)) fail(`app.json userInterfaceStyle unexpected: ${expo.userInterfaceStyle}`);
if (expo.android?.package !== 'com.nexarenew.aiconsole') fail(`Android package drift: ${expo.android?.package}`);
if (expo.android?.versionCode !== EXPECTED_VERSION_CODE) fail(`Android versionCode drift: ${expo.android?.versionCode}`);
const excluded = [...(pkg.expo?.autolinking?.exclude || []), ...(pkg.expo?.autolinking?.android?.exclude || [])];
for (const name of ['expo-speech-recognition', 'expo-screen-capture', 'expo-local-authentication', 'expo-av', 'expo-splash-screen']) {
  if (!excluded.includes(name)) fail(`autolink exclude missing ${name}`);
}
console.log('ANDROID_SDK_36_RESOLUTION: guarded by Expo SDK 57 package alignment; workflow verifies generated Gradle compile/target SDK after Expo prebuild.');

console.log('CI_VERSION_GUARD: PASS');
