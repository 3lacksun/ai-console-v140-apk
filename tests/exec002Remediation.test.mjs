import test from 'node:test';
import assert from 'node:assert/strict';
import { PIN_THROTTLE_POLICY, normalisePinThrottle, pinThrottleRemainingMs, recordPinFailure, resetPinThrottle } from '../src/security/pinThrottle.mjs';
import { QueueStatus, cancelTurn, createQueuedTurn, recoverInterruptedTurns, retryTurn } from '../src/domain/offlineQueue.mjs';
import { createChat, createMessage, removeMessage } from '../src/domain/conversationSchema.mjs';
import { normaliseCState } from '../src/workspaces/workspaceSchema.mjs';
import { boundedBase64ToBytes } from '../src/utils/rawZipPreflight.mjs';
import { sha256Hex } from '../src/utils/sha256.mjs';

test('PIN throttle locks after five failures and resets after expiry', () => {
  let state = resetPinThrottle();
  const now = 1_000;
  for (let i = 0; i < PIN_THROTTLE_POLICY.maxFailures; i += 1) state = recordPinFailure(state, now + i);
  assert.ok(state.lockedUntil > now);
  assert.ok(pinThrottleRemainingMs(state, now + 10) > 0);
  assert.deepEqual(normalisePinThrottle(state, state.lockedUntil + 1), { failures: 0, lockedUntil: 0 });
});

test('cancelled offline turns can be explicitly retried and interrupted sends recover as failed', () => {
  const turn = createQueuedTurn({ chatId: 'chat-1', messageId: 'draft-1', content: 'hello', now: 1 });
  const cancelled = cancelTurn([turn], turn.id, 2)[0];
  assert.equal(cancelled.status, QueueStatus.CANCELLED);
  const retried = retryTurn([cancelled], turn.id, 3)[0];
  assert.equal(retried.status, QueueStatus.QUEUED);
  const recovered = recoverInterruptedTurns([{ ...turn, status: QueueStatus.SENDING }], 4)[0];
  assert.equal(recovered.status, QueueStatus.FAILED);
  assert.match(recovered.error, /interrupted/i);
});

test('message deletion removes all descendants and stale bookmarks', () => {
  const chat = { ...createChat('x', 1), id: 'chat-1', workspaceId: 'w1', bookmarks: ['m2', 'm4'], activeBranchId: 'branch-x', messages: [
    createMessage({ role: 'user', content: 'root', messageId: 'm1', now: 1 }),
    createMessage({ role: 'assistant', content: 'a', messageId: 'm2', parentMessageId: 'm1', now: 2 }),
    createMessage({ role: 'user', content: 'child', messageId: 'm3', parentMessageId: 'm2', branchId: 'branch-x', now: 3 }),
    createMessage({ role: 'assistant', content: 'deep', messageId: 'm4', parentMessageId: 'm3', branchId: 'branch-x', now: 4 }),
  ] };
  const state = { chats: [chat] };
  const next = removeMessage(state, 'chat-1', 'm2', 5).chats[0];
  assert.deepEqual(next.messages.map((m) => m.messageId), ['m1']);
  assert.deepEqual(next.bookmarks, []);
  assert.equal(next.activeBranchId, 'main');
});

test('active chat is always scoped to the active workspace', () => {
  const state = normaliseCState({
    storageSchemaVersion: 4,
    workspaces: [{ id: 'w1', name: 'One' }, { id: 'w2', name: 'Two' }],
    chats: [
      { id: 'c1', workspaceId: 'w1', title: 'One', messages: [] },
      { id: 'c2', workspaceId: 'w2', title: 'Two', messages: [] },
    ],
    activeWorkspaceId: 'w2',
    activeChatId: 'c1',
    documents: [], documentRevisions: [], offlineQueue: [],
  }, 10);
  assert.equal(state.activeWorkspaceId, 'w2');
  assert.equal(state.activeChatId, 'c2');
});

test('base64 source length is rejected before decoding when over policy', () => {
  const limits = { maxSourceBytes: 3, maxEntries: 100, maxCentralDirectoryBytes: 1024 };
  assert.throws(() => boundedBase64ToBytes('AAAAA', limits), /before base64 decoding/i);
  assert.deepEqual(Array.from(boundedBase64ToBytes('QUJD', limits)), [65, 66, 67]);
});

test('SHA-256 implementation matches standard known vectors', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
