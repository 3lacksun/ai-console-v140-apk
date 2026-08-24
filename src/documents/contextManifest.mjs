import { createId } from '../domain/conversationSchema.mjs';

export const createDocumentSession = (now = Date.now()) => ({ id: createId('document-session'), sources: [], selectedSourceIds: [], selectedPageReferences: [], extractionStatus: 'IDLE', contextManifest: [], warning: null, createdAt: now, updatedAt: now });

export const buildContextManifest = (session, { maxCharacters = 60000 } = {}, now = Date.now()) => {
  const entries = (session.sources || []).filter((source) => session.selectedSourceIds.includes(source.id)).flatMap((source) => (source.pages || []).filter((page) => !session.selectedPageReferences.length || session.selectedPageReferences.some((reference) => reference.sourceId === source.id && reference.pageNumber === page.pageNumber)).map((page) => ({ sourceId: source.id, filename: source.filename, pageNumber: page.pageNumber, text: String(page.text || '') })));
  const totalCharacters = entries.reduce((total, entry) => total + entry.text.length, 0);
  return { ...session, contextManifest: entries, warning: totalCharacters > maxCharacters ? `Selected document context exceeds ${maxCharacters} characters.` : null, extractionStatus: entries.length ? 'READY' : 'EMPTY', updatedAt: now };
};

export const addDocumentSource = (session, source, now = Date.now()) => ({ ...session, sources: [...session.sources, { id: source.id || createId('source'), filename: source.filename || 'document', status: source.status || 'PENDING', pages: source.pages || [], retained: Boolean(source.retained), createdAt: now }], updatedAt: now });
export const selectDocumentSources = (session, sourceIds, now = Date.now()) => ({ ...session, selectedSourceIds: Array.from(new Set(sourceIds || [])), updatedAt: now });
export const selectDocumentPages = (session, references, now = Date.now()) => ({ ...session, selectedPageReferences: (references || []).filter((reference) => reference && reference.sourceId && Number.isInteger(reference.pageNumber)), updatedAt: now });
export const clearDocumentSession = (session, now = Date.now()) => ({ ...createDocumentSession(now), id: session?.id || createId('document-session') });
export const transientDocumentExport = (session) => ({ sessionId: session.id, sources: (session.sources || []).map(({ pages, ...metadata }) => metadata), selectedSourceIds: session.selectedSourceIds, selectedPageReferences: session.selectedPageReferences, warning: session.warning });
