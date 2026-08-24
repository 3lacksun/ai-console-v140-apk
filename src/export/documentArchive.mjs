import { deterministicFilename, exportChatHtml, exportChatMarkdown, exportChatText, safeChatExport } from './chatExport.mjs';
import { sha256Hex } from '../utils/sha256.mjs';

export const MAX_DOCUMENT_BUNDLE_SOURCE_BYTES = 8 * 1024 * 1024;
const utf8Bytes = (value) => globalThis.TextEncoder ? new TextEncoder().encode(String(value)).length : unescape(encodeURIComponent(String(value))).length;

export const documentZipFilename = (chat, date = new Date()) => deterministicFilename(chat, 'zip', date);

const loadJSZip = async () => (await import('jszip')).default;

export const createChatDocumentArchive = async (chat = {}, messages = [], createdAt = new Date().toISOString()) => {
  const safeChat = safeChatExport({ ...chat, messages });
  const files = {
    'chat.txt': exportChatText(chat, messages),
    'chat.md': exportChatMarkdown(chat, messages),
    'chat.html': exportChatHtml(chat, messages),
    'chat.json': JSON.stringify(safeChat, null, 2),
  };
  const sourceBytes = Object.values(files).reduce((total, content) => total + utf8Bytes(content), 0);
  if (sourceBytes > MAX_DOCUMENT_BUNDLE_SOURCE_BYTES) throw new Error('This chat is too large for a local document ZIP bundle. Export individual formats or shorten the chat first.');
  const integrity = Object.fromEntries(Object.entries(files).map(([name, content]) => [name, sha256Hex(content)]));
  const manifest = {
    archiveSchemaVersion: 2,
    type: 'ai-console-chat-document-bundle',
    app: 'AI Console',
    integrityAlgorithm: 'SHA-256',
    createdAt,
    files: Object.keys(files),
    integrity,
    sourceBytes,
    exclusions: ['API keys', 'PIN material', 'protected AI instructions', 'attachment extraction context', 'hidden request content'],
  };
  const JSZip = await loadJSZip();
  const zip = new JSZip();
  Object.entries(files).forEach(([name, content]) => zip.file(name, content));
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } });
};
