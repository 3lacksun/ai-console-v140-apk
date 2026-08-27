/**
 * expo-speech-recognition is still the SDK 56 line. Autolinking its native
 * package on Expo 57 / RN 0.86 / Android 15 (16KB pages) kills the process
 * before JS can mount a recovery shell. Voice stays optional via the JS adapter.
 */
module.exports = {
  dependencies: {
    'expo-speech-recognition': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
