"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Inquiry, Project } from "@/lib/types";
import { formatPKR, buildWhatsAppLink } from "@/lib/constants";
import {
  Layers,
  Search,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  Briefcase,
  ExternalLink,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [resInq, resProj] = await Promise.all([
          fetch("/api/admin/inquiries"),
          fetch("/api/admin/projects"),
        ]);

        if (resInq.status === 401) {
          window.location.href = "/admin/login";
          return;
        }

        const dataInq = await resInq.json();
        const dataProj = await resProj.json();

        if (dataInq.success) setInquiries(dataInq.inquiries);
        if (dataProj.success) setProjects(dataProj.projects);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredOrders = inquiries.filter((inq) => {
    return (
      inq.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Orders & Requirements Discussion"
          subtitle="Review client questionnaire quotes, agreed revisions, and active order pipelines"
          actionButton={
            <Link
              href="/admin/inquiries"
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition"
            >
              <span>Manage Inquiries Inbox &rarr;</span>
            </Link>
          }
        />

        <div className="p-6 space-y-6 flex-1">
          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders by customer or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Logged Orders: <strong>{inquiries.length}</strong>
            </span>
          </div>

          {/* Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                    <div>
                      <span className="font-mono font-black text-sm text-[#E31E36]">
                        {order.id}
                      </span>
                      <h3 className="font-extrabold text-base text-[#101216] mt-0.5">
                        {order.customerName}
                      </h3>
                      {order.businessName && (
                        <span className="text-xs text-gray-500 block">{order.businessName}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
                      {order.status}
                    </span>
                  </div>

                  <div className="pt-3 space-y-2 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <strong className="text-gray-900">{order.projectTypes.join(", ")}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Admin Panel:</span>
                      <strong className={order.adminPanelType === "client_admin" ? "text-[#E31E36]" : "text-gray-900"}>
                        {order.adminPanelType === "client_admin" ? "Client Admin Access" : "Managed Backend"}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quotation / Estimate:</span>
                      <strong className="text-sm font-black text-[#101216]">
                        {formatPKR(order.calculation.estimatedTotal)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Advance Required:</span>
                      <span>{formatPKR(order.calculation.advanceAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>11 Monthly Installments:</span>
                      <span>PKR {order.calculation.regularInstallment.toLocaleString()} / mo</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <a
                    href={buildWhatsAppLink(
                      `Assalam-o-Alaikum ${order.customerName}, Durrani Web Developers contacting you regarding order ${order.id}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>

                  <Link
                    href={`/admin/inquiries`}
                    className="text-[#E31E36] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Manage Scope &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
