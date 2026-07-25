'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Download, 
  Users, 
  History,
  Sprout
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/sales/new', label: 'New Sale / Billing', icon: ShoppingBag },
    { href: '/inventory', label: 'Inventory / Items', icon: Package },
    { href: '/stock', label: 'Stock Inward', icon: Download },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/sales', label: 'Sales History', icon: History },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">
          <Sprout size={28} strokeWidth={2.5} />
        </div>
        <span className="logo-text">Kisan Beej</span>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <ul className="nav-list">
          {links.map((link) => {
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
      </nav>
      
      <div className="sidebar-footer">
        <p>© 2026 Kisan Beej</p>
        <p style={{ marginTop: '0.25rem', opacity: 0.7 }}>v1.0.0</p>
      </div>
    </aside>
  );
}
