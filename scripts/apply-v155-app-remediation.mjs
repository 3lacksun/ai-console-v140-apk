import fs from 'node:fs';

const appPath = 'App.js';
let s = fs.readFileSync(appPath, 'utf8');
const before = s;

const already = (needle) => s.includes(needle);

s = s.replace(/Command Centre v1\.5\.[0-4]/g, 'Command Centre v1.5.5');
s = s.replace('const APP_RELEASE_LABEL = "Command Centre v1.5.5";', "const APP_RELEASE_LABEL = 'Command Centre v1.5.5';");

if (!already('getPinThrottle')) {
  s = s.replace(
    'getLLMSettingsPin, getVersionedAppStateResult',
    'getLLMSettingsPin, getPinThrottle, getVersionedAppStateResult',
  );
  s = s.replace('setJSON, setLLMSettingsPin }', 'setJSON, setLLMSettingsPin, setPinThrottle }');
}

if (!already('hasProviderKey')) {
  s = s.replace(
    "import { resolveProvider, DEFAULT_PROVIDER } from './src/utils/providers.mjs';",
    "import { resolveProvider, DEFAULT_PROVIDER, hasProviderKey } from './src/utils/providers.mjs';",
  );
}
if (!already('persistImageToSandbox')) {
  s = s.replace(
    "import { resolveProvider, DEFAULT_PROVIDER, hasProviderKey } from './src/utils/providers.mjs';",
    "import { resolveProvider, DEFAULT_PROVIDER, hasProviderKey } from './src/utils/providers.mjs';\nimport { persistImageToSandbox } from './src/utils/imagePersist.mjs';",
  );
}
if (!already('protectSensitiveScreen')) {
  s = s.replace(
    "import { persistImageToSandbox } from './src/utils/imagePersist.mjs';",
    "import { persistImageToSandbox } from './src/utils/imagePersist.mjs';\nimport { protectSensitiveScreen, unprotectSensitiveScreen } from './src/security/screenGuard.mjs';",
  );
}
if (!already('authenticateLocalUser')) {
  s = s.replace(
    "import { protectSensitiveScreen, unprotectSensitiveScreen } from './src/security/screenGuard.mjs';",
    "import { protectSensitiveScreen, unprotectSensitiveScreen } from './src/security/screenGuard.mjs';\nimport { authenticateLocalUser } from './src/security/localAuth.mjs';",
  );
}

if (!already('pinLockRemainingMs')) {
  s = s.replace(
    "  const [pinGateMode, setPinGateMode] = useState('unlock');\n",
    "  const [pinGateMode, setPinGateMode] = useState('unlock');\n  const [pinLockRemainingMs, setPinLockRemainingMs] = useState(0);\n",
  );
}

if (!already('setPinGateOpen(false);\n        setIsLLMSettingsOpen(false);')) {
  s = s.replace(
    "    const lifecycleSubscription = AppState.addEventListener('change', (state) => { if (state !== 'active') generationManagerRef.current?.recoverAfterLifecycleTransition(); });",
    "    const lifecycleSubscription = AppState.addEventListener('change', (state) => {\n      if (state !== 'active') {\n        generationManagerRef.current?.recoverAfterLifecycleTransition();\n        setPinGateOpen(false);\n        setIsLLMSettingsOpen(false);\n        setIsModelPickerOpen(false);\n      }\n    });",
  );
}

if (!already('const persistThrottle')) {
  s = s.replace(
    '  const requestProtectedSettingsAccess = async () => {',
    `  useEffect(() => {
    const sensitive = pinGateOpen || isLLMSettingsOpen;
    if (sensitive) void protectSensitiveScreen();
    else void unprotectSensitiveScreen();
    return () => { void unprotectSensitiveScreen(); };
  }, [pinGateOpen, isLLMSettingsOpen]);

  const persistThrottle = async (next) => {
    pinThrottleRef.current = next;
    setPinLockRemainingMs(pinThrottleRemainingMs(next, Date.now()));
    await setPinThrottle(next);
    await setJSON(PIN_THROTTLE_STORAGE_KEY, next);
  };

  const requestProtectedSettingsAccess = async () => {`,
  );
}

if (s.includes('getJSON(PIN_THROTTLE_STORAGE_KEY')) {
  s = s.replaceAll('await getJSON(PIN_THROTTLE_STORAGE_KEY, pinThrottleRef.current)', 'await getPinThrottle(pinThrottleRef.current)');
  s = s.replaceAll('await setJSON(PIN_THROTTLE_STORAGE_KEY, nextThrottle)', 'await persistThrottle(nextThrottle)');
  s = s.replaceAll('pinThrottleRef.current = resetPinThrottle();\n        await setJSON(PIN_THROTTLE_STORAGE_KEY, pinThrottleRef.current);', 'await persistThrottle(resetPinThrottle());');
}

if (!already('const handleUseBiometric')) {
  s = s.replace(
    '  const startGeneration = (chatId, targetMessageId, apiMessages, options = {}) => {',
    `  const handleUseBiometric = async () => {
    const result = await authenticateLocalUser();
    if (!result.ok) return result.reason === 'UNAVAILABLE' ? 'Device unlock is unavailable. Use the PIN.' : 'Device unlock failed. Use the PIN.';
    await persistThrottle(resetPinThrottle());
    setPinGateOpen(false);
    setIsLLMSettingsOpen(true);
    return '';
  };

  const startGeneration = (chatId, targetMessageId, apiMessages, options = {}) => {`,
  );
}

s = s.replace('isLoading || !apiKey.trim()) return;', 'isLoading || !hasProviderKey(activeProviderKey())) return;');
s = s.replace('if (!activeChat || !apiKey.trim()) return;', 'if (!activeChat || !hasProviderKey(activeProviderKey())) return;');
s = s.replace('offlineMode || !apiKey.trim() || !turn', 'offlineMode || !hasProviderKey(activeProviderKey()) || !turn');
s = s.replace(
  'if (!hydrated || offlineMode || !apiKey.trim()) return;',
  'if (!hydrated || offlineMode || !hasProviderKey(activeProviderKey())) return;',
);

if (s.includes("type: 'text', text: `OCR")) {
  s = s.replace(
    "attachmentExtractsRef.current.set(file.id, { type: 'text', text: `OCR (${file.name}):\\n${ocr.text}` });",
    "attachmentExtractsRef.current.set(file.id, { type: 'mixed', image: { type: 'image_url', image_url: { url: selected.imageDataUrl } }, text: `OCR (${file.name}):\\n${ocr.text}` });",
  );
  s = s.replace(
    "attachmentExtractsRef.current.set(file.id, { type: 'text', text: `OCR (${file.name}):\\n${ocr.text}` });",
    "attachmentExtractsRef.current.set(file.id, { type: 'mixed', image: { type: 'image_url', image_url: { url: dataUrl } }, text: `OCR (${file.name}):\\n${ocr.text}` });",
  );
}

if (!already("context.type==='mixed'")) {
  s = s.replace(
    "      if (context && typeof context==='object' && context.type==='image_url') imageParts.push(context);",
    "      if (context && typeof context==='object' && context.type==='mixed') {\n        if (context.image) imageParts.push(context.image);\n        if (context.text) textParts.push(String(context.text));\n      } else if (context && typeof context==='object' && context.type==='image_url') imageParts.push(context);",
  );
}

s = s.replace("    if (!apiKey) {\n      setError('Enter an OpenRouter API key", "    if (!hasProviderKey(apiKey)) {\n      setError('Enter an OpenRouter API key");

if (!already('persistImageToSandbox(result.url')) {
  s = s.replace(
    '      const result = await generateImage({ apiKey, prompt, preferredModel: model });\n      const now = Date.now();',
    '      const result = await generateImage({ apiKey, prompt, preferredModel: model });\n      const persistedUri = await persistImageToSandbox(result.url, FileSystem) || result.url;\n      const now = Date.now();',
  );
  s = s.replace(
    "imageUri: result.url,\n            attachment: { name: 'generated-image.png', kind: 'image', imageUri: result.url },",
    "imageUri: persistedUri,\n            attachment: { name: 'generated-image.png', kind: 'image', imageUri: persistedUri },",
  );
}

if (!already('lockRemainingMs={pinLockRemainingMs}')) {
  s = s.replace(
    '<PinGateModal visible={pinGateOpen} mode={pinGateMode} onClose={() => setPinGateOpen(false)} onSubmit={handlePinSubmit} returnFocusRef={protectedSettingsTriggerRef} palette={palette} />',
    '<PinGateModal visible={pinGateOpen} mode={pinGateMode} onClose={() => setPinGateOpen(false)} onSubmit={handlePinSubmit} onUseBiometric={handleUseBiometric} lockRemainingMs={pinLockRemainingMs} returnFocusRef={protectedSettingsTriggerRef} palette={palette} />',
  );
}

if (s !== before) fs.writeFileSync(appPath, s);
console.log(s === before ? 'App.js already remediated' : 'App.js remediations written');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
lock.name = pkg.name;
lock.version = pkg.version;
lock.packages = lock.packages || {};
lock.packages[''] = lock.packages[''] || {};
lock.packages[''].name = pkg.name;
lock.packages[''].version = pkg.version;
lock.packages[''].dependencies = { ...(lock.packages[''].dependencies || {}), ...(pkg.dependencies || {}) };
lock.packages[''].devDependencies = { ...(lock.packages[''].devDependencies || {}), ...(pkg.devDependencies || {}) };
fs.writeFileSync('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
console.log(`package-lock identity ${lock.name}@${lock.version}`);
