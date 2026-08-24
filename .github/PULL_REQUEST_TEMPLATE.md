## Summary

Describe the change and the affected user workflow.

## Verification

- [ ] `npm ci` completed from a clean working tree
- [ ] `npm run check` passed
- [ ] `npm test` passed with zero skips
- [ ] `node scripts/ci-version-guard.mjs` passed
- [ ] `node scripts/verify-runtime-contract.mjs` passed
- [ ] Android/Expo build impact was checked
- [ ] No credentials, keystores, `.env` values, build outputs or `node_modules` are included

## Android release impact

- [ ] No release/signing impact
- [ ] Preview APK workflow affected
- [ ] Production signing workflow affected and documented
