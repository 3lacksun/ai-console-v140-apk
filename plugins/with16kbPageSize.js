const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Keep JNI libs in the APK with modern (non-legacy) packaging so 16KB page
 * devices can map arm64 .so files. Do not set
 * android.bundle.enableUncompressedNativeLibs — AGP 8.1+ removed that flag
 * and Expo SDK 57 / AGP 8+ will refuse to evaluate the project.
 */
function with16kbPageSize(config) {
  return withAppBuildGradle(config, (cfg) => {
    const body = cfg.modResults.contents || '';
    if (body.includes('useLegacyPackaging')) return cfg;

    const groovyBlock =
      'android {\n    packagingOptions {\n        jniLibs {\n            useLegacyPackaging false\n        }\n    }';
    const ktsBlock =
      'android {\n    packaging {\n        jniLibs {\n            useLegacyPackaging = false\n        }\n    }';

    const useKts = cfg.modResults.language === 'kt' || /packaging\s*\{/.test(body);
    cfg.modResults.contents = body.replace(/android\s*\{/, useKts ? ktsBlock : groovyBlock);
    return cfg;
  });
}

module.exports = with16kbPageSize;
