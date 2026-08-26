/**
 * Turn-based voice conversation with silence-based VAD.
 * States: idle → listening → thinking → speaking → listening …
 */

export const VoiceModeStatus = Object.freeze({
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  ERROR: 'error',
});

export const DEFAULT_VAD_SILENCE_MS = 1400;
export const DEFAULT_VAD_MIN_MS = 500;

export function createVoiceModeState(patch = {}) {
  return {
    status: VoiceModeStatus.IDLE,
    transcript: '',
    interim: '',
    reply: '',
    error: null,
    listeningStartedAt: 0,
    lastSpeechAt: 0,
    ...patch,
  };
}

export function canInterrupt(status) {
  return status === VoiceModeStatus.SPEAKING || status === VoiceModeStatus.THINKING;
}

/**
 * Pure helper: given a recognition result timestamp, should we finalize the utterance?
 */
export function shouldFinalizeByVad({
  now,
  lastSpeechAt,
  listeningStartedAt,
  silenceMs = DEFAULT_VAD_SILENCE_MS,
  minMs = DEFAULT_VAD_MIN_MS,
  hasTranscript,
}) {
  if (!hasTranscript) return false;
  if (!lastSpeechAt) return false;
  if (now - listeningStartedAt < minMs) return false;
  return now - lastSpeechAt >= silenceMs;
}
