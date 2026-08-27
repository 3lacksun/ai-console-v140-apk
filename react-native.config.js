/**
 * Optional packages stay in package.json for JS adapters, but their native
 * projects must not load on Android process start.
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
    'expo-av': {
      platforms: { android: null, ios: null },
    },
    'expo-splash-screen': {
      platforms: { android: null, ios: null },
    },
  },
};
