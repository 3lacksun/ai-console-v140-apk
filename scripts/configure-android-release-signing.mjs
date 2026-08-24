import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const required = ['AI_CONSOLE_KEYSTORE_PATH', 'AI_CONSOLE_KEYSTORE_PASSWORD', 'AI_CONSOLE_KEY_ALIAS', 'AI_CONSOLE_KEY_PASSWORD'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required release-signing environment variable: ${name}`);
}
const gradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
let source = fs.readFileSync(gradlePath, 'utf8');

function blockBounds(text, marker, from = 0) {
  const start = text.indexOf(marker, from);
  if (start < 0) throw new Error(`Unable to locate Gradle block: ${marker}`);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    if (text[i] === '}') depth -= 1;
    if (depth === 0) return { start, open, end: i };
  }
  throw new Error(`Unterminated Gradle block: ${marker}`);
}

const signing = blockBounds(source, 'signingConfigs');
const signingBody = source.slice(signing.open + 1, signing.end);
if (!/\brelease\s*\{/.test(signingBody)) {
  const releaseConfig = `\n        release {\n            storeFile file(System.getenv("AI_CONSOLE_KEYSTORE_PATH"))\n            storePassword System.getenv("AI_CONSOLE_KEYSTORE_PASSWORD")\n            keyAlias System.getenv("AI_CONSOLE_KEY_ALIAS")\n            keyPassword System.getenv("AI_CONSOLE_KEY_PASSWORD")\n        }\n    `;
  source = source.slice(0, signing.end) + releaseConfig + source.slice(signing.end);
}

const buildTypes = blockBounds(source, 'buildTypes');
const release = blockBounds(source, 'release', buildTypes.open);
const releaseBody = source.slice(release.open + 1, release.end);
if (/signingConfig\s+signingConfigs\.debug/.test(releaseBody)) {
  const changed = releaseBody.replace(/signingConfig\s+signingConfigs\.debug/, 'signingConfig signingConfigs.release');
  source = source.slice(0, release.open + 1) + changed + source.slice(release.end);
} else if (!/signingConfig\s+signingConfigs\.release/.test(releaseBody)) {
  source = source.slice(0, release.open + 1) + '\n            signingConfig signingConfigs.release' + releaseBody + source.slice(release.end);
}

fs.writeFileSync(gradlePath, source);
console.log('Android release signing configuration applied.');
