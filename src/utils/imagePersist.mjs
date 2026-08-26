/**
 * Persist generated / remote images into the app sandbox so chat history
 * does not depend on ephemeral provider URLs or in-memory data URLs.
 */
export async function persistImageToSandbox(source, fileSystem) {
  const url = String(source || '').trim();
  if (!url) return '';
  if (/^(file|content):/i.test(url) || url.startsWith('/')) return url;
  if (!fileSystem?.documentDirectory) return /^(https|http|data):/i.test(url) ? url : '';
  const dir = `${fileSystem.documentDirectory}generated-images/`;
  const dest = `${dir}img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  try {
    if (typeof fileSystem.makeDirectoryAsync === 'function') {
      await fileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    }
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1] || '';
      if (!base64) return '';
      await fileSystem.writeAsStringAsync(dest, base64, { encoding: fileSystem.EncodingType.Base64 });
      return dest;
    }
    if (/^https?:/i.test(url) && typeof fileSystem.downloadAsync === 'function') {
      const downloaded = await fileSystem.downloadAsync(url, dest);
      return downloaded?.uri || dest;
    }
  } catch (_) {
    return url;
  }
  return url;
}
