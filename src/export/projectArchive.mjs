import { validateZipEntries } from '../utils/archivePolicy.mjs';
import { boundedBase64ToBytes, rawZipPreflight } from '../utils/rawZipPreflight.mjs';
import { sanitiseDocumentForExport, sanitiseRevisionForExport } from '../documents/documentDomain.mjs';
import { assertNoProhibitedProperties, sanitizeForOrdinaryExport } from '../utils/privacy.mjs';
import { sha256Hex } from '../utils/sha256.mjs';

const loadJSZip = async () => (await import('jszip')).default;
const hash = (value) => sha256Hex(String(value));
const safeJson = (value) => JSON.stringify(value, null, 2);
const cleanMetadata = (value = {}) => sanitizeForOrdinaryExport(value || {});

export const PROJECT_ARCHIVE_SCHEMA_VERSION = 2;
export const projectArchivePayload = (state, workspaceId) => {
  const workspace = (state.workspaces || []).find((item) => item.id === workspaceId);
  if (!workspace) throw new Error('Workspace not found.');
  const chats = (state.chats || []).filter((chat) => chat.workspaceId === workspaceId).map(({ messages, ...chat }) => ({ ...chat, messages: (messages || []).map(({ apiContent, transientContext, documentContext, extractedText, ...message }) => message) }));
  const docs = (state.documents || []).filter((doc) => doc.workspaceId === workspaceId).map(sanitiseDocumentForExport);
  const docIds = new Set(docs.map((doc) => doc.id));
  const revisions = (state.documentRevisions || []).filter((revision) => docIds.has(revision.documentId)).map(sanitiseRevisionForExport);
  const safeWorkspace = cleanMetadata(workspace);
  return { workspace: safeWorkspace, chats, documents: docs, documentRevisions: revisions, notes: workspace.notes || [], tags: workspace.tags || [], folders: workspace.folders || [], bookmarks: workspace.bookmarks || [], files: (workspace.attachmentMetadata || []).filter((file) => file.retained).map(cleanMetadata), exportSchemaVersion: PROJECT_ARCHIVE_SCHEMA_VERSION };
};

export const createProjectArchive = async (state, workspaceId) => {
  const JSZip = await loadJSZip();
  const payload = projectArchivePayload(state, workspaceId);
  const files = { 'workspace.json': payload.workspace, 'chats.json': payload.chats, 'documents.json': payload.documents, 'document-revisions.json': payload.documentRevisions, 'notes.json': payload.notes, 'tags.json': payload.tags, 'folders.json': payload.folders, 'bookmarks.json': payload.bookmarks, 'files.json': payload.files };
  const integrity = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, hash(safeJson(content))]));
  const manifest = { manifestSchemaVersion: 1, archiveSchemaVersion: PROJECT_ARCHIVE_SCHEMA_VERSION, type: 'ai-console-project', app: 'AI Console', workspaceId, createdAt: new Date().toISOString(), files: Object.keys(files), integrityAlgorithm: 'SHA-256', integrity };
  const zip = new JSZip(); Object.entries(files).forEach(([path, content]) => zip.file(path, safeJson(content))); zip.file('manifest.json', safeJson(manifest));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
};

export const parseProjectArchive = async (data) => {
  const preflightBytes = typeof data === 'string' ? boundedBase64ToBytes(data) : data;
  rawZipPreflight(preflightBytes);
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(preflightBytes, { createFolders: false });
  const entries = Object.values(zip.files).map((entry) => ({ name: entry.name, dir: entry.dir, _data: entry._data || {} })); validateZipEntries(entries);
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
  const allowedNames = new Set(['manifest.json','workspace.json','chats.json','documents.json','document-revisions.json','notes.json','tags.json','folders.json','bookmarks.json','files.json']);
  if (names.some((name) => !allowedNames.has(name))) throw new Error('Project archive contains unexpected members.');
  if (!names.includes('manifest.json')) throw new Error('Project archive manifest is missing.');
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  if (!manifest || manifest.type !== 'ai-console-project' || ![1, PROJECT_ARCHIVE_SCHEMA_VERSION].includes(manifest.archiveSchemaVersion) || (manifest.archiveSchemaVersion === PROJECT_ARCHIVE_SCHEMA_VERSION && manifest.integrityAlgorithm !== 'SHA-256')) throw new Error('Unsupported or future project archive schema.');
  const required = ['workspace.json', 'chats.json', 'notes.json', 'tags.json', 'folders.json', 'bookmarks.json', 'files.json'];
  const optionalV2 = ['documents.json', 'document-revisions.json'];
  if (required.some((name) => !names.includes(name))) throw new Error('Project archive is incomplete.');
  const parsed = {};
  for (const name of [...required, ...optionalV2.filter((name) => names.includes(name))]) { const raw = await zip.file(name).async('string'); if (hash(raw) !== manifest.integrity?.[name]) throw new Error(`Project archive checksum mismatch: ${name}`); parsed[name.replace('.json', '').replace('document-revisions','documentRevisions')] = JSON.parse(raw); }
  parsed.documents ||= []; parsed.documentRevisions ||= [];
  assertNoProhibitedProperties(parsed, { exportScope: true });
  return { manifest, ...parsed };
};

export const bytesToBase64 = (bytes) => { const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []); let binary = ''; const chunk = 0x8000; for (let offset = 0; offset < source.length; offset += chunk) binary += String.fromCharCode(...source.subarray(offset, offset + chunk)); return globalThis.btoa(binary); };
export const projectArchiveFilename = (workspace, now = new Date()) => { const safe = String(workspace?.name || 'Workspace').replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'Workspace'; const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); return `${safe}_${stamp}.aiconsole-project.zip`; };

export const mergeParsedProjectArchive = (state, parsed, now = Date.now()) => {
  if (!parsed?.workspace || !Array.isArray(parsed.chats)) throw new Error('Project archive payload is malformed.');
  const suffix = `${now}-${Math.random().toString(36).slice(2, 8)}`; const workspaceId = `workspace-import-${suffix}`;
  const chatMap = new Map(parsed.chats.map((chat, index) => [chat.id, `chat-import-${suffix}-${index + 1}`]));
  const chats = parsed.chats.map((chat, chatIndex) => { const sourceMessages = Array.isArray(chat.messages) ? chat.messages : []; const messageMap = new Map(sourceMessages.map((message, index) => [message.messageId || message.id || `legacy-${index}`, `message-import-${suffix}-${chatIndex + 1}-${index + 1}`])); const messages = sourceMessages.map((message, index) => { const sourceId = message.messageId || message.id || `legacy-${index}`; const messageId = messageMap.get(sourceId); return { ...message, messageId, id: messageId, parentMessageId: message.parentMessageId ? messageMap.get(message.parentMessageId) || null : null, branchId: message.branchId || 'main', apiContent: undefined, transientContext: undefined, documentContext: undefined }; }); return { ...chat, id: chatMap.get(chat.id), workspaceId, workflowParentId: chat.workflowParentId ? chatMap.get(chat.workflowParentId) || null : null, messages, createdAt: Number(chat.createdAt) || now, updatedAt: now }; });
  const sourceDocs = Array.isArray(parsed.documents) ? parsed.documents : [];
  const docMap = new Map(sourceDocs.map((doc, index) => [doc.id, `document-import-${suffix}-${index + 1}`]));
  const sectionMaps = new Map();
  const documents = sourceDocs.map((doc, docIndex) => { const sectionMap = new Map((doc.sections || []).map((section,index)=>[section.id,`section-import-${suffix}-${docIndex+1}-${index+1}`])); sectionMaps.set(doc.id, sectionMap); return { ...sanitiseDocumentForExport(doc), id: docMap.get(doc.id), workspaceId, sections: (doc.sections || []).map((section)=>({...section,id:sectionMap.get(section.id)})), createdAt: Number(doc.createdAt)||now, updatedAt: now }; });
  const sourceRevs = Array.isArray(parsed.documentRevisions) ? parsed.documentRevisions : [];
  const revMap = new Map(sourceRevs.map((revision,index)=>[revision.id,`revision-import-${suffix}-${index+1}`]));
  const documentRevisions = sourceRevs.filter((revision)=>docMap.has(revision.documentId)).map((revision)=>({ ...sanitiseRevisionForExport(revision), id: revMap.get(revision.id), documentId: docMap.get(revision.documentId), parentRevisionId: revision.parentRevisionId ? revMap.get(revision.parentRevisionId) || null : null, snapshotOfRevisionId: revision.snapshotOfRevisionId ? revMap.get(revision.snapshotOfRevisionId) || null : null, sections: (revision.sections || []).map((section)=>({...section,id:sectionMaps.get(revision.documentId)?.get(section.id)||`section-import-${suffix}-${Math.random().toString(36).slice(2,8)}`})) }));
  const revisionsByDoc = new Map(); documentRevisions.forEach((rev)=>{ const arr=revisionsByDoc.get(rev.documentId)||[]; arr.push(rev); revisionsByDoc.set(rev.documentId,arr); });
  const documentsWithHeads = documents.map((doc)=>{ const old = sourceDocs.find((item)=>docMap.get(item.id)===doc.id); return { ...doc, revisionHeadId: old?.revisionHeadId ? revMap.get(old.revisionHeadId)||revisionsByDoc.get(doc.id)?.at(-1)?.id||null : revisionsByDoc.get(doc.id)?.at(-1)?.id||null }; });
  const workspace = { ...cleanMetadata(parsed.workspace), id: workspaceId, name: `${parsed.workspace.name || 'Imported Workspace'} (imported)`, chatIds: chats.map((chat) => chat.id), documentIds: documentsWithHeads.map((doc)=>doc.id), notes: Array.isArray(parsed.notes) ? parsed.notes : [], tags: Array.isArray(parsed.tags) ? parsed.tags : [], folders: Array.isArray(parsed.folders) ? parsed.folders : [], bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [], attachmentMetadata: Array.isArray(parsed.files) ? parsed.files.map(cleanMetadata) : [], archived: false, createdAt: now, updatedAt: now, exportMetadata: { schemaVersion: PROJECT_ARCHIVE_SCHEMA_VERSION, lastExportedAt: null } };
  return { ...state, workspaces: [...(state.workspaces || []), workspace], chats: [...chats, ...(state.chats || [])], documents: [...documentsWithHeads, ...(state.documents || [])], documentRevisions: [...documentRevisions, ...(state.documentRevisions || [])], activeWorkspaceId: workspaceId, activeDocumentId: documentsWithHeads[0]?.id || null, activeChatId: chats[0]?.id || state.activeChatId };
};
