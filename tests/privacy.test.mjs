import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeChatsForPersistence } from '../src/utils/privacy.mjs';

test('transient attachment context is removed from persisted chats', () => {
  const chats = [{ id: '1', messages: [{ role: 'user', content: 'Visible', apiContent: 'SECRET FILE CONTENT', attachment: { name: 'a.txt' } }] }];
  const safe = sanitizeChatsForPersistence(chats);
  assert.equal(safe[0].messages[0].content, 'Visible');
  assert.equal(safe[0].messages[0].attachment.name, 'a.txt');
  assert.equal('apiContent' in safe[0].messages[0], false);
  assert.equal(chats[0].messages[0].apiContent, 'SECRET FILE CONTENT');
});
