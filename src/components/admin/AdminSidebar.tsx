"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  Users,
  CreditCard,
  ReceiptText,
  FileText,
  Sliders,
  Image as ImageIcon,
  Bell,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  UserRoundPlus,
  ShoppingBag,
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Inquiries Inbox", href: "/admin/inquiries", icon: Inbox },
    { name: "Incomplete Inquiries", href: "/admin/leads", icon: UserRoundPlus },
    { name: "Active Projects", href: "/admin/projects", icon: Briefcase },
    { name: "Clients Directory", href: "/admin/clients", icon: Users },
    { name: "Payments & Verification", href: "/admin/payments", icon: CreditCard },
    { name: "Receipt Reviews", href: "/admin/payment-proofs", icon: ReceiptText },
    { name: "Project Invoices", href: "/admin/invoices", icon: FileText },
    { name: "Dynamic Pricing Rules", href: "/admin/pricing", icon: Sliders },
    { name: "Add-on Catalog", href: "/admin/addons", icon: ShoppingBag },
    { name: "Portfolio & Templates", href: "/admin/portfolio", icon: ImageIcon },
    { name: "Automated Reminders", href: "/admin/reminders", icon: Bell },
    { name: "Settings & Audit Logs", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <aside className="w-64 bg-[#101216] border-r border-[#242830] text-gray-300 flex flex-col justify-between min-h-screen fixed top-0 left-0 z-30">
      <div>
        {/* Brand header */}
        <div className="p-5 border-b border-[#242830] flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[#E31E36] bg-black flex-shrink-0">
            <Image src="/logo.jpg" alt="Logo" fill className="object-cover" />
          </div>
          <div>
            <span className="font-extrabold text-white text-xs tracking-tight block">
              DURRANI <span className="text-[#E31E36]">ADMIN</span>
            </span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
              Management Portal
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#E31E36] text-white shadow-glow"
                    : "text-gray-400 hover:text-white hover:bg-[#181B20]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer controls */}
      <div className="p-4 border-t border-[#242830] space-y-2 text-xs">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-[#181B20] transition"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[#E31E36]" />
            View Public Site
          </span>
          <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">Live</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-red-400 hover:text-white hover:bg-red-950/40 px-3 py-2 rounded-lg transition font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </aside>
  );
}
