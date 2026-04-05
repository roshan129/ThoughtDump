export default function OutputCard({
  label,
  content,
  onCopy,
  onRegenerate,
  isRegenerating,
  copyDisabled
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={copyDisabled || !content}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating || !onRegenerate}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {content || 'No content generated yet for this variant.'}
      </p>
    </article>
  );
}
