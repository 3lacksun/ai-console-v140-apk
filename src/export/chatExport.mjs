import { sanitiseMessageForStorage } from '../domain/conversationSchema.mjs';
import { assertNoProhibitedProperties } from '../utils/privacy.mjs';

const slug = (value) => String(value || 'AI_Console_Chat').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'AI_Console_Chat';
const stamp = (date = new Date()) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export const deterministicFilename = (chat, extension, date = new Date()) => `${slug(chat?.title)}_${stamp(date)}.${extension}`;

export const safeChatExport = (chat) => ({
  exportSchemaVersion: 1,
  type: 'ai-console-chat',
  chat: {
    id: chat.id,
    title: chat.title,
    pinned: Boolean(chat.pinned),
    archived: Boolean(chat.archived),
    tags: chat.tags || [],
    folderId: chat.folderId || null,
    folderName: chat.folderName || null,
    activeBranchId: chat.activeBranchId || 'main',
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: (chat.messages || []).map(sanitiseMessageForStorage),
  },
});

export const exportChatText = (chat, messages = chat?.messages || []) => messages.map((message) => `${String(message.role || 'user').toUpperCase()}:\n${message.content || ''}\n`).join('\n---\n\n');
export const exportChatMarkdown = (chat, messages = chat?.messages || []) => [`# ${chat?.title || 'AI Console Chat'}`, '', ...messages.map((message) => `## ${message.role === 'assistant' ? 'Assistant' : 'User'}\n\n${message.content || ''}`)].join('\n\n');
export const exportChatHtml = (chat, messages = chat?.messages || []) => {
  const escape = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(chat?.title)}</title></head><body><h1>${escape(chat?.title || 'AI Console Chat')}</h1>${messages.map((message) => `<section><h2>${message.role === 'assistant' ? 'Assistant' : 'User'}</h2><pre>${escape(message.content)}</pre></section>`).join('')}</body></html>`;
};

export const parseChatImport = (raw) => {
  let candidate;
  try { candidate = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { throw new Error('The chat export is not valid JSON.'); }
  if (!candidate || candidate.exportSchemaVersion !== 1 || candidate.type !== 'ai-console-chat' || !candidate.chat || !Array.isArray(candidate.chat.messages)) throw new Error('Unsupported chat export format.');
  assertNoProhibitedProperties(candidate, { exportScope: true });
  return candidate.chat;
};
