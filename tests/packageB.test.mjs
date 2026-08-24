import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_SCHEMA_VERSION_B,
  activeBranchMessages,
  appendTurn,
  createChat,
  editMessageAndBranch,
  migratePackageAToB,
  regenerateAssistant,
  serialiseBState,
  setActiveBranch,
} from '../src/domain/conversationSchema.mjs';
import { GenerationStatus, createGeneration, transitionGeneration } from '../src/domain/generationState.mjs';
import { GenerationManager } from '../src/services/generationManager.mjs';
import { assignFolder, bulkArchive, searchChats, setPinned, sortChats } from '../src/domain/conversationOrganisation.mjs';
import { QueueStatus, cancelTurn, cleanCompletedTurns, createQueuedTurn, enqueueTurn, markFailed, markSent, retryTurn } from '../src/domain/offlineQueue.mjs';
import { deterministicFilename, exportChatMarkdown, exportChatText, parseChatImport, safeChatExport } from '../src/export/chatExport.mjs';
import { parseMarkdownBlocks, sanitiseMarkdown } from '../src/domain/safeMarkdown.mjs';

const legacy = {
  chats: [{ id: 'chat-a', title: 'Legacy', messages: [{ role: 'user', content: 'hello', apiContent: 'private attachment text' }, { role: 'assistant', content: 'world' }], estimatedTokens: 4 }],
  activeChatId: 'chat-a',
};

test('A to B migration is deterministic, idempotent, versioned, and removes transient attachment context', () => {
  const migrated = migratePackageAToB(legacy, 1000);
  const repeated = migratePackageAToB(migrated, 2000);
  assert.equal(migrated.storageSchemaVersion, STORAGE_SCHEMA_VERSION_B);
  assert.equal(migrated.chats[0].messages[0].messageId, repeated.chats[0].messages[0].messageId);
  assert.equal(migrated.chats[0].messages[1].parentMessageId, migrated.chats[0].messages[0].messageId);
  assert.equal(JSON.stringify(serialiseBState(migrated)).includes('private attachment text'), false);
  assert.equal(repeated.chats[0].title, 'Legacy');
});

test('edit, branch, switch and regenerate retain original branch and avoid duplicating the preceding user turn', () => {
  let state = migratePackageAToB(legacy, 1000);
  const sourceChat = state.chats[0];
  const originalUser = sourceChat.messages[0].messageId;
  state = editMessageAndBranch(state, sourceChat.id, originalUser, 'edited', 2000);
  const branch = state.chats[0].activeBranchId;
  assert.notEqual(branch, 'main');
  assert.equal(state.chats[0].messages.filter((message) => message.branchId === 'main').length, 2);
  assert.equal(activeBranchMessages(state.chats[0]).at(-2).content, 'edited');
  assert.equal(activeBranchMessages(state.chats[0]).at(-1).role, 'assistant');
  state = setActiveBranch(state, sourceChat.id, 'main', 2100);
  assert.equal(activeBranchMessages(state.chats[0]).length, 2);
  state = regenerateAssistant(state, sourceChat.id, state.chats[0].messages.find((message) => message.role === 'assistant').messageId, 2200);
  assert.equal(state.chats[0].messages.filter((message) => message.branchId === state.chats[0].activeBranchId && message.role === 'user').length, 1);
});

test('generation state rejects invalid transitions and supports terminal retry states', () => {
  const queued = createGeneration({ jobId: 'job', chatId: 'chat', targetMessageId: 'target', now: 1 });
  assert.throws(() => transitionGeneration(queued, GenerationStatus.COMPLETE, 2), /Invalid generation transition/);
  const streaming = transitionGeneration(queued, GenerationStatus.STREAMING, 2);
  const failed = transitionGeneration(streaming, GenerationStatus.FAILED, 3, 'network');
  assert.equal(failed.status, GenerationStatus.FAILED);
  assert.equal(transitionGeneration(failed, GenerationStatus.QUEUED, 4).status, GenerationStatus.QUEUED);
});

test('generation manager prevents duplicate sends, cancels deleted chats, ignores stale callbacks, retries and recovers lifecycle interruptions', () => {
  const states = [];
  let callbacks;
  const manager = new GenerationManager({ onStateChange: (_, job) => states.push(job?.status || 'REMOVED'), now: () => 100 });
  manager.setDeltaHandler(() => {});
  const job = manager.start({ chatId: 'chat', targetMessageId: 'target', streamFactory: (next) => { callbacks = next; return { cancel() {} }; } });
  assert.throws(() => manager.start({ chatId: 'chat', targetMessageId: 'target-two', streamFactory: () => ({}) }), /already active/);
  manager.cancelForDeletedChat('chat');
  callbacks.onDone();
  assert.equal(manager.get('chat'), null);
  const failed = manager.start({ chatId: 'retry', targetMessageId: 'target', streamFactory: (next) => { callbacks = next; return { cancel() {} }; } });
  callbacks.onError(new Error('network'));
  assert.equal(manager.get('retry').status, GenerationStatus.FAILED);
  manager.retry('retry', () => ({ cancel() {} }));
  manager.recoverAfterLifecycleTransition();
  assert.equal(manager.get('retry').status, GenerationStatus.FAILED);
  assert.ok(states.includes(GenerationStatus.CANCELLED));
  assert.ok(failed.jobId);
  assert.ok(job.jobId);
});

test('local organisation search, tags/folders, pin/archive and sort work without provider calls', () => {
  const now = 100;
  const older = { ...createChat('Alpha research', 1), messages: [{ content: 'needle content' }], updatedAt: 2 };
  const newer = { ...createChat('Beta', 3), updatedAt: 4 };
  const organised = assignFolder(setPinned(older, true, now), { id: 'folder-1', name: 'Research' }, now);
  assert.equal(searchChats([organised, newer], 'needle').length, 1);
  assert.equal(searchChats([organised, newer], 'research').length, 1);
  assert.equal(sortChats([newer, organised], 'updated')[0].id, organised.id);
  assert.equal(bulkArchive([organised, newer], [newer.id], now)[1].archived, true);
});

test('exports use deterministic formats and reject secrets or transient fields on import', () => {
  const chat = { ...createChat('Quarterly Plan', 1), messages: [{ messageId: 'm', role: 'user', content: 'hello', apiContent: 'secret context' }] };
  assert.match(deterministicFilename(chat, 'md', new Date('2026-01-02T03:04:05Z')), /^Quarterly_Plan_20260102T030405Z\.md$/);
  assert.match(exportChatText(chat), /USER/);
  assert.match(exportChatMarkdown(chat), /# Quarterly Plan/);
  const safe = safeChatExport(chat);
  assert.equal(JSON.stringify(safe).includes('secret context'), false);
  assert.equal(parseChatImport(safe).title, 'Quarterly Plan');
  assert.throws(() => parseChatImport({ ...safe, apiKey: 'leak' }), /prohibited/);
});

test('offline queue is persistent-domain safe, idempotent, retryable and cleans completed source turns', () => {
  const turn = createQueuedTurn({ chatId: 'chat', messageId: 'message', content: 'draft', now: 1 });
  let queue = enqueueTurn([], { chatId: 'chat', messageId: 'message', content: 'draft', now: 1 });
  queue = enqueueTurn(queue, { chatId: 'chat', messageId: 'message', content: 'draft', now: 2 });
  assert.equal(queue.length, 1);
  queue = markFailed([{ ...turn, status: QueueStatus.SENDING, attempts: 1 }], turn.id, 'offline', 2);
  queue = retryTurn(queue, turn.id, 3);
  assert.equal(queue[0].status, QueueStatus.QUEUED);
  const sent = markSent([{ ...turn, status: QueueStatus.SENDING }], turn.id, 3);
  assert.equal(cleanCompletedTurns(sent).length, 0);
  assert.equal(cancelTurn(queue, turn.id, 4)[0].status, QueueStatus.CANCELLED);
});

test('safe markdown keeps code blocks while stripping executable markup and malformed links', () => {
  assert.equal(sanitiseMarkdown('<script>alert(1)</script>[x](javascript:alert(1))').includes('<script>'), false);
  const blocks = parseMarkdownBlocks('Before\n```js\nconst x = 1;\n```\nAfter');
  assert.equal(blocks.find((block) => block.type === 'code').language, 'js');
});
