const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

function upsertGradleProperty(properties, key, value) {
  const next = Array.isArray(properties) ? [...properties] : [];
  const index = next.findIndex((entry) => entry && entry.type === 'property' && entry.key === key);
  if (index >= 0) next[index] = { type: 'property', key, value };
  else next.push({ type: 'property', key, value });
  return next;
}

function with16kbPageSize(config) {
  config = withGradleProperties(config, (cfg) => {
    cfg.modResults = upsertGradleProperty(cfg.modResults, 'android.bundle.enableUncompressedNativeLibs', 'false');
    cfg.modResults = upsertGradleProperty(cfg.modResults, 'android.native.buildOutput', 'true');
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    const body = cfg.modResults.contents || '';
    if (body.includes('useLegacyPackaging')) return cfg;
    if (cfg.modResults.language === 'kt' || body.includes('packaging {')) {
      cfg.modResults.contents = body.replace(
        /android\s*\{/,
        'android {\n    packaging {\n        jniLibs {\n            useLegacyPackaging = false\n        }\n    }',
      );
      return cfg;
    }
    cfg.modResults.contents = body.replace(
      /android\s*\{/,
      'android {\n    packagingOptions {\n        jniLibs {\n            useLegacyPackaging false\n        }\n    }',
    );
    return cfg;
  });

  return config;
}

module.exports = with16kbPageSize;
