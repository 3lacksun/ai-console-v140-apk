/**
 * These packages stay in package.json for optional JS adapters, but their
 * native Android/iOS projects must not be autolinked. SDK 56 speech bindings
 * and unused biometric/screen-capture .so files have killed the process
 * before the JS boot shell can mount.
 */
module.exports = {
  dependencies: {
    'expo-speech-recognition': {
      platforms: { android: null, ios: null },
    },
    'expo-local-authentication': {
      platforms: { android: null, ios: null },
    },
    'expo-screen-capture': {
      platforms: { android: null, ios: null },
    },
  },
};
