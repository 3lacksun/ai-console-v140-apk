import { createId } from '../domain/conversationSchema.mjs';

export const AttachmentStatus = Object.freeze({ ADDED: 'ADDED', PROCESSING: 'PROCESSING', READY: 'READY', FAILED: 'FAILED', CANCELLED: 'CANCELLED', REMOVED: 'REMOVED' });
const allowedKinds = new Set(['document', 'image', 'camera', 'gallery', 'pdf', 'text', 'zip']);

export const createAttachment = ({ name, uri = null, mimeType = '', size = 0, kind = 'document', source = 'document', now = Date.now(), id = createId('attachment') }) => ({
  id, name: String(name || 'Unnamed file'), uri, mimeType: String(mimeType || ''), size: Number(size) || 0, kind: allowedKinds.has(kind) ? kind : 'document', source, status: AttachmentStatus.ADDED, error: null, createdAt: now, updatedAt: now, privacy: 'TRANSIENT_CONTEXT_BY_DEFAULT', retainedMetadata: true,
});

export const createAttachmentSession = (now = Date.now()) => ({ id: createId('attachment-session'), files: [], createdAt: now, updatedAt: now, contextManifest: null });
const update = (session, updater, now = Date.now()) => ({ ...updater(session), updatedAt: now });
export const addAttachment = (session, attachment, now = Date.now()) => update(session, (current) => ({ ...current, files: [...current.files, attachment] }), now);
export const updateAttachmentStatus = (session, id, status, error = null, now = Date.now()) => update(session, (current) => ({ ...current, files: current.files.map((file) => file.id === id ? { ...file, status, error: error ? String(error) : null, updatedAt: now } : file) }), now);
export const reorderAttachment = (session, id, destinationIndex, now = Date.now()) => update(session, (current) => { const from = current.files.findIndex((file) => file.id === id); if (from < 0 || destinationIndex < 0 || destinationIndex >= current.files.length) throw new Error('Invalid attachment reorder request.'); const files = [...current.files]; const [file] = files.splice(from, 1); files.splice(destinationIndex, 0, file); return { ...current, files }; }, now);
export const removeAttachment = (session, id, now = Date.now()) => update(session, (current) => ({ ...current, files: current.files.filter((file) => file.id !== id) }), now);
export const cancelAttachment = (session, id, now = Date.now()) => updateAttachmentStatus(session, id, AttachmentStatus.CANCELLED, 'Cancelled by user.', now);
export const validateAttachment = (file, { maxBytes = 2 * 1024 * 1024, allowedMimeTypes = [] } = {}) => { if (!file?.name) throw new Error('Attachment name is required.'); if (file.size > maxBytes) throw new Error(`Attachment exceeds the ${maxBytes} byte size ceiling.`); if (allowedMimeTypes.length && file.mimeType && !allowedMimeTypes.includes(file.mimeType)) throw new Error('Unsupported file type.'); return true; };
export const attachmentMetadataForPersistence = (session) => ({ id: session.id, files: session.files.map(({ uri, apiContent, extractedText, context, ...metadata }) => metadata), createdAt: session.createdAt, updatedAt: session.updatedAt });
export const buildTransientAttachmentContext = (session, extracts = {}) => session.files.filter((file) => file.status === AttachmentStatus.READY).map((file) => ({ attachmentId: file.id, filename: file.name, content: String(extracts[file.id] || '') })).filter((item) => item.content);
