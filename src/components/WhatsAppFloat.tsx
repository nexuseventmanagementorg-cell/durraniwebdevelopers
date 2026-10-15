"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { buildWhatsAppLink } from "@/lib/constants";
import { MessageSquare } from "lucide-react";

export default function WhatsAppFloat() {
  const pathname = usePathname();

  // Hide in admin dashboard
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const defaultMsg =
    "Hello Durrani Web Developers! I would like to inquire about building a web application.";

  return (
    <aside
      aria-label="Direct WhatsApp Contact"
      className="fixed bottom-6 right-6 z-40 flex items-center group cursor-pointer"
    >
      <a
        href={buildWhatsAppLink(defaultMsg)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-[0_0_25px_rgba(37,211,102,0.6)] transition-all duration-300 transform hover:scale-105 active:scale-95"
      >
        <MessageSquare className="w-5 h-5 fill-current" />
        <span className="text-xs font-bold hidden sm:inline">
          Chat on WhatsApp
        </span>
      </a>
      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
      </span>
    </aside>
  );
}
