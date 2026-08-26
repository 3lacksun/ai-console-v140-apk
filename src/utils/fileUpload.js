import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { ZIP_POLICY, utf8ByteLength, validateZipEntries } from './archivePolicy.mjs';
import { rawZipPreflight } from './rawZipPreflight.mjs';
import { UPLOAD_LIMITS, formatMb } from './uploadLimits.mjs';

const MAX_FILE_BYTES = UPLOAD_LIMITS.maxFileBytes;
const MAX_CONTEXT_CHARS = UPLOAD_LIMITS.maxContextCharacters;

const TEXT_EXTENSIONS = /\.(txt|md|markdown|csv|tsv|json|jsonl|js|jsx|mjs|cjs|ts|tsx|html|htm|css|scss|less|xml|svg|yml|yaml|toml|ini|cfg|conf|log|env|py|rb|go|rs|java|kt|kts|swift|c|cc|cpp|h|hpp|cs|php|sql|sh|bash|zsh|ps1|bat|gradle|properties|smali|proto|graphql|r|lua|pl|dart)$/i;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|heic|heif|bmp)$/i;
const IMAGE_MIMES = /^(image\/(png|jpe?g|jpg|webp|gif|heic|heif|bmp))$/i;

const clip = (v, r = MAX_CONTEXT_CHARS) => (v.length > r ? `${v.slice(0, r)}\n[Content truncated]` : v);
const isTextFile = (n, m) => TEXT_EXTENSIONS.test(n || '') || String(m || '').startsWith('text/') || String(m || '') === 'application/json';
const isImageFile = (n, m) => IMAGE_EXTENSIONS.test(n || '') || IMAGE_MIMES.test(m || '');
const isPdfFile = (n, m) => /\.pdf$/i.test(n || '') || m === 'application/pdf';
const isZipFile = (n, m) => /\.zip$/i.test(n || '') || m === 'application/zip' || m === 'application/x-zip-compressed';
const isApkFile = (n, m) => /\.apk$/i.test(n || '') || m === 'application/vnd.android.package-archive';

const base64ToBytes = (base64) => {
  const b = globalThis.atob(String(base64 || ''));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function actualFileSize(uri, declared = 0) {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    const size = Number(info?.size) || 0;
    if (size) return size;
  } catch (_) {}
  return Number(declared) || 0;
}

export async function assertSourceSize(uri, declared = 0, limit = MAX_FILE_BYTES) {
  const size = await actualFileSize(uri, declared);
  if (!size) throw new Error('Unable to establish source file size safely.');
  if (size > limit) throw new Error(`Please select a file smaller than ${formatMb(limit)} MB.`);
  return size;
}

function formatSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadZip(uri, declaredSize, limit = UPLOAD_LIMITS.zip.maxSourceBytes) {
  await assertSourceSize(uri, declaredSize, limit);
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = base64ToBytes(base64);
  rawZipPreflight(bytes);
  const zip = await JSZip.loadAsync(bytes, { createFolders: false });
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  validateZipEntries(entries);
  return { zip, entries };
}

async function extractZipContext(uri, declaredSize) {
  const { entries } = await loadZip(uri, declaredSize);
  let remaining = MAX_CONTEXT_CHARS;
  let observed = 0;
  const sections = [];
  let readable = 0;
  sections.push(`ZIP inventory (${entries.length} files):`);
  for (const entry of entries.slice(0, 400)) {
    const declared = Number(entry?._data?.uncompressedSize) || 0;
    sections.push(`- ${entry.name} (${formatSize(declared)})`);
  }
  if (entries.length > 400) sections.push(`- … ${entries.length - 400} more entries`);
  remaining = Math.max(0, remaining - sections.join('\n').length);

  for (const entry of entries) {
    if (!remaining) break;
    if (!isTextFile(entry.name, '')) {
      continue;
    }
    const declared = Number(entry?._data?.uncompressedSize) || 0;
    if (declared > ZIP_POLICY.maxEntryBytes) throw new Error(`ZIP entry is too large after expansion: ${entry.name}`);
    const raw = await entry.async('string');
    const bytesCount = utf8ByteLength(raw);
    observed += bytesCount;
    if (bytesCount > ZIP_POLICY.maxEntryBytes || observed > ZIP_POLICY.maxExpandedBytes) {
      throw new Error('ZIP archive expands beyond the allowed size limit.');
    }
    const content = clip(raw, remaining);
    remaining = Math.max(0, remaining - content.length);
    readable += 1;
    sections.push(`--- ${entry.name} ---\n${content}`);
  }
  return `ZIP archive contents (${readable} readable file(s), ${entries.length} total)\n\n${sections.join('\n')}`;
}

async function extractApkContext(uri, declaredSize) {
  const { entries } = await loadZip(uri, declaredSize, UPLOAD_LIMITS.maxApkBytes);
  const interesting = entries.filter((e) =>
    /^(AndroidManifest\.xml|resources\.arsc|classes\d*\.dex|META-INF\/.*\.(SF|RSA|DSA|MF))$/i.test(e.name)
    || /^lib\//i.test(e.name)
    || /^res\//i.test(e.name)
    || /^assets\//i.test(e.name),
  );
  const dex = entries.filter((e) => /\.dex$/i.test(e.name));
  const native = entries.filter((e) => /^lib\/.*\.so$/i.test(e.name));
  const lines = [
    `APK package inventory (${entries.length} entries)`,
    `DEX files: ${dex.map((e) => e.name).join(', ') || 'none listed'}`,
    `Native libs: ${native.length}`,
    'Notable paths:',
    ...interesting.slice(0, 80).map((e) => `- ${e.name} (${formatSize(Number(e?._data?.uncompressedSize) || 0)})`),
    'Full listing (capped):',
    ...entries.slice(0, 300).map((e) => `- ${e.name} (${formatSize(Number(e?._data?.uncompressedSize) || 0)})`),
  ];
  if (entries.length > 300) lines.push(`- … ${entries.length - 300} more entries`);
  return clip(lines.join('\n'));
}

async function extractImagePayload(asset, size) {
  if (size > UPLOAD_LIMITS.maxImageBytes) {
    throw new Error(`Please select an image smaller than ${formatMb(UPLOAD_LIMITS.maxImageBytes)} MB.`);
  }
  const mime = IMAGE_MIMES.test(asset.mimeType || '') ? asset.mimeType : guessImageMime(asset.name);
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  return {
    dataUrl: `data:${mime};base64,${base64}`,
    mime,
    note: `Image attached (${asset.name || 'image'}, ${formatSize(size)}). Send to a vision-capable model for visual analysis. Local OCR runs when an engine is available.`,
  };
}

function guessImageMime(name = '') {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.gif$/i.test(name)) return 'image/gif';
  if (/\.heic$/i.test(name) || /\.heif$/i.test(name)) return 'image/heic';
  return 'image/jpeg';
}

async function extractOneAsset(asset) {
  const fileName = asset.name || 'attachment';
  const mime = asset.mimeType || '';
  const size = await assertSourceSize(asset.uri, asset.size, MAX_FILE_BYTES);

  if (isApkFile(fileName, mime)) {
    const context = await extractApkContext(asset.uri, size);
    return { attachment: { name: fileName, size, kind: 'apk', type: mime || 'application/vnd.android.package-archive', uri: asset.uri }, context };
  }
  if (isZipFile(fileName, mime)) {
    const context = await extractZipContext(asset.uri, size);
    return { attachment: { name: fileName, size, kind: 'zip', type: mime || 'application/zip', uri: asset.uri }, context };
  }
  if (isPdfFile(fileName, mime)) {
    return {
      attachment: { name: fileName, size, kind: 'pdf', type: mime || 'application/pdf', uri: asset.uri },
      context: '',
      pdfAsset: { name: fileName, size, mimeType: mime || 'application/pdf', uri: asset.uri },
    };
  }
  if (isImageFile(fileName, mime)) {
    const image = await extractImagePayload(asset, size);
    return {
      attachment: { name: fileName, size, kind: 'image', type: image.mime, uri: asset.uri },
      context: image.note,
      imageDataUrl: image.dataUrl,
    };
  }
  if (isTextFile(fileName, mime)) {
    const context = clip(await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 }));
    return { attachment: { name: fileName, size, kind: 'text', type: mime || 'text/plain', uri: asset.uri }, context };
  }
  throw new Error('Supported uploads are text, images, PDF, ZIP and APK files.');
}

export async function pickAndExtractFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      '*/*',
      'application/pdf',
      'application/zip',
      'application/vnd.android.package-archive',
      'image/*',
      'text/*',
    ],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return null;
  const assets = (result.assets || []).slice(0, UPLOAD_LIMITS.maxPickerSelections);
  if (!assets.length) return null;
  const extracted = [];
  for (const asset of assets) {
    extracted.push(await extractOneAsset(asset));
  }
  return extracted.length === 1 ? extracted[0] : extracted;
}

export { MAX_FILE_BYTES, MAX_CONTEXT_CHARS, isTextFile, isImageFile, isApkFile };
