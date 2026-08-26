/**
 * Optional local OCR adapter.
 * Uses a dynamically imported engine when present; otherwise reports unavailable
 * so images still attach for vision models.
 */
export const localOcrAdapter = {
  async recognise(source) {
    try {
      const loaded = await import('expo-text-extractor').catch(() => null);
      const recognise = loaded?.recognize || loaded?.default?.recognize || loaded?.extractText;
      if (typeof recognise !== 'function') {
        throw new Error('NO_ENGINE');
      }
      const result = await recognise(source?.uri);
      const text = typeof result === 'string' ? result : (result?.text || '');
      return { text: String(text || '') };
    } catch (_) {
      const err = new Error('Local OCR engine is not installed in this build.');
      err.code = 'OCR_UNAVAILABLE';
      throw err;
    }
  },
};
