import { useEffect, useMemo, useState } from 'react';

import AppLayout from '@/components/layout/AppLayout';
import LoadingCards from '@/components/outputs/LoadingCards';
import OutputCard from '@/components/outputs/OutputCard';
import Toast from '@/components/ui/Toast';
import { generateContent } from '@/services/contentService';

export default function DashboardPage() {
  const [thought, setThought] = useState('');
  const [tone, setTone] = useState('casual');
  const [format, setFormat] = useState('both');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeRegeneration, setActiveRegeneration] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [generation, setGeneration] = useState({ tweets: [], thread: '' });

  const canGenerate = useMemo(() => thought.trim().length > 0 && !isLoading, [thought, isLoading]);

  const cards = useMemo(
    () => [
      {
        key: 'viral',
        label: 'Viral',
        content: generation.tweets[0] || ''
      },
      {
        key: 'deep',
        label: 'Deep',
        content: generation.tweets[1] || generation.tweets[0] || ''
      },
      {
        key: 'thread',
        label: 'Thread',
        content: generation.thread || ''
      }
    ],
    [generation]
  );

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setToastMessage('');
    }, 1600);

    return () => clearTimeout(timeoutId);
  }, [toastMessage]);

  async function handleGenerateAll() {
    if (!thought.trim()) {
      setError('Please write a thought before generating content.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await generateContent(thought, tone, format);
      setGeneration({
        tweets: result.tweets || [],
        thread: result.thread || ''
      });
    } catch (requestError) {
      setGeneration({ tweets: [], thread: '' });
      setError(requestError.message || 'Something went wrong while generating content.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerateVariant(variant) {
    if (!thought.trim()) {
      setError('Please write a thought before regenerating a variant.');
      return;
    }

    setError('');
    setActiveRegeneration(variant);

    try {
      const result = await generateContent(thought, tone, format, { variant });

      setGeneration((previous) => {
        const nextTweets = [...previous.tweets];
        const incomingTweets = result.tweets || [];

        if (variant === 'viral') {
          nextTweets[0] = incomingTweets[0] || incomingTweets[1] || nextTweets[0] || '';
        }

        if (variant === 'deep') {
          nextTweets[1] = incomingTweets[1] || incomingTweets[0] || nextTweets[1] || '';
        }

        return {
          tweets: nextTweets,
          thread: variant === 'thread' ? result.thread || previous.thread : previous.thread
        };
      });
    } catch (requestError) {
      setError(requestError.message || 'Failed to regenerate this variant.');
    } finally {
      setActiveRegeneration('');
    }
  }

  async function handleCopy(content) {
    try {
      await navigator.clipboard.writeText(content);
      setToastMessage('Copied!');
    } catch {
      setError('Copy failed. Please copy manually.');
    }
  }

  const hasAnyOutput = cards.some((card) => card.content);

  return (
    <AppLayout title="Dashboard">
      <Toast message={toastMessage} />

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create New Content</h2>

          <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="thought">
            Your Thought
          </label>
          <textarea
            id="thought"
            value={thought}
            onChange={(event) => setThought(event.target.value)}
            placeholder="What’s on your mind?"
            className="mb-6 h-48 w-full rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
          />

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="tone">
                Tone
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="bold">Bold</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="format">
                Format
              </label>
              <select
                id="format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="tweets">Tweets</option>
                <option value="thread">Thread</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={!canGenerate}
              className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Generating...' : 'Generate Content'}
            </button>

            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={!canGenerate}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Regenerate All
            </button>
          </div>

          {error ? (
            <div className="mt-4 flex items-center gap-3">
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={handleGenerateAll}
                disabled={!canGenerate}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Generated Output</h3>
            {hasAnyOutput ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Gemini Variants
              </span>
            ) : null}
          </div>

          {isLoading ? <LoadingCards /> : null}

          {!isLoading && !hasAnyOutput && !error ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
              Your generated variants will appear here.
            </div>
          ) : null}

          {!isLoading && hasAnyOutput ? (
            <div className="grid gap-4 md:grid-cols-3">
              {cards.map((card) => (
                <OutputCard
                  key={card.key}
                  label={card.label}
                  content={card.content}
                  copyDisabled={isLoading || activeRegeneration === card.key}
                  isRegenerating={activeRegeneration === card.key}
                  onCopy={() => handleCopy(card.content)}
                  onRegenerate={() => handleRegenerateVariant(card.key)}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </AppLayout>
  );
}
