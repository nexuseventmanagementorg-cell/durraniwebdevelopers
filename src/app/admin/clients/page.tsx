"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Client } from "@/lib/types";
import { formatPKR, buildWhatsAppLink } from "@/lib/constants";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Archive,
  MessageSquare,
  CheckCircle2,
  X,
  Phone,
  Mail,
} from "lucide-react";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cityCountry, setCityCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openNewModal = () => {
    setSelectedClient(null);
    setName("");
    setBusinessName("");
    setEmail("");
    setPhone("");
    setCityCountry("Pakistan");
    setNotes("");
    setModalOpen(true);
  };

  const openEditModal = (c: Client) => {
    setSelectedClient(c);
    setName(c.name);
    setBusinessName(c.businessName || "");
    setEmail(c.email);
    setPhone(c.phone);
    setCityCountry(c.cityCountry || "");
    setNotes(c.notes || "");
    setModalOpen(true);
  };

  const handleSaveClient = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert("Name, email, and phone are required.");
      return;
    }
    setSaving(true);

    try {
      if (selectedClient) {
        // Update existing
        const res = await fetch("/api/admin/clients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedClient.id,
            name,
            businessName,
            email,
            phone,
            cityCountry,
            notes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg("Client details updated!");
          fetchClients();
          setModalOpen(false);
        }
      } else {
        // Create new
        const res = await fetch("/api/admin/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            businessName,
            email,
            phone,
            cityCountry,
            notes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessMsg("New client created successfully!");
          fetchClients();
          setModalOpen(false);
        }
      }
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async (c: Client) => {
    if (!confirm(`Are you sure you want to archive client ${c.name}?`)) return;
    try {
      await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, archived: true }),
      });
      fetchClients();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClients = clients.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Clients Directory"
          subtitle="Customer contact profiles, ledger balances, and payment track records"
          actionButton={
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-1.5 bg-[#E31E36] hover:bg-[#C8162D] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-glow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Client</span>
            </button>
          }
        />

        <div className="p-6 space-y-6 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clients by name, business, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Clients: <strong>{clients.length}</strong>
            </span>
          </div>

          {/* Clients Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-7 h-7 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500">Loading clients directory...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No clients found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F5F7] border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">Business / Company</th>
                      <th className="py-3 px-4">Contact Details</th>
                      <th className="py-3 px-4">Total Billed</th>
                      <th className="py-3 px-4">Total Paid</th>
                      <th className="py-3 px-4">Outstanding Balance</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClients.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-[#101216]">
                          {c.name}
                          <span className="text-[10px] text-gray-400 block font-normal">
                            ID: {c.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">
                          {c.businessName || "Individual Client"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-gray-800 block">{c.phone}</span>
                          <span className="text-gray-400 text-[11px]">{c.email}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {formatPKR(c.totalBilled || 0)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {formatPKR(c.totalPaid || 0)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#E31E36]">
                          {formatPKR(c.outstandingBalance || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="bg-gray-100 hover:bg-gray-200 text-[#101216] px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <a
                            href={buildWhatsAppLink(`Assalam-o-Alaikum ${c.name}, Durrani Web Developers contacting you.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg inline-flex items-center transition"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleToggleArchive(c)}
                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition"
                            title="Archive Client"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Client Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-300">
            <div className="flex justify-between items-start pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  {selectedClient ? "Edit Client" : "Register Client"}
                </span>
                <h3 className="text-xl font-black text-[#101216]">
                  {selectedClient ? selectedClient.name : "New Client Account"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-black p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Business Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">WhatsApp / Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">City / Country</label>
                <input
                  type="text"
                  value={cityCountry}
                  onChange={(e) => setCityCountry(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Private Internal Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private admin notes (never visible to client)..."
                  className="w-full bg-[#F4F5F7] px-3.5 py-2 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveClient}
                className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-glow disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
