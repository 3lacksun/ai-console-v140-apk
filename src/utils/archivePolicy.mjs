export const ZIP_POLICY = Object.freeze({
  maxFiles: 100,
  maxExpandedBytes: 64 * 1024 * 1024,
  maxEntryBytes: 12 * 1024 * 1024,
  maxCompressionRatio: 100,
});

export function assertSafeArchivePath(name = '') {
  const normalised = String(name).replace(/\\/g, '/');
  const parts = normalised.split('/').filter(Boolean);
  if (!normalised || normalised.startsWith('/') || /^[A-Za-z]:\//.test(normalised) || parts.includes('..')) {
    throw new Error(`Unsafe ZIP entry path: ${name || '(empty)'}`);
  }
  return normalised;
}


export function utf8ByteLength(value = '') {
  let bytes = 0;
  for (const char of String(value)) {
    const codePoint = char.codePointAt(0);
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

export function getDeclaredZipSize(entry) {
  const data = entry?._data || {};
  const uncompressedSize = Number(data.uncompressedSize ?? entry?.uncompressedSize ?? 0) || 0;
  const compressedSize = Number(data.compressedSize ?? entry?.compressedSize ?? 0) || 0;
  return { uncompressedSize, compressedSize };
}

export function validateZipEntries(entries, policy = ZIP_POLICY) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('The ZIP file does not contain any files.');
  }
  if (entries.length > policy.maxFiles) {
    throw new Error(`ZIP archives may contain at most ${policy.maxFiles} files.`);
  }

  let declaredExpandedBytes = 0;
  for (const entry of entries) {
    assertSafeArchivePath(entry.name);
    if (/\.zip$/i.test(entry.name)) {
      throw new Error(`Nested ZIP archives are not supported: ${entry.name}`);
    }
    const { uncompressedSize, compressedSize } = getDeclaredZipSize(entry);
    if (uncompressedSize > policy.maxEntryBytes) {
      throw new Error(`ZIP entry is too large after expansion: ${entry.name}`);
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > policy.maxCompressionRatio) {
      throw new Error(`ZIP entry compression ratio is too high: ${entry.name}`);
    }
    declaredExpandedBytes += uncompressedSize;
    if (declaredExpandedBytes > policy.maxExpandedBytes) {
      throw new Error('ZIP archive expands beyond the allowed size limit.');
    }
  }
  return { declaredExpandedBytes };
}
