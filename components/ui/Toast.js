export default function Toast({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}
