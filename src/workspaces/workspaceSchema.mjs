import { createId, normaliseBState, STORAGE_SCHEMA_VERSION_B } from '../domain/conversationSchema.mjs';
import { normaliseDocument, sanitiseDocumentForExport, sanitiseRevisionForExport } from '../documents/documentDomain.mjs';
import { sanitizeChatForPersistence, stripPrivateProperties } from '../utils/privacy.mjs';
import { recoverInterruptedTurns } from '../domain/offlineQueue.mjs';

export const STORAGE_SCHEMA_VERSION_C = 4;

const at = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const cleanStrings = (values) => Array.from(new Set((values || []).filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())));

export const createWorkspace = ({ name = 'Default Workspace', description = '', now = Date.now(), id = createId('workspace') } = {}) => ({
  id,
  name: String(name || '').trim() || 'Untitled Workspace',
  description: String(description || ''),
  chatIds: [],
  documentIds: [],
  tags: [], folders: [], attachmentMetadata: [], notes: [], bookmarks: [], archived: false,
  createdAt: now, updatedAt: now,
  exportMetadata: { schemaVersion: 2, lastExportedAt: null },
});

const normaliseWorkspace = (raw = {}, now = Date.now()) => ({
  ...createWorkspace({ name: raw.name, description: raw.description, now: at(raw.createdAt, now), id: raw.id || createId('workspace') }),
  chatIds: cleanStrings(raw.chatIds), documentIds: cleanStrings(raw.documentIds), tags: cleanStrings(raw.tags),
  folders: Array.isArray(raw.folders) ? raw.folders : [], attachmentMetadata: Array.isArray(raw.attachmentMetadata) ? raw.attachmentMetadata : [],
  notes: Array.isArray(raw.notes) ? raw.notes : [], bookmarks: cleanStrings(raw.bookmarks), archived: Boolean(raw.archived),
  projectAIConfiguration: raw.projectAIConfiguration && typeof raw.projectAIConfiguration === 'object'
    ? { systemInstructions: String(raw.projectAIConfiguration.systemInstructions || '') }
    : null,
  updatedAt: at(raw.updatedAt, now), exportMetadata: raw.exportMetadata || { schemaVersion: 2, lastExportedAt: null },
});

const migrateLegacyToV3 = (state = {}, now = Date.now()) => {
  const b = normaliseBState(state, now);
  const defaultWorkspace = createWorkspace({ name: 'Default Workspace', description: 'Migrated Package B conversations', now, id: 'workspace-default' });
  const chats = b.chats.map((chat) => ({ ...chat, workspaceId: chat.workspaceId || defaultWorkspace.id }));
  defaultWorkspace.chatIds = chats.map((chat) => chat.id);
  defaultWorkspace.tags = cleanStrings(chats.flatMap((chat) => chat.tags || []));
  defaultWorkspace.folders = b.folders || [];
  return { ...b, storageSchemaVersion: 3, chats, workspaces: [defaultWorkspace], activeWorkspaceId: defaultWorkspace.id, promptLibrary: Array.isArray(state.promptLibrary) ? state.promptLibrary : [], documentSession: null, backupMetadata: { lastBackupAt: null, lastRestoreAt: null }, migration: { from: Number(state.storageSchemaVersion) || STORAGE_SCHEMA_VERSION_B, to: 3, migratedAt: now } };
};

export const migrateBToC = (state = {}, now = Date.now()) => {
  if (Number(state.storageSchemaVersion) >= STORAGE_SCHEMA_VERSION_C) return normaliseCState(state, now);
  const v3 = Number(state.storageSchemaVersion) >= 3 ? state : migrateLegacyToV3(state, now);
  return normaliseCState({ ...v3, storageSchemaVersion: STORAGE_SCHEMA_VERSION_C, documents: Array.isArray(v3.documents) ? v3.documents : [], documentRevisions: Array.isArray(v3.documentRevisions) ? v3.documentRevisions : [], activeDocumentId: v3.activeDocumentId || null, migration: { from: Number(state.storageSchemaVersion) || STORAGE_SCHEMA_VERSION_B, to: STORAGE_SCHEMA_VERSION_C, migratedAt: now } }, now);
};

export const normaliseCState = (state = {}, now = Date.now()) => {
  const migrated = Number(state.storageSchemaVersion) >= STORAGE_SCHEMA_VERSION_C ? state : migrateBToC(state, now);
  const workspaces = (migrated.workspaces || []).map((workspace) => normaliseWorkspace(workspace, now));
  const safeWorkspaces = workspaces.length ? workspaces : [createWorkspace({ now, id: 'workspace-default' })];
  const knownWorkspaces = new Set(safeWorkspaces.map((workspace) => workspace.id));
  const normalisedChats = normaliseBState({ chats: migrated.chats || [] }, now).chats;
  const knownChatIds = new Set(normalisedChats.map((chat) => chat.id));
  const chats = normalisedChats.map((chat) => ({ ...chat, workspaceId: knownWorkspaces.has(chat.workspaceId) ? chat.workspaceId : safeWorkspaces[0].id, workflowParentId: chat.workflowParentId && chat.workflowParentId !== chat.id && knownChatIds.has(chat.workflowParentId) ? chat.workflowParentId : null }));
  const documents = (migrated.documents || []).map((doc) => normaliseDocument({ ...doc, workspaceId: knownWorkspaces.has(doc.workspaceId) ? doc.workspaceId : safeWorkspaces[0].id }, now));
  const knownDocIds = new Set(documents.map((doc) => doc.id));
  const documentRevisions = (migrated.documentRevisions || []).filter((revision) => revision && knownDocIds.has(revision.documentId));
  const hydratedWorkspaces = safeWorkspaces.map((workspace) => ({ ...workspace, chatIds: chats.filter((chat) => chat.workspaceId === workspace.id).map((chat) => chat.id), documentIds: documents.filter((doc) => doc.workspaceId === workspace.id).map((doc) => doc.id) }));
  const activeWorkspaceId = knownWorkspaces.has(migrated.activeWorkspaceId) ? migrated.activeWorkspaceId : hydratedWorkspaces[0].id;
  const activeWorkspaceChatIds = new Set(chats.filter((chat) => chat.workspaceId === activeWorkspaceId).map((chat) => chat.id));
  const activeChatId = activeWorkspaceChatIds.has(migrated.activeChatId) ? migrated.activeChatId : chats.find((chat) => chat.workspaceId === activeWorkspaceId)?.id || '';
  const offlineQueue = recoverInterruptedTurns(Array.isArray(migrated.offlineQueue) ? migrated.offlineQueue : [], now);
  const workspaceDocIds = new Set(documents.filter((doc) => doc.workspaceId === activeWorkspaceId && doc.status !== 'DELETED').map((doc) => doc.id));
  const activeDocumentId = workspaceDocIds.has(migrated.activeDocumentId) ? migrated.activeDocumentId : documents.find((doc) => doc.workspaceId === activeWorkspaceId && doc.status !== 'DELETED')?.id || null;
  const documentGenerationJobs = (Array.isArray(migrated.documentGenerationJobs) ? migrated.documentGenerationJobs : []).filter((job) => job && knownDocIds.has(job.documentId)).map((job) => ({ id: String(job.id || createId('doc-job')), documentId: String(job.documentId), sectionId: job.sectionId ? String(job.sectionId) : null, operation: ['append','insert','replace'].includes(job.operation) ? job.operation : 'append', status: ['STREAMING','COMPLETE','FAILED','CANCELLED'].includes(job.status) ? job.status : 'FAILED', createdAt: at(job.createdAt, now), updatedAt: at(job.updatedAt, now), error: job.error ? String(job.error).slice(0, 240) : null }));
  return { ...migrated, storageSchemaVersion: STORAGE_SCHEMA_VERSION_C, chats, workspaces: hydratedWorkspaces, documents, documentRevisions, documentGenerationJobs, offlineQueue, activeWorkspaceId, activeChatId, activeDocumentId, promptLibrary: Array.isArray(migrated.promptLibrary) ? migrated.promptLibrary : [], documentSession: migrated.documentSession || null, backupMetadata: migrated.backupMetadata || { lastBackupAt: null, lastRestoreAt: null } };
};

const updateWorkspace = (state, workspaceId, updater, now = Date.now()) => ({ ...state, workspaces: state.workspaces.map((workspace) => workspace.id === workspaceId ? { ...updater(workspace), updatedAt: now } : workspace) });
export const addWorkspace = (state, values, now = Date.now()) => { const workspace = createWorkspace({ ...values, now }); return { ...state, workspaces: [...state.workspaces, workspace], activeWorkspaceId: workspace.id, activeChatId: '', activeDocumentId: null }; };
export const renameWorkspace = (state, workspaceId, name, now = Date.now()) => updateWorkspace(state, workspaceId, (workspace) => ({ ...workspace, name: String(name || '').trim() || workspace.name }), now);
export const archiveWorkspace = (state, workspaceId, archived, now = Date.now()) => updateWorkspace(state, workspaceId, (workspace) => ({ ...workspace, archived: Boolean(archived) }), now);
export const deleteWorkspace = (state, workspaceId) => {
  const remaining = state.workspaces.filter((workspace) => workspace.id !== workspaceId);
  if (!remaining.length) throw new Error('At least one workspace must remain.');
  const fallback = remaining[0];
  const documents = (state.documents || []).map((doc) => doc.workspaceId === workspaceId ? { ...doc, workspaceId: fallback.id, updatedAt: Date.now() } : doc);
  return normaliseCState({ ...state, workspaces: remaining, chats: state.chats.map((chat) => chat.workspaceId === workspaceId ? { ...chat, workspaceId: fallback.id } : chat), documents, activeWorkspaceId: state.activeWorkspaceId === workspaceId ? fallback.id : state.activeWorkspaceId, activeDocumentId: documents.some((doc) => doc.id === state.activeDocumentId) ? state.activeDocumentId : null });
};
export const workspaceChats = (state, workspaceId = state.activeWorkspaceId) => state.chats.filter((chat) => chat.workspaceId === workspaceId);
export const workspaceDocuments = (state, workspaceId = state.activeWorkspaceId) => (state.documents || []).filter((doc) => doc.workspaceId === workspaceId && doc.status !== 'DELETED');

export const deleteDocumentFromState = (state, documentId) => {
  const documents = (state.documents || []).filter((doc) => doc.id !== documentId);
  const documentRevisions = (state.documentRevisions || []).filter((revision) => revision.documentId !== documentId);
  return normaliseCState({
    ...state,
    documents,
    documentRevisions,
    documentGenerationJobs: (state.documentGenerationJobs || []).filter((job) => job.documentId !== documentId),
    activeDocumentId: state.activeDocumentId === documentId ? null : state.activeDocumentId,
  });
};
export const serialiseCState = (state, now = Date.now()) => {
  const c = normaliseCState(state, now);
  return {
    ...c,
    chats: c.chats.map(sanitizeChatForPersistence),
    workspaces: c.workspaces.map((workspace) => ({ ...stripPrivateProperties(workspace), projectAIConfiguration: workspace.projectAIConfiguration ? { systemInstructions: String(workspace.projectAIConfiguration.systemInstructions || '') } : null })),
    documents: c.documents.map(sanitiseDocumentForExport),
    documentRevisions: c.documentRevisions.map(sanitiseRevisionForExport),
    documentSession: c.documentSession ? { ...stripPrivateProperties(c.documentSession), contextManifest: [], sources: (c.documentSession.sources || []).map((source) => stripPrivateProperties(source)) } : null,
  };
};
export const addWorkspaceNote = (state, workspaceId, content, now = Date.now()) => updateWorkspace(state, workspaceId, (workspace) => ({ ...workspace, notes: [...workspace.notes, { id: createId('note'), content: String(content || ''), createdAt: now, updatedAt: now }] }), now);
