const PIN_KDF_VERSION = 'v2';
const PIN_KDF_ITERATIONS = 600000;
export const LEGACY_PIN_KDF_ITERATIONS = 12000;
const PIN_KDF_SALT_BYTES = 16;

function utf8Bytes(value) {
  const text = String(value ?? '');
  const bytes = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(++i);
      const point = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
      bytes.push(0xf0 | (point >> 18), 0x80 | ((point >> 12) & 0x3f), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
    } else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return Uint8Array.from(bytes);
}

function concatBytes(...arrays) {
  const length = arrays.reduce((sum, item) => sum + item.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const item of arrays) { out.set(item, offset); offset += item.length; }
  return out;
}

function rotr(value, bits) { return (value >>> bits) | (value << (32 - bits)); }

const K = Uint32Array.from([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);

export function sha256(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const bitLength = input.length * 8;
  const paddedLength = (((input.length + 9 + 63) >> 6) << 6);
  const data = new Uint8Array(paddedLength);
  data.set(input);
  data[input.length] = 0x80;
  const view = new DataView(data.buffer);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  view.setUint32(paddedLength - 8, high, false);
  view.setUint32(paddedLength - 4, low, false);

  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0;
    h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+h)>>>0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  [h0,h1,h2,h3,h4,h5,h6,h7].forEach((value, index) => outView.setUint32(index*4, value, false));
  return out;
}

function hmacSha256(key, data) {
  let normalised = key instanceof Uint8Array ? key : Uint8Array.from(key);
  if (normalised.length > 64) normalised = sha256(normalised);
  const block = new Uint8Array(64); block.set(normalised);
  const inner = new Uint8Array(64); const outer = new Uint8Array(64);
  for (let i = 0; i < 64; i += 1) { inner[i] = block[i] ^ 0x36; outer[i] = block[i] ^ 0x5c; }
  return sha256(concatBytes(outer, sha256(concatBytes(inner, data))));
}

function int32be(value) {
  return Uint8Array.from([(value >>> 24)&255,(value >>> 16)&255,(value >>> 8)&255,value&255]);
}

export function pbkdf2Sha256(password, salt, iterations = PIN_KDF_ITERATIONS, length = 32) {
  if (!Number.isInteger(iterations) || iterations < 1) throw new Error('Invalid KDF iteration count.');
  const key = utf8Bytes(password);
  const saltBytes = salt instanceof Uint8Array ? salt : utf8Bytes(salt);
  const blocks = Math.ceil(length / 32);
  const output = new Uint8Array(blocks * 32);
  for (let blockIndex = 1; blockIndex <= blocks; blockIndex += 1) {
    let u = hmacSha256(key, concatBytes(saltBytes, int32be(blockIndex)));
    const t = Uint8Array.from(u);
    for (let round = 1; round < iterations; round += 1) {
      u = hmacSha256(key, u);
      for (let i = 0; i < t.length; i += 1) t[i] ^= u[i];
    }
    output.set(t, (blockIndex - 1) * 32);
  }
  return output.slice(0, length);
}

function toHex(bytes) { return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(''); }
function fromHex(value) {
  if (!/^[0-9a-f]*$/i.test(value) || value.length % 2) return null;
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(value.slice(i*2, i*2+2), 16);
  return out;
}
function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}
function randomSalt() {
  const salt = new Uint8Array(PIN_KDF_SALT_BYTES);
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(salt);
  // Salt only needs uniqueness, not secrecy; the verifier KDF provides the work factor.
  let seed = `${Date.now()}-${Math.random()}-${Math.random()}`;
  let generated = 0;
  while (generated < salt.length) {
    const block = sha256(utf8Bytes(seed));
    const take = Math.min(block.length, salt.length - generated);
    salt.set(block.slice(0, take), generated);
    generated += take;
    seed = `${seed}-${generated}`;
  }
  return salt;
}

export function createPinVerifier(pin, { iterations = PIN_KDF_ITERATIONS, salt = randomSalt() } = {}) {
  if (!/^\d{6}$/.test(String(pin))) throw new Error('PIN must contain exactly 6 digits.');
  const derived = pbkdf2Sha256(String(pin), salt, iterations, 32);
  return `${PIN_KDF_VERSION}$${iterations}$${toHex(salt)}$${toHex(derived)}`;
}

export function isLegacyPlainPinRecord(record) { return /^\d{6}$/.test(String(record || '')); }

export function verifyPinAgainstRecord(pin, record) {
  const candidate = String(pin ?? '');
  const stored = String(record ?? '');
  if (!/^\d{6}$/.test(candidate) || !stored) return false;
  if (isLegacyPlainPinRecord(stored)) return candidate === stored;
  const parts = stored.split('$');
  if (parts.length !== 4 || !['v1', PIN_KDF_VERSION].includes(parts[0])) return false;
  const iterations = Number(parts[1]);
  const salt = fromHex(parts[2]);
  const expected = fromHex(parts[3]);
  if (!salt || !expected || !Number.isInteger(iterations) || iterations < 1000 || iterations > 1000000) return false;
  const actual = pbkdf2Sha256(candidate, salt, iterations, expected.length);
  return timingSafeEqual(actual, expected);
}

export function pinVerifierNeedsUpgrade(record) { const parts=String(record||'').split('$'); return isLegacyPlainPinRecord(record) || parts.length!==4 || parts[0]!==PIN_KDF_VERSION || Number(parts[1])<PIN_KDF_ITERATIONS; }

export const PIN_VERIFIER_POLICY = Object.freeze({ version: PIN_KDF_VERSION, iterations: PIN_KDF_ITERATIONS, saltBytes: PIN_KDF_SALT_BYTES });
