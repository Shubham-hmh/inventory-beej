import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  // Route Guard: Redirect to login if not authenticated
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <div className="main-wrapper">
        <header className="header">
          <h2 className="header-title">Kisan Beej Bhandar</h2>
          <div className="header-meta">
            <span className="badge badge-success">Secure Session</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="content-container">
          {children}
        </main>
      </div>
    </div>
  );
}
