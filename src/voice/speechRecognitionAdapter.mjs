const REQUIRED_METHODS = ['addListener', 'requestPermissionsAsync', 'start', 'stop', 'abort'];

const normaliseError = (error) => {
  const message = String(error?.message || 'Speech recognition native module is unavailable.').split('\n')[0].trim();
  return message.slice(0, 180);
};

export async function loadSpeechRecognitionModule(loader = () => import('expo-speech-recognition')) {
  try {
    const loaded = await loader();
    const module = loaded?.ExpoSpeechRecognitionModule;
    if (!module || REQUIRED_METHODS.some((method) => typeof module[method] !== 'function')) {
      return { ok: false, status: 'UNAVAILABLE', error: 'Speech recognition native module is incomplete.' };
    }
    return { ok: true, status: 'READY', module };
  } catch (error) {
    return { ok: false, status: 'UNAVAILABLE', error: normaliseError(error) };
  }
}
