export default function Topbar({ title }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">Sprint 1</span>
    </header>
  );
}
