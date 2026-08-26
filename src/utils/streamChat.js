import { createSseParser } from './sseParser.mjs';
import { normaliseOutputTokens } from './outputTokens.mjs';

const REQUEST_TIMEOUT_MS = 600000;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function normaliseApiKey(apiKey) {
  return String(apiKey || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/[\r\n\t]/g, '');
}

function authHeaders(key) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'HTTP-Referer': 'https://ai-console.app',
    'X-Title': 'AI Console',
  };
}

function parseErrorPayload(text, status) {
  let message = `OpenRouter request failed (HTTP ${status}).`;
  try {
    const parsed = JSON.parse(text || '{}');
    message = parsed.error?.message || parsed.message || message;
  } catch (_) {}
  return message;
}

/**
 * Stream chat completion via fetch (preferred) so Authorization is reliably
 * attached on Android. Falls back to XHR if fetch streaming is unavailable.
 */
export function streamChatCompletion({
  apiKey,
  model,
  messages,
  temperature,
  maxTokens,
  onDelta,
  onDone,
  onError,
}) {
  const key = normaliseApiKey(apiKey);
  if (!key) {
    onError(new Error('Missing API key. Open the key icon → AI settings and paste your OpenRouter key (sk-or-v1-...).'));
    return { cancel: () => {} };
  }
  if (!key.startsWith('sk-or-') && !key.startsWith('sk-')) {
    // Soft warning path still attempts the request — some proxy keys differ.
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
    onError(error instanceof Error ? error : new Error(String(error || 'OpenRouter request failed.')));
  };

  const cancel = () => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    try { controller?.abort?.(); } catch (_) {}
  };

  timeoutId = setTimeout(() => {
    cancel();
    onError(new Error('OpenRouter request timed out.'));
  }, REQUEST_TIMEOUT_MS);

  const runFetch = async () => {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: authHeaders(key),
      body,
      signal: controller?.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(parseErrorPayload(text, response.status));
    }

    const parser = createSseParser((parsed) => {
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) onDelta(content);
    });

    // Prefer incremental streaming when the runtime exposes a body reader.
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

    // Fallback: buffer full SSE payload (still authenticated via fetch headers).
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

    xhr.open('POST', OPENROUTER_URL);
    xhr.timeout = REQUEST_TIMEOUT_MS;
    const headers = authHeaders(key);
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
      else settleError(new Error(parseErrorPayload(full, xhr.status)));
    };

    xhr.onerror = () => settleError(new Error('Network error while contacting OpenRouter.'));
    xhr.ontimeout = () => settleError(new Error('OpenRouter request timed out.'));
    xhr.onabort = () => { settled = true; if (timeoutId) clearTimeout(timeoutId); };

    xhr.send(body);
    return xhr;
  };

  // Prefer fetch — more reliable Authorization on Android RN than XHR.
  if (typeof fetch === 'function') {
    runFetch().catch((error) => {
      if (settled) return;
      if (error?.name === 'AbortError') return;
      const msg = String(error?.message || '').toLowerCase();
      // Auth / client errors from OpenRouter should surface immediately.
      if (msg.includes('auth') || msg.includes('api key') || msg.includes('401') || msg.includes('403') || msg.includes('missing')) {
        settleError(error);
        return;
      }
      // Network-layer failure only: one XHR retry.
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

export async function fetchModels(apiKey) {
  const key = normaliseApiKey(apiKey);
  if (!key) throw new Error('Enter an OpenRouter API key before syncing models.');
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://ai-console.app',
      'X-Title': 'AI Console',
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(parseErrorPayload(text, response.status));
  }
  return response.json();
}
