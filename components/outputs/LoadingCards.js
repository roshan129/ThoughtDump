export default function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 h-5 w-20 animate-pulse rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-10/12 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-8/12 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
