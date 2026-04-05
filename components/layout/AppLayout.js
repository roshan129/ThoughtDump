import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ title, children }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="flex w-full flex-col">
        <Topbar title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
