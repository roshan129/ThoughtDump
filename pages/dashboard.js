import { useEffect, useMemo, useState } from 'react';

import AppLayout from '@/components/layout/AppLayout';
import LoadingCards from '@/components/outputs/LoadingCards';
import OutputCard from '@/components/outputs/OutputCard';
import Toast from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { signInWithEmail, signInWithGoogle, signOut, signUpWithEmail } from '@/services/authService';
import { generateContent } from '@/services/contentService';
import { saveThoughtWithOutputs } from '@/services/persistenceService';

export default function DashboardPage() {
  const { user, authLoading, authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const [thought, setThought] = useState('');
  const [tone, setTone] = useState('casual');
  const [format, setFormat] = useState('tweets');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeRegeneration, setActiveRegeneration] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [generation, setGeneration] = useState({ tweets: [], thread: [] });

  const canGenerate = useMemo(() => thought.trim().length > 0 && !isLoading, [thought, isLoading]);

  const cards = useMemo(
    () =>
      format === 'thread'
        ? [
            {
              key: 'thread',
              label: 'Thread',
              content: generation.thread.map((line, index) => `${index + 1}. ${line}`).join('\n')
            }
          ]
        : [
            {
              key: 'viral',
              label: 'Tweet 1',
              content: generation.tweets[0] || ''
            },
            {
              key: 'deep',
              label: 'Tweet 2',
              content: generation.tweets[1] || generation.tweets[0] || ''
            }
          ],
    [generation, format]
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

  async function handleSignUp() {
    setAuthMessage('');
    setAuthActionLoading(true);

    try {
      await signUpWithEmail(email.trim(), password);
      setAuthMessage('Signup successful. Check email for verification if required.');
    } catch (requestError) {
      setAuthMessage(requestError.message || 'Signup failed.');
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleSignIn() {
    setAuthMessage('');
    setAuthActionLoading(true);

    try {
      await signInWithEmail(email.trim(), password);
      setAuthMessage('Signed in successfully.');
    } catch (requestError) {
      setAuthMessage(requestError.message || 'Sign in failed.');
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setAuthMessage('');
    setAuthActionLoading(true);

    try {
      await signInWithGoogle();
    } catch (requestError) {
      setAuthMessage(requestError.message || 'Google sign in failed.');
      setAuthActionLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthMessage('');
    setAuthActionLoading(true);

    try {
      await signOut();
      setAuthMessage('Signed out.');
    } catch (requestError) {
      setAuthMessage(requestError.message || 'Sign out failed.');
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function persistGeneration(result) {
    if (!user) {
      return;
    }

    try {
      await saveThoughtWithOutputs({
        userId: user.id,
        thought: thought.trim(),
        tone,
        format,
        generation: {
          tweets: result.tweets || [],
          thread: result.thread || []
        }
      });

      setToastMessage('Saved to your library');
    } catch (saveError) {
      setError(saveError.message || 'Generated content created, but save failed.');
    }
  }

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
        thread: result.thread || []
      });

      await persistGeneration(result);
    } catch (requestError) {
      setGeneration({ tweets: [], thread: [] });
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Account</h2>

          {authLoading ? <p className="text-sm text-slate-600">Checking authentication...</p> : null}
          {authError ? <p className="mb-3 text-sm text-red-600">{authError}</p> : null}

          {user ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Signed in as <span className="font-medium">{user.email}</span>
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={authActionLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={authActionLoading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-60"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={authActionLoading}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authActionLoading}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Continue with Google
                </button>
              </div>
            </div>
          )}

          {authMessage ? <p className="mt-3 text-sm text-slate-600">{authMessage}</p> : null}
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Create New Content</h2>
          {!user ? (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              You can generate content without login, but only signed-in users can save history.
            </p>
          ) : null}

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
            <div className={`grid gap-4 ${cards.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
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
