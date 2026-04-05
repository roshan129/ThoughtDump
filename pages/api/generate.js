const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';

const VARIANT_GUIDANCE = {
  viral: 'Prioritize an attention-grabbing, high-virality tweet with a hook.',
  deep: 'Prioritize a thoughtful, insight-driven tweet with depth.',
  thread: 'Prioritize a practical, structured thread with clear flow.'
};

const OUTPUT_JSON_SCHEMA_BOTH = {
  type: 'object',
  properties: {
    tweets: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 2
    },
    thread: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 4
    }
  },
  required: ['tweets', 'thread']
};

const OUTPUT_JSON_SCHEMA_TWEETS = {
  type: 'object',
  properties: {
    tweets: {
      type: 'array',
      items: { type: 'string' },
      minItems: 2,
      maxItems: 2
    }
  },
  required: ['tweets']
};

const OUTPUT_JSON_SCHEMA_THREAD = {
  type: 'object',
  properties: {
    thread: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 4
    }
  },
  required: ['thread']
};

const isDev = process.env.NODE_ENV !== 'production';

function logDev(message, meta) {
  if (!isDev) {
    return;
  }

  if (typeof meta === 'undefined') {
    console.log(`[api/generate] ${message}`);
    return;
  }

  console.log(`[api/generate] ${message}`, meta);
}

function buildPrompt({ input, tone, format, variant }) {
  const guidance = VARIANT_GUIDANCE[variant] || '';
  const outputInstruction =
    format === 'thread'
      ? 'Return JSON: {"tweets":[],"thread":["line1","line2","line3"]}.'
      : format === 'tweets'
        ? 'Return JSON: {"tweets":["tweet1","tweet2"],"thread":[]}.'
        : 'Return JSON: {"tweets":["tweet1","tweet2"],"thread":["line1","line2","line3"]}.';

  return [
    'Convert the following user thought into social media content.',
    '',
    'Requirements:',
    `- Tone: ${tone} (natural, conversational, human-like)`,
    '- If tweets are requested: generate EXACTLY 2 tweets (each under 200 characters)',
    '- If thread is requested: generate EXACTLY 3-4 lines',
    '- Each thread line should feel like a tweet',
    '- Avoid repetition',
    guidance ? `- Variant priority: ${guidance}` : '',
    '',
    'Make the content:',
    '- relatable',
    '- concise',
    '- insightful',
    '- suitable for posting on X (Twitter)',
    '',
    'STRICT RULES:',
    '- Return ONLY valid JSON',
    '- Do NOT include any text before or after JSON',
    '- Ensure the JSON is complete, properly closed, and valid',
    '- Do NOT cut off mid-response',
    '',
    'Output format:',
    outputInstruction,
    '',
    'Thought:',
    input
  ].filter(Boolean).join('\n');
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

  function extractBalancedJsonObject(source) {
    const start = source.indexOf('{');
    if (start < 0) {
      return '';
    }

    let inString = false;
    let escaped = false;
    let depth = 0;

    for (let i = start; i < source.length; i += 1) {
      const ch = source[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, i + 1);
        }
      }
    }

    return '';
  }

  let parsed;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Gemini can prepend/append text. Recover by extracting the first balanced JSON object.
    const candidate = extractBalancedJsonObject(cleaned);
    if (candidate) {
      parsed = JSON.parse(candidate);
    } else {
      throw new SyntaxError('No complete JSON object found in Gemini response text.');
    }
  }

  const tweets = Array.isArray(parsed.tweets)
    ? parsed.tweets
        .filter((item) => typeof item === 'string')
        .slice(0, 2)
        .map((tweet) => tweet.slice(0, 200))
    : [];

  let thread = [];

  if (Array.isArray(parsed.thread)) {
    thread = parsed.thread.filter((item) => typeof item === 'string').slice(0, 4);
  } else if (typeof parsed.thread === 'string' && parsed.thread.trim()) {
    // Backward-compatible recovery: split old string thread responses into lines.
    thread = parsed.thread
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  return {
    tweets,
    thread
  };
}

function schemaForFormat(format) {
  if (format === 'tweets') {
    return OUTPUT_JSON_SCHEMA_TWEETS;
  }

  if (format === 'thread') {
    return OUTPUT_JSON_SCHEMA_THREAD;
  }

  return OUTPUT_JSON_SCHEMA_BOTH;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input, tone = 'casual', format = 'tweets', variant = '' } = req.body || {};

  if (!input || typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({ error: 'Input thought is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment.' });
  }

  try {
    const prompt = buildPrompt({ input: input.trim(), tone, format, variant });
    const responseSchema = schemaForFormat(format);
    logDev('Incoming generation request', {
      tone,
      format,
      variant: variant || 'all',
      inputLength: input.trim().length
    });

    const modelCandidates = Array.from(
      new Set([
        DEFAULT_GEMINI_MODEL,
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-3-flash-preview'
      ].filter(Boolean))
    );

    let geminiResponse;
    let geminiPayload;

    for (const modelName of modelCandidates) {
      logDev('Calling Gemini model', { modelName });
      geminiResponse = await fetch(`${GEMINI_BASE_URL}/${modelName}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
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
            maxOutputTokens: 768,
            responseMimeType: 'application/json',
            responseSchema,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      });

      geminiPayload = await geminiResponse.json();
      logDev('Gemini raw payload', geminiPayload);
      logDev('Gemini response received', {
        modelName,
        status: geminiResponse.status,
        ok: geminiResponse.ok,
        finishReason: geminiPayload?.candidates?.[0]?.finishReason || 'unknown'
      });

      if (geminiResponse.ok) {
        logDev('Model succeeded', { modelName });
        break;
      }

      const upstreamMessage = String(geminiPayload?.error?.message || '');
      const isModelNotFound =
        geminiResponse.status === 404 &&
        (upstreamMessage.includes('not found') || upstreamMessage.includes('ListModels'));

      if (!isModelNotFound) {
        const upstreamError = geminiPayload?.error?.message || 'Gemini API request failed.';
        logDev('Gemini non-retryable error', { modelName, upstreamError });
        return res.status(geminiResponse.status).json({ error: upstreamError });
      }

      logDev('Model unavailable, trying fallback', { modelName });
    }

    if (!geminiResponse?.ok) {
      const upstreamError =
        geminiPayload?.error?.message ||
        'No supported Gemini model was found. Set GEMINI_MODEL to a currently available model.';
      return res.status(geminiResponse?.status || 502).json({ error: upstreamError });
    }

    const text = extractTextFromGemini(geminiPayload);

    if (!text) {
      logDev('Gemini text extraction failed: empty text');
      return res.status(502).json({ error: 'Gemini returned an empty response.' });
    }

    logDev('Raw Gemini text preview', { preview: text.slice(0, 220) });
    const parsedOutput = sanitizeAndParseOutput(text);
    logDev('Parsed output stats', {
      tweets: parsedOutput.tweets.length,
      threadItems: parsedOutput.thread.length
    });

    if (format === 'tweets' && parsedOutput.tweets.length < 1) {
      return res.status(502).json({ error: 'Gemini response format was invalid for tweets.' });
    }

    if (format === 'thread' && parsedOutput.thread.length < 1) {
      return res.status(502).json({ error: 'Gemini response format was invalid for thread.' });
    }

    if (
      format !== 'tweets' &&
      format !== 'thread' &&
      (parsedOutput.tweets.length < 1 || parsedOutput.thread.length < 1)
    ) {
      return res.status(502).json({ error: 'Gemini response format was invalid.' });
    }

    if (format === 'tweets') {
      return res.status(200).json({ tweets: parsedOutput.tweets, thread: [] });
    }

    if (format === 'thread') {
      return res.status(200).json({ tweets: [], thread: parsedOutput.thread });
    }

    return res.status(200).json(parsedOutput);
  } catch (error) {
    if (error instanceof SyntaxError) {
      logDev('JSON parse error', { message: error.message });
      return res.status(502).json({
        error: 'Could not parse Gemini response JSON. Please retry; the model output may have been truncated.'
      });
    }

    logDev('Unexpected server error', { message: error.message });
    return res.status(500).json({ error: error.message || 'Unexpected server error.' });
  }
}
