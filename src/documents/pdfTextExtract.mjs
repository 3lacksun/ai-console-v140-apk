const utf8Decoder = new TextDecoder('utf-8', { fatal: false });

// Hermes does not support TextDecoder('latin1'). PDF parsing needs a byte-preserving
// 1:1 mapping, not WHATWG windows-1252 semantics, so decode explicitly in chunks.
export const bytesToLatin1 = (input) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  const chunkSize = 0x8000;
  let output = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return output;
};

const unescapePdfLiteral = (value) => String(value || '')
  .replace(/\\([0-7]{1,3})/g, (_m, octal) => String.fromCharCode(parseInt(octal, 8)))
  .replace(/\\n/g, '\n')
  .replace(/\\r/g, '\r')
  .replace(/\\t/g, '\t')
  .replace(/\\b/g, '\b')
  .replace(/\\f/g, '\f')
  .replace(/\\\(/g, '(')
  .replace(/\\\)/g, ')')
  .replace(/\\\\/g, '\\');

const decodeHexText = (hex) => {
  const clean = String(hex || '').replace(/\s+/g, '');
  if (!clean) return '';
  const even = clean.length % 2 ? `${clean}0` : clean;
  const bytes = new Uint8Array(even.length / 2);
  for (let index = 0; index < even.length; index += 2) bytes[index / 2] = parseInt(even.slice(index, index + 2), 16) || 0;
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = '';
    for (let index = 2; index + 1 < bytes.length; index += 2) out += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    return out;
  }
  return utf8Decoder.decode(bytes).replace(/\u0000/g, '');
};

const literalPattern = /\((?:\\.|[^\\)])*\)/g;

export const extractPdfTextOperators = (content) => {
  const source = String(content || '');
  const lines = [];
  const push = (text) => { const normalised = String(text || '').replace(/[ \t]+/g, ' ').trim(); if (normalised) lines.push(normalised); };
  for (const block of source.matchAll(/BT([\s\S]*?)ET/g)) {
    const body = block[1];
    for (const match of body.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) push(unescapePdfLiteral(match[0].replace(/\s*Tj$/, '').slice(1, -1)));
    for (const match of body.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) push(decodeHexText(match[1]));
    for (const arrayMatch of body.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
      const parts = [];
      for (const token of arrayMatch[1].match(literalPattern) || []) parts.push(unescapePdfLiteral(token.slice(1, -1)));
      for (const token of arrayMatch[1].match(/<([0-9A-Fa-f\s]+)>/g) || []) parts.push(decodeHexText(token.slice(1, -1)));
      push(parts.join(''));
    }
    for (const match of body.matchAll(/\((?:\\.|[^\\)])*\)\s*['"]/g)) push(unescapePdfLiteral(match[0].replace(/\s*['"]$/, '').slice(1, -1)));
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const parseObjects = (pdfText) => {
  const objects = new Map();
  for (const match of String(pdfText || '').matchAll(/(\d+)\s+(\d+)\s+obj\b([\s\S]*?)endobj/g)) objects.set(Number(match[1]), { generation: Number(match[2]), body: match[3] });
  return objects;
};

const pageContentRefs = (body) => {
  const contents = body.match(/\/Contents\s+(\[[\s\S]*?\]|\d+\s+\d+\s+R)/)?.[1] || '';
  return Array.from(contents.matchAll(/(\d+)\s+\d+\s+R/g)).map((match) => Number(match[1]));
};

const streamBytesFromBody = (body, sourceBytes, pdfText) => {
  const streamIndex = body.indexOf('stream');
  const endIndex = body.lastIndexOf('endstream');
  if (streamIndex < 0 || endIndex < streamIndex) return null;
  let streamStartInBody = streamIndex + 6;
  if (body.slice(streamStartInBody, streamStartInBody + 2) === '\r\n') streamStartInBody += 2;
  else if (/[\r\n]/.test(body[streamStartInBody] || '')) streamStartInBody += 1;
  const bodyStart = pdfText.indexOf(body);
  if (bodyStart < 0) return null;
  const absoluteStart = bodyStart + streamStartInBody;
  const absoluteEnd = bodyStart + endIndex;
  return sourceBytes.slice(absoluteStart, absoluteEnd);
};

export const inspectPdfBytes = (bytes) => {
  const sourceBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const text = bytesToLatin1(sourceBytes);
  if (!text.startsWith('%PDF-')) throw new Error('Corrupt or unsupported PDF: header is missing.');
  if (!text.includes('%%EOF')) throw new Error('Corrupt PDF: end-of-file marker is missing.');
  const encrypted = /\/Encrypt\b/.test(text);
  const objects = parseObjects(text);
  const pages = Array.from(objects.entries()).filter(([, value]) => /\/Type\s*\/Page\b/.test(value.body) && !/\/Type\s*\/Pages\b/.test(value.body));
  return { encrypted, pageCount: pages.length, objects, pages, text, sourceBytes };
};

const decodeContentStream = ({ body, bytes, text, inflate }) => {
  const streamBytes = streamBytesFromBody(body, bytes, text);
  if (!streamBytes) return '';
  if (/\/Filter\s*(?:\[\s*)?\/LZWDecode\b/.test(body)) throw new Error('This PDF uses LZW-compressed content that the local extractor does not support.');
  if (/\/Filter\s*(?:\[\s*)?\/FlateDecode\b/.test(body)) {
    if (typeof inflate !== 'function') throw new Error('This PDF uses compressed content streams that require the configured local Flate decoder.');
    try { return utf8Decoder.decode(inflate(streamBytes)); } catch (_) { throw new Error('PDF compressed stream decoding failed.'); }
  }
  return bytesToLatin1(streamBytes);
};

export const extractPdfPagesFromBytes = (bytes, selectedPages = [], { inflate } = {}) => {
  const inspected = inspectPdfBytes(bytes);
  if (inspected.encrypted) throw new Error('Encrypted PDFs are not supported.');
  const wanted = selectedPages?.length ? new Set(selectedPages) : null;
  const results = [];
  inspected.pages.forEach(([objectId, page], index) => {
    const pageNumber = index + 1;
    if (wanted && !wanted.has(pageNumber)) return;
    const refs = pageContentRefs(page.body);
    let content = '';
    if (refs.length) {
      content = refs.map((ref) => inspected.objects.get(ref)).filter(Boolean).map((obj) => decodeContentStream({ body: obj.body, bytes: inspected.sourceBytes, text: inspected.text, inflate })).join('\n');
    } else if (page.body.includes('stream')) content = decodeContentStream({ body: page.body, bytes: inspected.sourceBytes, text: inspected.text, inflate });
    results.push({ pageNumber, objectId, text: extractPdfTextOperators(content), status: 'READY' });
  });
  return results;
};
