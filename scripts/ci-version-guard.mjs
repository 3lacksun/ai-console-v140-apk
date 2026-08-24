import fs from 'node:fs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const app = readJson('app.json');
const fail = (message) => { throw new Error(message); };
const dep = (name) => pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '';

if (pkg.version !== '1.4.0') fail(`package.json version drift: ${pkg.version}`);
if (lock.name !== pkg.name) fail(`package-lock root name drift: ${lock.name} !== ${pkg.name}`);
if (lock.version !== pkg.version) fail(`package-lock root version drift: ${lock.version} !== ${pkg.version}`);
if (lock.packages?.['']?.version !== pkg.version) fail(`package-lock packages[''] version drift: ${lock.packages?.['']?.version} !== ${pkg.version}`);

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
if (dep('expo-speech-recognition') && !/^\^?57\./.test(dep('expo-speech-recognition'))) {
  console.warn(`SDK57_NATIVE_MODULE_WARNING: expo-speech-recognition declares ${dep('expo-speech-recognition')}; startup must remain guarded and CI must not assume native compatibility until Android runtime checks pass.`);
}

const expo = app.expo || {};
if (expo.version !== '1.4.0') fail(`app.json version drift: ${expo.version}`);
if (expo.userInterfaceStyle !== 'light') fail(`app.json userInterfaceStyle must remain light, found ${expo.userInterfaceStyle}`);
if (expo.android?.package !== 'com.nexarenew.aiconsole') fail(`Android package drift: ${expo.android?.package}`);
if (expo.android?.versionCode !== 9) fail(`Android versionCode drift: ${expo.android?.versionCode}`);
console.log('ANDROID_SDK_36_RESOLUTION: guarded by Expo SDK 57 package alignment; workflow verifies generated Gradle compile/target SDK after Expo prebuild.');

console.log('CI_VERSION_GUARD: PASS');
