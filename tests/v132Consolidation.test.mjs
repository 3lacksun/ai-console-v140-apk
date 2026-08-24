import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPdfPagesFromBytes, extractPdfTextOperators, inspectPdfBytes } from '../src/documents/pdfTextExtract.mjs';
import { createPrompt, parsePromptImport, safePromptExport, updatePrompt } from '../src/prompts/promptLibrary.mjs';
import { addAttachment, createAttachment, createAttachmentSession, reorderAttachment } from '../src/attachments/attachmentSession.mjs';

const encoder = new TextEncoder();

const basicPdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 43 >>\nstream\nBT /F1 12 Tf 72 720 Td (First page) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>\nendobj\n6 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (Second page) Tj ET\nendstream\nendobj\n%%EOF`;

test('v1.3.2 local PDF extractor inventories pages and preserves page selection order', () => {
  const bytes = encoder.encode(basicPdf);
  const inspected = inspectPdfBytes(bytes);
  assert.equal(inspected.encrypted, false);
  assert.equal(inspected.pageCount, 2);
  const pages = extractPdfPagesFromBytes(bytes, [2]);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].pageNumber, 2);
  assert.match(pages[0].text, /Second page/);
});

test('v1.3.2 PDF operator extraction handles Tj and TJ text operators without fabricating OCR', () => {
  const text = extractPdfTextOperators('BT (Hello) Tj [( ) 120 (world)] TJ ET');
  assert.match(text, /Hello/);
  assert.match(text, /world/);
});

test('protected prompt export/import preserves enable, favourite and version metadata', () => {
  let library = [createPrompt({ name: 'A', content: 'Do {{thing}}', favourite: true, enabled: false, version: 4, now: 10 })];
  library = updatePrompt(library, library[0].id, { category: 'Work' }, true, 20);
  const parsed = parsePromptImport(JSON.stringify(safePromptExport(library)), true);
  assert.equal(parsed[0].enabled, false);
  assert.equal(parsed[0].favourite, true);
  assert.equal(parsed[0].version, 5);
  assert.equal(parsed[0].category, 'Work');
});

test('attachment session supports explicit user-visible reordering', () => {
  let session = createAttachmentSession(1);
  const first = createAttachment({ id: 'a', name: 'a.txt', now: 1 });
  const second = createAttachment({ id: 'b', name: 'b.txt', now: 1 });
  session = addAttachment(addAttachment(session, first, 2), second, 3);
  session = reorderAttachment(session, 'b', 0, 4);
  assert.deepEqual(session.files.map((file) => file.id), ['b', 'a']);
});
