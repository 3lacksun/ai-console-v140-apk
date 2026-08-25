console.error('BUILD_APK_RELEASE_GATE=BLOCKED');
console.error('Publishable AI Console APKs must be built by .github/workflows/android-apk.yml with run_emulator_checks=true.');
console.error('For a non-release diagnostic EAS build only, use: npm run build:apk:diagnostic');
process.exit(1);
