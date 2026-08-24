import { createSseParser } from './sseParser.mjs';
import { normaliseOutputTokens } from './outputTokens.mjs';

const REQUEST_TIMEOUT_MS = 600000;

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
  const xhr = new XMLHttpRequest();
  let lastLength = 0;
  let settled = false;
  const parser = createSseParser((parsed) => {
    const content = parsed.choices?.[0]?.delta?.content;
    if (content) onDelta(content);
  });

  xhr.open('POST', 'https://openrouter.ai/api/v1/chat/completions');
  xhr.timeout = REQUEST_TIMEOUT_MS;
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
  xhr.setRequestHeader('HTTP-Referer', 'https://ai-console.app');
  xhr.setRequestHeader('X-Title', 'AI Console');

  xhr.onprogress = () => {
    const full = xhr.responseText || '';
    if (full.length > lastLength) {
      parser.push(full.substring(lastLength));
      lastLength = full.length;
    }
  };

  xhr.onload = () => {
    if (settled) return;
    const full = xhr.responseText || '';
    if (full.length > lastLength) {
      parser.push(full.substring(lastLength));
      lastLength = full.length;
    }
    parser.flush();
    settled = true;
    if (xhr.status >= 200 && xhr.status < 300) onDone();
    else {
      let message = `OpenRouter request failed (HTTP ${xhr.status}).`;
      try {
        const parsed = JSON.parse(xhr.responseText || '{}');
        message = parsed.error?.message || message;
      } catch (_) {}
      onError(new Error(message));
    }
  };

  xhr.onerror = () => {
    if (settled) return;
    settled = true;
    onError(new Error('Network error while contacting OpenRouter.'));
  };

  xhr.ontimeout = () => {
    if (settled) return;
    settled = true;
    onError(new Error('OpenRouter request timed out.'));
  };

  xhr.onabort = () => { settled = true; };

  xhr.send(JSON.stringify({
    model,
    messages,
    temperature: parseFloat(temperature),
    max_tokens: normaliseOutputTokens(maxTokens),
    stream: true,
  }));

  return { cancel: () => { if (!settled) xhr.abort(); } };
}

export async function fetchModels(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('Enter an OpenRouter API key before syncing models.');
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      'HTTP-Referer': 'https://ai-console.app',
      'X-Title': 'AI Console',
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch models (HTTP ${response.status}).`);
  return response.json();
}
