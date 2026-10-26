'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarDays,
  ContactRound,
  UtensilsCrossed,
  Flame,
  QrCode,
  CheckSquare,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorizedPath, setAuthorizedPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    const isPublicAdminPage =
      pathname === '/admin/login' || pathname.startsWith('/admin/tables/print/');
    if (isPublicAdminPage) {
      return;
    }

    let isCurrent = true;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          router.replace('/admin/login');
          return;
        }
        if (isCurrent) setAuthorizedPath(pathname);
      })
      .catch(() => router.replace('/admin/login'))

    return () => {
      isCurrent = false;
    };
  }, [pathname, router]);

  // If on login page, don't show admin chrome
  if (pathname === '/admin/login' || pathname.startsWith('/admin/tables/print/')) {
    return <>{children}</>;
  }

  if (authorizedPath !== pathname) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Verifying admin session...</span>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/sales', label: 'Daily Sales', icon: CalendarDays },
    { href: '/admin/customers', label: 'Customers', icon: ContactRound },
    { href: '/admin/menu', label: 'Products', icon: UtensilsCrossed },
    { href: '/admin/deals', label: 'Deals', icon: Flame },
    { href: '/admin/tables', label: 'QR Tables', icon: QrCode },
    { href: '/admin/verification', label: 'Menu Audit', icon: CheckSquare },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' });
    } finally {
      setAuthorizedPath(null);
      router.replace('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 p-5 shrink-0">
        <div className="flex items-center gap-3 pb-6 border-b border-zinc-800">
          <div>
            <span className="text-xs uppercase font-black text-amber-400 block leading-none">
              Control Panel
            </span>
            <span className="text-sm font-black text-white">Your Restaurant</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-md shadow-amber-500/10'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Links & Logout */}
        <div className="pt-4 border-t border-zinc-800 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
          >
            <span>Live Customer Site</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-xl font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header on Mobile & Tablet */}
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-sm text-white">Restaurant Admin</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg"
            >
              Live Site
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 text-zinc-400 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar (Optimized for One-Hand Mobile Use) */}
      <nav
        aria-label="Admin navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-start gap-2 overflow-x-auto py-2 px-2"
      >
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                isActive ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
