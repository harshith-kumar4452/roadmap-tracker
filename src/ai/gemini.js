// Thin client for Google's Gemini API (REST, no SDK). Used for scoring interview answers,
// writing model answers and reading uploaded study plans. Every call asks for JSON that matches
// a schema, and every result is validated again by the caller: model output is untrusted.
//
// Env: GEMINI_API_KEY (required for AI features), GEMINI_MODEL (default gemini-2.5-flash).
// Docs: https://ai.google.dev/api/generate-content

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_MODEL = 'gemini-2.5-flash';

export const aiModel = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;
export const aiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

export class AiError extends Error {
  constructor(message, { status = 502, retryable = false } = {}) {
    super(message);
    this.status = status;
    this.expose = true;
    this.retryable = retryable;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Test hook: lets tests swap in a fake fetch without touching the network.
let fetchImpl = (...a) => fetch(...a);
export const _setFetch = (f) => { fetchImpl = f || ((...a) => fetch(...a)); };

/**
 * Ask Gemini for JSON.
 * @param {object} o
 * @param {string} o.system      System instruction (the model's role and rules).
 * @param {Array}  o.parts       Content parts: strings, or { mimeType, data (base64) } for files.
 * @param {object} o.schema      OpenAPI-style response schema.
 * @param {number} [o.temperature]
 * @param {number} [o.timeoutMs]
 */
export async function generateJson({ system, parts, schema, temperature = 0.2, timeoutMs = 45_000, maxOutputTokens = 8192 }) {
  if (!aiConfigured()) throw new AiError('AI is not set up: add GEMINI_API_KEY to the server environment.', { status: 503 });
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{
      role: 'user',
      parts: parts.map((p) => (typeof p === 'string' ? { text: p } : { inlineData: { mimeType: p.mimeType, data: p.data } })),
    }],
    generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens },
  };
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(800 * 2 ** (attempt - 1));
    let res;
    try {
      res = await fetchImpl(`${BASE}/${encodeURIComponent(aiModel())}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      lastErr = new AiError(err.name === 'TimeoutError' ? 'The AI took too long to answer. Try again.' : 'Could not reach the AI service.', { retryable: true });
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      lastErr = new AiError(res.status === 429 ? 'The AI is rate-limited right now. Wait a minute and try again.' : 'The AI service had an error. Try again.', { status: res.status === 429 ? 429 : 502, retryable: true });
      continue;
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      throw new AiError(`AI request failed: ${msg}`, { status: res.status === 400 || res.status === 403 ? 502 : 502 });
    }
    const cand = json?.candidates?.[0];
    if (!cand) throw new AiError(`The AI returned no answer${json?.promptFeedback?.blockReason ? ` (blocked: ${json.promptFeedback.blockReason})` : ''}.`);
    const raw = (cand.content?.parts || []).map((p) => p.text || '').join('');
    try {
      return JSON.parse(raw);
    } catch {
      lastErr = new AiError(cand.finishReason === 'MAX_TOKENS' ? 'The AI answer was cut off. Try a shorter input.' : 'The AI returned malformed JSON.', { retryable: cand.finishReason !== 'MAX_TOKENS' });
      if (cand.finishReason === 'MAX_TOKENS') break;
    }
  }
  throw lastErr;
}

// Helpers for cleaning model output before it is stored or shown.
export const clampInt = (v, min, max, fallback = min) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
export const cleanStr = (v, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const cleanList = (v, max = 10, each = 300) => (Array.isArray(v) ? v.map((s) => cleanStr(s, each)).filter(Boolean).slice(0, max) : []);
