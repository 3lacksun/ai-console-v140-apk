/**
 * Android-safe TTS helpers.
 * Speech-to-text never plays speaker audio; text-to-speech must claim a playback
 * audio session or Android may route to a silent/earpiece path.
 */

let audioModulePromise = null;

async function loadAudio() {
  if (!audioModulePromise) {
    audioModulePromise = import('expo-av')
      .then((mod) => mod.Audio || mod.default?.Audio || null)
      .catch(() => null);
  }
  return audioModulePromise;
}

export async function preparePlaybackAudioSession() {
  const Audio = await loadAudio();
  if (!Audio?.setAudioModeAsync) return false;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
    });
    return true;
  } catch (_) {
    return false;
  }
}

export async function prepareRecordingAudioSession() {
  const Audio = await loadAudio();
  if (!Audio?.setAudioModeAsync) return false;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
    });
    return true;
  } catch (_) {
    return false;
  }
}

export function normaliseSpeakRate(rate, platformOS) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return platformOS === 'ios' ? 0.5 : 1.0;
  // Clamp to a sensible range for device TTS engines
  return Math.min(1.5, Math.max(0.6, n));
}
