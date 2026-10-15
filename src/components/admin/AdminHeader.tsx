"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, UserCheck, PhoneCall, ExternalLink } from "lucide-react";
import { BUSINESS_INFO } from "@/lib/constants";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export default function AdminHeader({ title, subtitle, actionButton }: AdminHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-black text-[#101216]">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actionButton}

        <div className="hidden md:flex items-center gap-2 bg-[#F4F5F7] px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-gray-600 font-medium">WhatsApp Hotline:</span>
          <strong className="text-[#101216]">{BUSINESS_INFO.phoneDisplay}</strong>
        </div>

        <div className="flex items-center gap-2 bg-red-50 text-[#E31E36] px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Admin Authenticated</span>
        </div>
      </div>
    </div>
  );
}
