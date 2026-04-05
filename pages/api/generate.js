const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';

const VARIANT_GUIDANCE = {
  viral: 'Prioritize an attention-grabbing, high-virality tweet with a hook.',
  deep: 'Prioritize a thoughtful, insight-driven tweet with depth.',
  thread: 'Prioritize a practical, structured thread with clear flow.'
};

function buildPrompt({ input, tone, format, variant }) {
  const guidance = VARIANT_GUIDANCE[variant] || '';

  return [
    'You are a content assistant for TypeFuel, a thought-to-content SaaS product.',
    'Transform the user thought into social content.',
    'Return STRICT JSON only (no markdown, no code fences) with this exact schema:',
    '{"tweets": ["string", "string", "string"], "thread": "string"}',
    'Requirements:',
    '- tweets[0] should be the most viral style',
    '- tweets[1] should be deep and reflective',
    '- tweets[2] can be a creative alternate angle',
    '- thread should be multi-part and coherent',
    'Write in the requested tone and format intent.',
    guidance,
    `Tone: ${tone}`,
    `Format intent: ${format}`,
    `User thought: ${input}`
  ]
    .filter(Boolean)
    .join('\n');
}

function extractTextFromGemini(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function sanitizeAndParseOutput(text) {
  let cleaned = text.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  const parsed = JSON.parse(cleaned);

  const tweets = Array.isArray(parsed.tweets)
    ? parsed.tweets.filter((item) => typeof item === 'string').slice(0, 3)
    : [];

  const thread = typeof parsed.thread === 'string' ? parsed.thread : '';

  return {
    tweets,
    thread
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input, tone = 'casual', format = 'both', variant = '' } = req.body || {};

  if (!input || typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({ error: 'Input thought is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment.' });
  }

  try {
    const prompt = buildPrompt({ input: input.trim(), tone, format, variant });

    const geminiResponse = await fetch(
      `${GEMINI_BASE_URL}/${DEFAULT_GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        })
      }
    );

    const geminiPayload = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const upstreamError = geminiPayload?.error?.message || 'Gemini API request failed.';
      return res.status(geminiResponse.status).json({ error: upstreamError });
    }

    const text = extractTextFromGemini(geminiPayload);

    if (!text) {
      return res.status(502).json({ error: 'Gemini returned an empty response.' });
    }

    const parsedOutput = sanitizeAndParseOutput(text);

    if (parsedOutput.tweets.length < 1 || !parsedOutput.thread) {
      return res.status(502).json({ error: 'Gemini response format was invalid.' });
    }

    return res.status(200).json(parsedOutput);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(502).json({ error: 'Could not parse Gemini response JSON.' });
    }

    return res.status(500).json({ error: error.message || 'Unexpected server error.' });
  }
}
