const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const BLOCKED = [
  'expo-speech-recognition',
  'expo-local-authentication',
  'expo-screen-capture',
  'expo-av',
  'expo-splash-screen',
];

const BLOCKED_PACKAGES = [
  'expo.modules.speechrecognition',
  'expo.modules.localauthentication',
  'expo.modules.screencapture',
  'expo.modules.av',
  'expo.modules.splashscreen',
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['build', '.gradle', '.cxx'].includes(entry.name)) walk(next, files);
    } else if (/\.(gradle|kts|java|kt|xml)$/.test(entry.name)) {
      files.push(next);
    }
  }
  return files;
}

function scrub(body) {
  let next = body;
  for (const name of BLOCKED) {
    next = next.replace(new RegExp(`^.*${name}.*$`, 'gm'), '');
  }
  for (const name of BLOCKED_PACKAGES) {
    next = next.replace(new RegExp(`^.*${name.replace(/\./g, '\\.')}.*$`, 'gm'), '');
  }
  return next;
}

function withExcludeUnsafeNativeModules(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const root = cfg.modRequest.platformProjectRoot;
    for (const file of walk(root)) {
      const original = fs.readFileSync(file, 'utf8');
      const next = scrub(original);
      if (next !== original) fs.writeFileSync(file, next);
    }
    return cfg;
  }]);
}

module.exports = withExcludeUnsafeNativeModules;
