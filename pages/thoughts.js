import AppLayout from '@/components/layout/AppLayout';

export default function ThoughtsPage() {
  return (
    <AppLayout title="My Thoughts">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-700">Your saved thoughts will appear here in Sprint 5.</p>
      </div>
    </AppLayout>
  );
}
