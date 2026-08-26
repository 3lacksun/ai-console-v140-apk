import fs from 'node:fs';

const appPath = 'App.js';
const lockPath = 'package-lock.json';
let s = fs.readFileSync(appPath, 'utf8');
const before = s;

const replaceOnce = (oldText, newText, label, alreadyNeedle) => {
  if ((alreadyNeedle && s.includes(alreadyNeedle)) || (s.includes(newText) && !s.includes(oldText))) {
    console.log(`ALREADY ${label}`);
    return;
  }
  if (!s.includes(oldText)) {
    console.warn(`SKIP ${label}`);
    return;
  }
  s = s.replace(oldText, newText);
  console.log(`OK ${label}`);
};

replaceOnce(
  "import { DEFAULT_SYSTEM_PROMPT, commitStateTransaction, formatProviderName, getApiKeyResult, getTogetherApiKeyResult, getJSON, getLLMSettingsPin, getVersionedAppStateResult, INITIAL_MODELS, persistAndVerifyVersionedAppState, setApiKey as persistApiKey, setTogetherApiKey as persistTogetherApiKey, setJSON, setLLMSettingsPin } from './src/utils/storage';",
  "import { DEFAULT_SYSTEM_PROMPT, commitStateTransaction, formatProviderName, getApiKeyResult, getTogetherApiKeyResult, getJSON, getLLMSettingsPin, getPinThrottle, getVersionedAppStateResult, INITIAL_MODELS, persistAndVerifyVersionedAppState, setApiKey as persistApiKey, setTogetherApiKey as persistTogetherApiKey, setJSON, setLLMSettingsPin, setPinThrottle } from './src/utils/storage';",
  'storage-import',
);
replaceOnce(
  "import { resolveProvider, DEFAULT_PROVIDER } from './src/utils/providers.mjs';",
  "import { resolveProvider, DEFAULT_PROVIDER, hasProviderKey } from './src/utils/providers.mjs';\nimport { persistImageToSandbox } from './src/utils/imagePersist.mjs';\nimport { protectSensitiveScreen, unprotectSensitiveScreen } from './src/security/screenGuard.mjs';\nimport { authenticateLocalUser } from './src/security/localAuth.mjs';",
  'imports',
);
replaceOnce('const APP_RELEASE_LABEL = \"Command Centre v1.5.3\";', \"const APP_RELEASE_LABEL = 'Command Centre v1.5.5';\", 'label-double');
replaceOnce(\"const APP_RELEASE_LABEL = 'Command Centre v1.5.3';\", \"const APP_RELEASE_LABEL = 'Command Centre v1.5.5';\", 'label-single');
replaceOnce(
  \"  const [pinGateOpen, setPinGateOpen] = useState(false);\\n  const [pinGateMode, setPinGateMode] = useState('unlock');\\n\",
  \"  const [pinGateOpen, setPinGateOpen] = useState(false);\\n  const [pinGateMode, setPinGateMode] = useState('unlock');\\n  const [pinLockRemainingMs, setPinLockRemainingMs] = useState(0);\\n\",
  'pin-state',
  'pinLockRemainingMs',
);
replaceOnce(
  \"    const lifecycleSubscription = AppState.addEventListener('change', (state) => { if (state !== 'active') generationManagerRef.current?.recoverAfterLifecycleTransition(); });\",
  \"    const lifecycleSubscription = AppState.addEventListener('change', (state) => {\\n      if (state !== 'active') {\\n        generationManagerRef.current?.recoverAfterLifecycleTransition();\\n        setPinGateOpen(false);\\n        setIsLLMSettingsOpen(false);\\n        setIsModelPickerOpen(false);\\n      }\\n    });\",
  'background-close',
);
