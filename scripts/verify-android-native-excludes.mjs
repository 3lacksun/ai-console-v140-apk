import fs from 'node:fs';
import path from 'node:path';

const BLOCKED = [
  'expo-speech-recognition',
  'expo-local-authentication',
  'expo-screen-capture',
  'expo-av',
  'expo-splash-screen',
];

const BLOCKED_JAVA = [
  'expo.modules.speechrecognition',
  'expo.modules.localauthentication',
  'expo.modules.screencapture',
  'expo.modules.av',
  'expo.modules.splashscreen',
];

const fail = (message) => {
  throw new Error(message);
};

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const excluded = new Set([
  ...(pkg.expo?.autolinking?.exclude || []),
  ...(pkg.expo?.autolinking?.android?.exclude || []),
]);

for (const name of BLOCKED) {
  if (!excluded.has(name)) fail(`package.json expo.autolinking.exclude is missing ${name}`);
}

const rnConfigPath = 'react-native.config.js';
if (!fs.existsSync(rnConfigPath)) fail('react-native.config.js is missing');
const rnConfig = fs.readFileSync(rnConfigPath, 'utf8');
for (const name of BLOCKED) {
  if (!rnConfig.includes(`'${name}'`)) fail(`react-native.config.js does not disable ${name}`);
}

if (!fs.existsSync('android')) {
  console.log('NATIVE_EXCLUDES: PASS (android/ not generated yet; package excludes verified)');
  process.exit(0);
}

const hits = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['build', '.gradle', '.cxx'].includes(entry.name)) continue;
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(next);
      continue;
    }
    if (!/\.(gradle|kts|java|kt|xml|properties)$/.test(entry.name)) continue;
    const body = fs.readFileSync(next, 'utf8');
    for (const name of BLOCKED) {
      if (body.includes(name)) hits.push(`${next}: ${name}`);
    }
    for (const name of BLOCKED_JAVA) {
      if (body.toLowerCase().includes(name)) hits.push(`${next}: ${name}`);
    }
  }
};

walk('android');
if (hits.length) fail(`Blocked native modules still present after prebuild:\n${hits.join('\n')}`);
console.log('NATIVE_EXCLUDES: PASS');
