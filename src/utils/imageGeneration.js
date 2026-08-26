/**
 * OpenRouter image generation via chat completions with image modality.
 * Falls back across a short model list when the primary model rejects the request.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = [
  'black-forest-labs/flux.2-pro',
  'black-forest-labs/flux-1.1-pro',
  'google/gemini-2.5-flash-image-preview',
  'google/gemini-2.0-flash-exp:free',
];

function extractImageUrl(payload) {
  const message = payload?.choices?.[0]?.message;
  if (!message) return null;

  // OpenRouter image modality shape
  const images = message.images || message.image_urls || [];
  if (Array.isArray(images) && images.length) {
    const first = images[0];
    const url = first?.image_url?.url || first?.url || first;
    if (typeof url === 'string' && url.length > 8) return url;
  }

  // Content array parts
  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part?.type === 'image_url' && part.image_url?.url) return part.image_url.url;
      if (part?.type === 'output_image' && part.image?.url) return part.image.url;
      if (typeof part?.text === 'string') {
        const md = part.text.match(/!\[[^\]]*]\((data:image\/[a-zA-Z+]+;base64,[^)]+|https?:[^)]+)\)/);
        if (md) return md[1];
      }
    }
  }

  // Plain markdown / data URL in string content
  if (typeof message.content === 'string') {
    const md = message.content.match(/!\[[^\]]*]\((data:image\/[a-zA-Z+]+;base64,[^)]+|https?:[^)]+)\)/);
    if (md) return md[1];
    if (message.content.startsWith('data:image/')) return message.content;
  }

  return null;
}

async function requestOnce(apiKey, model, prompt) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/3lacksun/ai-console-v140-apk',
      'X-Title': "Dr Stone's Command Centre",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `Generate an image for this description. Return the image only.\n\n${prompt}`,
        },
      ],
      modalities: ['image', 'text'],
      stream: false,
    }),
  });

  const text = await response.text();
  let payload = {};
  try { payload = JSON.parse(text || '{}'); } catch (_) {}

  if (!response.ok) {
    const message = payload?.error?.message || `Image generation failed (HTTP ${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const url = extractImageUrl(payload);
  if (!url) {
    throw new Error('The model responded without an image. Try a different image model in settings or shorten the prompt.');
  }
  return { url, model, raw: payload };
}

export async function generateImage({ apiKey, prompt, preferredModel }) {
  const key = String(apiKey || '').trim();
  const text = String(prompt || '').trim();
  if (!key) throw new Error('Enter an OpenRouter API key before generating images.');
  if (!text) throw new Error('Describe the image in the message box first, then tap Create image.');

  const models = [];
  if (preferredModel) models.push(preferredModel);
  for (const model of DEFAULT_MODELS) {
    if (!models.includes(model)) models.push(model);
  }

  let lastError = null;
  for (const model of models) {
    try {
      return await requestOnce(key, model, text);
    } catch (error) {
      lastError = error;
      // try next model on model-not-found / modality unsupported
      const msg = String(error.message || '').toLowerCase();
      if (error.status === 404 || error.status === 400 || msg.includes('not found') || msg.includes('modalit') || msg.includes('unsupported')) {
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Image generation failed for all candidate models.');
}

export const IMAGE_GEN_MODELS = DEFAULT_MODELS;
