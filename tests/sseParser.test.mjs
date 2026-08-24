import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseParser } from '../src/utils/sseParser.mjs';

test('SSE JSON split across chunks emits exactly once and final tail flushes', () => {
  const values = [];
  const parser = createSseParser((value) => values.push(value.choices?.[0]?.delta?.content));
  parser.push('data: {"choices":[{"delta":{"content":"Hello');
  parser.push(' world"}}]}\n');
  parser.push('data: not-json\n');
  parser.push('data: {"choices":[{"delta":{"content":"!"}}]}');
  parser.flush();
  assert.deepEqual(values, ['Hello world', '!']);
});
