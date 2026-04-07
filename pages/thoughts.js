import { useEffect, useState } from 'react';

import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { fetchThoughtsWithOutputs } from '@/services/persistenceService';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export default function ThoughtsPage() {
  const { user, authLoading, authError } = useAuth();
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadThoughts() {
      if (!user) {
        if (isMounted) {
          setThoughts([]);
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const rows = await fetchThoughtsWithOutputs(user.id);
        if (isMounted) {
          setThoughts(rows);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || 'Failed to load thoughts.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadThoughts();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <AppLayout title="My Thoughts">
      <div className="space-y-4">
        {authLoading ? <p className="text-sm text-slate-600">Checking authentication...</p> : null}
        {authError ? <p className="text-sm text-red-600">{authError}</p> : null}

        {!authLoading && !user ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-700">Sign in from Dashboard to load your saved thoughts.</p>
          </div>
        ) : null}

        {user ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Signed in as {user.email}</p>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-slate-600">Loading thoughts...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && user && thoughts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No saved thoughts yet. Generate content from Dashboard to create history.
          </div>
        ) : null}

        {thoughts.map((thought) => (
          <article key={thought.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {formatDate(thought.created_at)}
              </p>
              <p className="text-xs text-slate-500">
                Tone: {thought.tone} · Format: {thought.format}
              </p>
            </div>

            <p className="mb-4 text-sm text-slate-800">{thought.content}</p>

            <div className="space-y-2">
              {(thought.generated_content || []).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.type} #{item.position}
                  </p>
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </AppLayout>
  );
}
