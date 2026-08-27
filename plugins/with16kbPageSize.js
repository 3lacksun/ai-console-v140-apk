const { withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Samsung One UI is killing this process at Activity start when JNI libs are
 * memory-mapped from the APK (useLegacyPackaging false). The ELF files are
 * already 16KB-aligned internally. Extract them at install time instead so
 * dlopen uses a normal file, then keep extractNativeLibs=true on <application>.
 */
function applyLegacyPackaging(cfg) {
  let body = cfg.modResults.contents || '';
  body = body.replace(/useLegacyPackaging\s*=?\s*false/g, (match) =>
    match.includes('=') ? 'useLegacyPackaging = true' : 'useLegacyPackaging true',
  );
  if (!/useLegacyPackaging/.test(body)) {
    const groovyBlock =
      'android {\n    packagingOptions {\n        jniLibs {\n            useLegacyPackaging true\n        }\n    }';
    const ktsBlock =
      'android {\n    packaging {\n        jniLibs {\n            useLegacyPackaging = true\n        }\n    }';
    const useKts = cfg.modResults.language === 'kt' || /packaging\s*\{/.test(body);
    body = body.replace(/android\s*\{/, useKts ? ktsBlock : groovyBlock);
  }
  cfg.modResults.contents = body;
  return cfg;
}

function applyExtractNativeLibs(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (app) {
      app.$ = app.$ || {};
      app.$['android:extractNativeLibs'] = 'true';
    }
    return cfg;
  });
}

function with16kbPageSize(config) {
  config = withAppBuildGradle(config, applyLegacyPackaging);
  return applyExtractNativeLibs(config);
}

module.exports = with16kbPageSize;
