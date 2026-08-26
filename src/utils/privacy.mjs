const PROHIBITED_KEYS = new Set([
  'apikey','openrouterkey','llmsettingspin','pinverifier','providersecret','secret','password',
  'apicontent','transientcontext','documentcontext','extractedtext','hiddencontext','rawprovidercontent',
]);
const EXPORT_ONLY_PROHIBITED = new Set(['projectaiconfiguration']);
const lower = (key) => String(key || '').replace(/[_-]/g,'').toLowerCase();
export const isProhibitedPropertyKey = (key, { exportScope = false } = {}) => PROHIBITED_KEYS.has(lower(key)) || (exportScope && EXPORT_ONLY_PROHIBITED.has(lower(key)));

export function findProhibitedPropertyPaths(value, { exportScope = false, path = '$' } = {}, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) { value.forEach((item, index) => findProhibitedPropertyPaths(item, { exportScope, path: `${path}[${index}]` }, found)); return found; }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (isProhibitedPropertyKey(key, { exportScope })) found.push(childPath);
    else findProhibitedPropertyPaths(child, { exportScope, path: childPath }, found);
  }
  return found;
}
export function assertNoProhibitedProperties(value, options = {}) {
  const paths = findProhibitedPropertyPaths(value, options);
  if (paths.length) throw new Error(`Payload contains prohibited private fields: ${paths.slice(0, 4).join(', ')}`);
  return true;
}
export function stripPrivateProperties(value, { exportScope = false } = {}) {
  if (Array.isArray(value)) return value.map((item) => stripPrivateProperties(item, { exportScope }));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) if (!isProhibitedPropertyKey(key, { exportScope })) out[key] = stripPrivateProperties(child, { exportScope });
  return out;
}
const safeLocalUri = (value) => {
  const uri = String(value || '').trim();
  if (!uri) return '';
  if (uri.startsWith('data:')) return '';
  if (/^(file|content|https|http):/i.test(uri) || uri.startsWith('/')) return uri;
  return '';
};
const safeAttachment = (attachment) => {
  if (!attachment || typeof attachment !== 'object') return undefined;
  const out = {};
  for (const key of ['id','name','type','mimeType','size','source','status','requiresReattach']) if (attachment[key] !== undefined) out[key] = attachment[key];
  const imageUri = safeLocalUri(attachment.imageUri);
  if (imageUri) out.imageUri = imageUri;
  return Object.keys(out).length ? out : undefined;
};
export function sanitizeMessageForPersistence(message = {}) {
  const safe = {
    messageId: message.messageId || message.id,
    parentMessageId: message.parentMessageId ?? null,
    branchId: message.branchId || 'main',
    role: message.role === 'assistant' ? 'assistant' : message.role === 'system' || message.role === 'developer' ? message.role : 'user',
    content: String(message.content || ''),
    createdAt: Number(message.createdAt) || 0,
    updatedAt: Number(message.updatedAt) || Number(message.createdAt) || 0,
  };
  for (const key of ['editedFromMessageId','regeneratedFromMessageId','failedAttemptId']) if (message[key]) safe[key] = message[key];
  const imageUri = safeLocalUri(message.imageUri);
  if (imageUri) safe.imageUri = imageUri;
  const attachment = safeAttachment(message.attachment); if (attachment) safe.attachment = attachment;
  return safe;
}
export function sanitizeChatForPersistence(chat = {}) {
  return {
    id: chat.id,
    workspaceId: chat.workspaceId || null,
    title: String(chat.title || 'New chat'),
    messages: Array.isArray(chat.messages) ? chat.messages.map(sanitizeMessageForPersistence) : [],
    estimatedTokens: Math.max(0, Number(chat.estimatedTokens) || 0),
    pinned: Boolean(chat.pinned), archived: Boolean(chat.archived),
    tags: Array.isArray(chat.tags) ? [...chat.tags] : [], folderId: chat.folderId || null, folderName: chat.folderName || null,
    activeBranchId: chat.activeBranchId || 'main', workflowParentId: chat.workflowParentId || null, workflowStatus: chat.workflowStatus || 'ACTIVE',
    bookmarks: Array.isArray(chat.bookmarks) ? stripPrivateProperties(chat.bookmarks) : [],
    createdAt: Number(chat.createdAt) || 0, updatedAt: Number(chat.updatedAt) || Number(chat.createdAt) || 0,
  };
}
export function sanitizeChatsForPersistence(chats = []) { return Array.isArray(chats) ? chats.map(sanitizeChatForPersistence) : []; }
export const sanitizeForOrdinaryExport = (value) => stripPrivateProperties(value, { exportScope: true });
