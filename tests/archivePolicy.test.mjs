import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeArchivePath, utf8ByteLength, validateZipEntries, ZIP_POLICY } from '../src/utils/archivePolicy.mjs';

test('safe archive paths are accepted', () => {
  assert.equal(assertSafeArchivePath('folder/file.txt'), 'folder/file.txt');
});

test('traversal and absolute paths are rejected', () => {
  for (const value of ['../secret.txt', '/etc/passwd', 'C:/temp/file.txt', 'a/../../b.txt']) {
    assert.throws(() => assertSafeArchivePath(value));
  }
});

test('zip entry-count, expansion and ratio limits are enforced', () => {
  const entry = (name, uncompressedSize, compressedSize) => ({ name, _data: { uncompressedSize, compressedSize } });
  assert.throws(() => validateZipEntries(Array.from({ length: ZIP_POLICY.maxFiles + 1 }, (_, i) => entry(`${i}.txt`, 1, 1))));
  assert.throws(() => validateZipEntries([entry('bomb.txt', ZIP_POLICY.maxEntryBytes + 1, 100)]));
  assert.throws(() => validateZipEntries([entry('ratio.txt', 1000000, 1)]));
  assert.throws(() => validateZipEntries([entry('nested.zip', 10, 10)]));
  assert.doesNotThrow(() => validateZipEntries([entry('ok.txt', 1000, 500)]));
});


test('counts UTF-8 bytes exactly for ASCII and multibyte text', () => {
  assert.equal(utf8ByteLength('abc'), 3);
  assert.equal(utf8ByteLength('£'), 2);
  assert.equal(utf8ByteLength('😀'), 4);
  assert.equal(utf8ByteLength('a£😀'), 7);
});
