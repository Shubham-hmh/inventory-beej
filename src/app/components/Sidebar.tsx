'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Download, 
  Users, 
  History,
  Sprout,
  UserCheck,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  user?: {
    name: string;
    role: 'admin' | 'employee';
  } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const isAdmin = user?.role === 'admin';

  // Base navigation links
  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { href: '/sales/new', label: 'New Sale / Billing', icon: ShoppingBag, adminOnly: false },
    { href: '/inventory', label: 'Inventory / Items', icon: Package, adminOnly: true },
    { href: '/stock', label: 'Stock Inward', icon: Download, adminOnly: true },
    { href: '/customers', label: 'Customers', icon: Users, adminOnly: true },
    { href: '/sales', label: 'Sales History', icon: History, adminOnly: true },
    { href: '/employees', label: 'Employees', icon: UserCheck, adminOnly: true },
  ];

  // Filter links based on role
  const visibleLinks = links.filter(link => !link.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">
          <Sprout size={28} strokeWidth={2.5} />
        </div>
        <span className="logo-text">Kisan Beej</span>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <ul className="nav-list" style={{ flexGrow: 1 }}>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <li key={link.href}>
                <Link 
                  href={link.href} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {user && (
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.5rem 0.75rem 0.5rem' }} className="logo-text-hide">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.name}>
                {user.name}
              </span>
              <span className={`badge ${isAdmin ? 'badge-danger' : 'badge-success'}`} style={{ display: 'inline-block', width: 'fit-content', fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                {isAdmin ? 'Admin' : 'Employee'}
              </span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="nav-link"
              style={{ 
                width: '100%', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'var(--danger)'
              }}
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>
      
      <div className="sidebar-footer" style={{ marginTop: '1rem' }}>
        <p>© 2026 Kisan Beej</p>
        <p style={{ marginTop: '0.25rem', opacity: 0.7 }}>v1.0.0</p>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .logo-text-hide {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
}
