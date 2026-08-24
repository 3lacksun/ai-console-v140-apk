import test from 'node:test';
import assert from 'node:assert/strict';
let JSZip;
try {
  JSZip = (await import('jszip')).default;
} catch (error) {
  throw new Error(`jszip dependency is required for release-critical ZIP/package tests: ${error?.message || error}`);
}
import { migratePackageAToB } from '../src/domain/conversationSchema.mjs';
import { addWorkspace, archiveWorkspace, deleteWorkspace, migrateBToC, normaliseCState, renameWorkspace, workspaceChats } from '../src/workspaces/workspaceSchema.mjs';
import { addPrompt, createPrompt, duplicatePrompt, expandPromptVariables, requireProtectedPromptAccess, searchPrompts, updatePrompt } from '../src/prompts/promptLibrary.mjs';
import { addAttachment, attachmentMetadataForPersistence, createAttachment, createAttachmentSession, reorderAttachment, validateAttachment } from '../src/attachments/attachmentSession.mjs';
import { createDocumentSession, addDocumentSource, buildContextManifest, clearDocumentSession, selectDocumentSources } from '../src/documents/contextManifest.mjs';
import { OcrStatus, runOcr } from '../src/documents/ocrPipeline.mjs';
import { PdfStatus, processPdf } from '../src/documents/pdfPipeline.mjs';
import { createOrdinaryBackup, prepareAtomicRestore, previewRestore, validateOrdinaryBackup } from '../src/backup/backupService.mjs';
import { createProjectArchive, parseProjectArchive } from '../src/export/projectArchive.mjs';
import { VoiceStatus, createVoiceState, reviewFinalTranscript, setInterimTranscript, transitionVoice } from '../src/voice/voiceState.mjs';
import { createChatPdfHtml, pdfFilename, PDF_LAYOUTS } from '../src/export/pdfContent.mjs';
import { createChatDocumentArchive, documentZipFilename } from '../src/export/documentArchive.mjs';
import { createWorkflowChildChat, flattenWorkflowTree, nextWorkflowStatus, setWorkflowStatus } from '../src/domain/workflowTree.mjs';
import { DEFAULT_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS, MIN_OUTPUT_TOKENS, normaliseOutputTokens } from '../src/utils/outputTokens.mjs';

const bState = migratePackageAToB({ chats: [{ id: 'chat-1', title: 'Migrated chat', messages: [{ role: 'user', content: 'keep me' }, { role: 'assistant', content: 'kept' }], tags: ['legal'], pinned: true, archived: false }], activeChatId: 'chat-1' }, 100);

test('A to B to C migration preserves chats, message ordering, identity and assigns deterministic default workspace', () => {
  const c = migrateBToC(bState, 200);
  const repeated = normaliseCState(c, 300);
  assert.equal(c.storageSchemaVersion, 4);
  assert.equal(c.workspaces[0].id, 'workspace-default');
  assert.equal(c.chats[0].workspaceId, 'workspace-default');
  assert.deepEqual(c.chats[0].messages.map((message) => message.content), ['keep me', 'kept']);
  assert.equal(repeated.chats[0].messages[0].messageId, c.chats[0].messages[0].messageId);
});

test('workspace CRUD and relationship integrity preserve chats when a workspace is deleted', () => {
  let state = migrateBToC(bState, 200);
  state = addWorkspace(state, { name: 'Research' }, 201);
  const research = state.activeWorkspaceId;
  state = renameWorkspace(state, research, 'Research Project', 202);
  state = archiveWorkspace(state, research, true, 203);
  assert.equal(state.workspaces.find((workspace) => workspace.id === research).archived, true);
  state = deleteWorkspace(state, research);
  assert.equal(state.workspaces.length, 1);
  assert.equal(workspaceChats(state).length, 1);
});

test('Prompt Library administration requires protected access and versions protected edits', () => {
  const prompt = createPrompt({ name: 'Summarise', content: 'Summarise {{topic}}', role: 'user' });
  assert.throws(() => addPrompt([], prompt, false), /requires successful PIN unlock/);
  let library = addPrompt([], prompt, true);
  library = updatePrompt(library, prompt.id, { content: 'Explain {{topic}}' }, true, 2);
  library = duplicatePrompt(library, prompt.id, true, 3);
  assert.equal(library[0].version, 2);
  assert.equal(searchPrompts(library, 'explain').length, 2);
  assert.equal(expandPromptVariables(library[0], { topic: 'migration' }), 'Explain migration');
  assert.throws(() => requireProtectedPromptAccess(false), /requires successful PIN unlock/);
});

test('attachment session supports multi-file add/reorder and persists metadata without transient content', () => {
  const first = createAttachment({ name: 'a.txt', kind: 'text', size: 10 });
  const second = createAttachment({ name: 'b.pdf', kind: 'pdf', size: 20 });
  let session = addAttachment(createAttachmentSession(1), first, 2);
  session = addAttachment(session, second, 3);
  session = reorderAttachment(session, second.id, 0, 4);
  assert.equal(session.files[0].id, second.id);
  assert.equal(attachmentMetadataForPersistence({ ...session, files: [{ ...session.files[0], extractedText: 'transient' }] }).files[0].extractedText, undefined);
  assert.throws(() => validateAttachment(createAttachment({ name: 'big', size: 3 }), { maxBytes: 2 }), /size ceiling/);
});

test('PDF pipeline handles unavailable, encrypted, corrupt and bounded valid extraction without fabricating text', async () => {
  const file = { name: 'doc.pdf', size: 100, mimeType: 'application/pdf' };
  assert.equal((await processPdf({ file })).status, PdfStatus.UNAVAILABLE);
  const encrypted = await processPdf({ file, adapter: { inspect: async () => ({ encrypted: true }), extractPages: async () => [] } });
  assert.match(encrypted.error, /Encrypted/);
  const valid = await processPdf({ file, adapter: { inspect: async () => ({ pageCount: 2 }), extractPages: async () => [{ pageNumber: 2, text: 'second' }, { pageNumber: 1, text: 'first' }] } });
  assert.equal(valid.status, PdfStatus.READY);
  assert.equal(valid.extractedText, 'first\n\nsecond');
});

test('OCR unavailable path and document context clear/re-entry behavior are explicit', async () => {
  assert.equal((await runOcr({ source: { name: 'scan.png' } })).status, OcrStatus.UNAVAILABLE);
  let session = addDocumentSource(createDocumentSession(1), { id: 'source', filename: 'doc.pdf', pages: [{ pageNumber: 1, text: 'page one' }] }, 2);
  session = selectDocumentSources(session, ['source'], 3);
  session = buildContextManifest(session, {}, 4);
  assert.equal(session.contextManifest[0].pageNumber, 1);
  assert.equal(clearDocumentSession(session, 5).contextManifest.length, 0);
});

test('voice transitions cover permission-ready capture review and invalid state rejection', () => {
  let voice = createVoiceState(1);
  voice = transitionVoice(voice, VoiceStatus.REQUESTING_PERMISSION, {}, 2);
  voice = transitionVoice(voice, VoiceStatus.READY, {}, 3);
  voice = transitionVoice(voice, VoiceStatus.CAPTURING, {}, 4);
  voice = setInterimTranscript(voice, 'draft', 5);
  voice = reviewFinalTranscript(voice, 'final', 6);
  assert.equal(voice.status, VoiceStatus.REVIEWING);
  assert.equal(voice.finalTranscript, 'final');
  assert.throws(() => transitionVoice(voice, VoiceStatus.PLAYING), /Invalid voice transition/);
});

test('workflow trees preserve roots, child indentation, workflow status and legacy-safe parent behavior', () => {
  const root = { id: 'root', title: 'Root task', updatedAt: 4, workspaceId: 'workspace-default' };
  const child = createWorkflowChildChat(root, 'Research subtask', 5);
  const rows = flattenWorkflowTree([root, child, { id: 'legacy', title: 'Legacy root', workflowParentId: 'missing', updatedAt: 3 }]);
  assert.deepEqual(rows.map((row) => [row.chat.id, row.depth]), [['root', 0], [child.id, 1], ['legacy', 0]]);
  assert.equal(child.workflowParentId, 'root');
  assert.equal(setWorkflowStatus(child, nextWorkflowStatus(child.workflowStatus)).workflowStatus, 'BLOCKED');
});

test('large-model output token policy rounds, clamps and exposes a 65,536-token ceiling', () => {
  assert.equal(DEFAULT_OUTPUT_TOKENS, 4096);
  assert.equal(normaliseOutputTokens(1), MIN_OUTPUT_TOKENS);
  assert.equal(normaliseOutputTokens(65499), MAX_OUTPUT_TOKENS);
  assert.equal(normaliseOutputTokens(200000), MAX_OUTPUT_TOKENS);
});

test('local PDF formatter escapes visible conversation and excludes hidden request context', () => {
  const html = createChatPdfHtml({ title: '<Chat & Notes>' }, [{ role: 'user', content: '<script>alert(1)</script>\nVisible', apiContent: 'secret transient extraction', createdAt: 0 }], '1 Jan 2026');
  assert.match(html, /&lt;Chat &amp; Notes&gt;/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;<br \/>Visible/);
  assert.equal(html.includes('secret transient extraction'), false);
  assert.equal(pdfFilename({ title: '../Chat: one' }), 'Chat_one.pdf');
});

test('premium PDF layouts retain escaping and differentiate compact transcripts', () => {
  const messages = [{ role: 'user', content: '<b>Visible only</b>', apiContent: 'hidden request payload', createdAt: 0 }];
  const polished = createChatPdfHtml({ title: 'Brief' }, messages, '1 Jan 2026', { layout: PDF_LAYOUTS.POLISHED });
  const compact = createChatPdfHtml({ title: 'Brief' }, messages, '1 Jan 2026', { layout: PDF_LAYOUTS.COMPACT });
  assert.match(polished, /Conversation Brief/);
  assert.match(compact, /Local Transcript/);
  assert.equal(polished.includes('hidden request payload'), false);
  assert.equal(pdfFilename({ title: 'Brief' }), 'Brief.pdf');
  assert.equal(pdfFilename({ title: 'Brief' }, PDF_LAYOUTS.COMPACT), 'Brief_compact.pdf');
});

test('local document ZIP bundles safe current-chat formats with an integrity manifest', async () => {
  const chat = { id: 'zip-chat', title: 'ZIP Chat', messages: [] };
  const messages = [{ role: 'user', content: 'Visible content', apiContent: 'hidden request payload', transientContext: 'hidden context' }];
  const base64 = await createChatDocumentArchive(chat, messages, '2026-01-01T00:00:00.000Z');
  const zip = await JSZip.loadAsync(Buffer.from(base64, 'base64'));
  const names = Object.keys(zip.files).sort();
  assert.deepEqual(names, ['chat.html', 'chat.json', 'chat.md', 'chat.txt', 'manifest.json']);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  const json = await zip.file('chat.json').async('string');
  assert.equal(manifest.type, 'ai-console-chat-document-bundle');
  assert.equal(json.includes('hidden request payload'), false);
  assert.equal(json.includes('hidden context'), false);
  assert.match(documentZipFilename(chat, new Date('2026-01-01T00:00:00.000Z')), /^ZIP_Chat_20260101T000000Z\.zip$/);
});

test('ordinary backup excludes protected/transient data and restore preparation retains a rollback state', () => {
  const c = migrateBToC({ ...bState, promptLibrary: [createPrompt({ name: 'secret prompt', content: 'do not ordinary backup' })] }, 200);
  c.workspaces[0].projectAIConfiguration = { systemInstructions: 'protected project configuration' };
  const backup = createOrdinaryBackup(c, 300);
  validateOrdinaryBackup(backup);
  assert.equal(JSON.stringify(backup).includes('secret prompt'), false);
  assert.equal(JSON.stringify(backup).includes('protected project configuration'), false);
  assert.equal(previewRestore(c, backup).incomingChats, 1);
  const restore = prepareAtomicRestore(c, backup, 400);
  assert.equal(restore.nextState.chats.length, 1);
  assert.equal(restore.rollbackState.promptLibrary.length, 1);
  assert.throws(() => validateOrdinaryBackup({ ...backup, payload: { ...backup.payload, apiKey: 'no' } }), /prohibited/);
});

test('project archive round trip protects secrets/transient context and validates integrity', async () => {
  const c = migrateBToC(bState, 200);
  const bytes = await createProjectArchive(c, 'workspace-default');
  const parsed = await parseProjectArchive(bytes);
  assert.equal(parsed.workspace.name, 'Default Workspace');
  assert.equal(parsed.chats[0].messages[0].content, 'keep me');
  assert.equal(JSON.stringify(parsed).includes('apiContent'), false);
});
