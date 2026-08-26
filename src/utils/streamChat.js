import { createSseParser } from './sseParser.mjs';
import { normaliseOutputTokens } from './outputTokens.mjs';
import { resolveProvider } from './providers.mjs';

const REQUEST_TIMEOUT_MS = 600000;

function normaliseApiKey(apiKey) {
  return String(apiKey || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/[\r\n\t]/g, '');
}

function authHeaders(key, provider) {
  const cfg = resolveProvider(provider);
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'HTTP-Referer': cfg.referer,
    'X-Title': cfg.title,
  };
}

function parseErrorPayload(text, status, providerLabel) {
  let message = `${providerLabel || 'Provider'} request failed (HTTP ${status}).`;
  try {
    const parsed = JSON.parse(text || '{}');
    message = parsed.error?.message || parsed.message || message;
  } catch (_) {}
  return message;
}

/**
 * Stream chat completion via fetch (preferred) so Authorization is reliable on Android.
 * provider: 'openrouter' | 'together'
 */
export function streamChatCompletion({
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  provider = 'openrouter',
  onDelta,
  onDone,
  onError,
}) {
  const cfg = resolveProvider(provider);
  const key = normaliseApiKey(apiKey);
  if (!key) {
    onError(new Error(`Missing ${cfg.label} API key. Open protected settings and paste your key.`));
    return { cancel: () => {} };
  }

  const body = JSON.stringify({
    model,
    messages,
    temperature: parseFloat(temperature),
    max_tokens: normaliseOutputTokens(maxTokens),
    stream: true,
  });

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let settled = false;
  let timeoutId = null;

  const settleDone = () => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    onDone();
  };

  const settleError = (error) => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    onError(error instanceof Error ? error : new Error(String(error || 'Request failed.')));
  };

  const cancel = () => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    try { controller?.abort?.(); } catch (_) {}
  };

  timeoutId = setTimeout(() => {
    cancel();
    onError(new Error(`${cfg.label} request timed out.`));
  }, REQUEST_TIMEOUT_MS);

  const runFetch = async () => {
    const response = await fetch(cfg.chatUrl, {
      method: 'POST',
      headers: authHeaders(key, provider),
      body,
      signal: controller?.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(parseErrorPayload(text, response.status, cfg.label));
    }

    const parser = createSseParser((parsed) => {
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) onDelta(content);
    });

    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
      parser.flush();
      settleDone();
      return;
    }

    const full = await response.text();
    parser.push(full, true);
    parser.flush();
    settleDone();
  };

  const runXhr = () => {
    const xhr = new XMLHttpRequest();
    let lastLength = 0;
    const parser = createSseParser((parsed) => {
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) onDelta(content);
    });

    xhr.open('POST', cfg.chatUrl);
    xhr.timeout = REQUEST_TIMEOUT_MS;
    const headers = authHeaders(key, provider);
    Object.keys(headers).forEach((name) => {
      try { xhr.setRequestHeader(name, headers[name]); } catch (_) {}
    });

    xhr.onprogress = () => {
      const full = xhr.responseText || '';
      if (full.length > lastLength) {
        parser.push(full.substring(lastLength));
        lastLength = full.length;
      }
    };

    xhr.onload = () => {
      const full = xhr.responseText || '';
      if (full.length > lastLength) {
        parser.push(full.substring(lastLength));
        lastLength = full.length;
      }
      parser.flush();
      if (xhr.status >= 200 && xhr.status < 300) settleDone();
      else settleError(new Error(parseErrorPayload(full, xhr.status, cfg.label)));
    };

    xhr.onerror = () => settleError(new Error(`Network error while contacting ${cfg.label}.`));
    xhr.ontimeout = () => settleError(new Error(`${cfg.label} request timed out.`));
    xhr.onabort = () => { settled = true; if (timeoutId) clearTimeout(timeoutId); };

    xhr.send(body);
    return xhr;
  };

  if (typeof fetch === 'function') {
    runFetch().catch((error) => {
      if (settled) return;
      if (error?.name === 'AbortError') return;
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('auth') || msg.includes('api key') || msg.includes('401') || msg.includes('403') || msg.includes('missing')) {
        settleError(error);
        return;
      }
      try {
        runXhr();
      } catch (xhrError) {
        settleError(error?.message ? error : xhrError);
      }
    });
  } else {
    try {
      runXhr();
    } catch (error) {
      settleError(error);
    }
  }

  return { cancel };
}

export async function fetchModels(apiKey, provider = 'openrouter') {
  const cfg = resolveProvider(provider);
  const key = normaliseApiKey(apiKey);
  if (!key) throw new Error(`Enter a ${cfg.label} API key before syncing models.`);
  const response = await fetch(cfg.modelsUrl, {
    method: 'GET',
    headers: authHeaders(key, provider),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(parseErrorPayload(text, response.status, cfg.label));
  }
  const payload = await response.json();
  // Together may return a bare array; OpenRouter returns { data: [] }
  if (Array.isArray(payload)) return { data: payload };
  if (Array.isArray(payload?.data)) return payload;
  return { data: [] };
}
