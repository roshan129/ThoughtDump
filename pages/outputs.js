import { useEffect, useState } from 'react';

import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { fetchGeneratedContent } from '@/services/persistenceService';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export default function OutputsPage() {
  const { user, authLoading, authError } = useAuth();
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadOutputs() {
      if (!user) {
        if (isMounted) {
          setOutputs([]);
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const rows = await fetchGeneratedContent(user.id);
        if (isMounted) {
          setOutputs(rows);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message || 'Failed to load output library.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOutputs();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <AppLayout title="Content Library">
      <div className="space-y-4">
        {authLoading ? <p className="text-sm text-slate-600">Checking authentication...</p> : null}
        {authError ? <p className="text-sm text-red-600">{authError}</p> : null}

        {!authLoading && !user ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-700">Sign in from Dashboard to view your content library.</p>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-slate-600">Loading generated content...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && user && outputs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No generated content yet. Create content in Dashboard and it will appear here.
          </div>
        ) : null}

        {outputs.map((output) => (
          <article key={output.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {output.type} #{output.position}
              </p>
              <p className="text-xs text-slate-500">{formatDate(output.created_at)}</p>
            </div>
            <p className="mb-3 text-sm text-slate-800">{output.content}</p>
            <p className="text-xs text-slate-500">Source thought: {output.thought_content}</p>
          </article>
        ))}
      </div>
    </AppLayout>
  );
}
