export async function generateContent(input, tone, format, options = {}) {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input, tone, format, ...options })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to generate content.');
  }

  return payload;
}
