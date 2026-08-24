import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidSettingsPin, normaliseSettingsPin } from '../src/utils/settingsPolicy.mjs';

test('protected settings PIN requires exactly six digits', () => {
  assert.equal(isValidSettingsPin('123456'), true);
  assert.equal(isValidSettingsPin('12345'), false);
  assert.equal(isValidSettingsPin('12345a'), false);
  assert.equal(normaliseSettingsPin('12a34-5678'), '123456');
});
