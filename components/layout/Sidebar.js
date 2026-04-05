import Link from 'next/link';
import { useRouter } from 'next/router';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'My Thoughts', href: '/thoughts' },
  { label: 'Content Library', href: '/outputs' },
  { label: 'Settings', href: '/settings' }
];

export default function Sidebar() {
  const router = useRouter();

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white p-6 md:block">
      <div className="mb-8 text-2xl font-bold text-slate-800">TypeFuel</div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = router.pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-50 text-brand-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
