/**
 * Command Centre upload / import ceilings.
 * Raised for large PDFs, images, APKs and project ZIPs while keeping zip-bomb guards.
 */
export const UPLOAD_LIMITS = Object.freeze({
  maxFileBytes: 150 * 1024 * 1024,
  maxImageBytes: 40 * 1024 * 1024,
  maxPdfBytes: 80 * 1024 * 1024,
  maxPdfPages: 500,
  maxPdfContextCharacters: 400000,
  maxApkBytes: 150 * 1024 * 1024,
  maxContextCharacters: 1_500_000,
  maxAttachmentsPerSession: 16,
  maxPickerSelections: 8,
  zip: Object.freeze({
    maxSourceBytes: 150 * 1024 * 1024,
    maxEntries: 2000,
    maxCentralDirectoryBytes: 16 * 1024 * 1024,
    maxFiles: 2000,
    maxExpandedBytes: 400 * 1024 * 1024,
    maxEntryBytes: 80 * 1024 * 1024,
    maxCompressionRatio: 100,
  }),
  documentJsonBytes: 32 * 1024 * 1024,
  documentBundleBytes: 80 * 1024 * 1024,
});

export function formatMb(bytes) {
  return Math.max(1, Math.floor(Number(bytes) / (1024 * 1024)));
}
