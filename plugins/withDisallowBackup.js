const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withDisallowBackup(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (application) {
      application.$ = application.$ || {};
      application.$['android:allowBackup'] = 'false';
      application.$['android:fullBackupOnly'] = 'false';
    }
    return cfg;
  });
};
