"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101216] text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[#181B20] border border-[#242830] rounded-3xl p-8 sm:p-10 shadow-card-dark space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#E31E36] mx-auto bg-black shadow-glow">
            <Image src="/logo.jpg" alt="Logo" fill className="object-cover" priority />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              DURRANI <span className="text-[#E31E36]">ADMIN PORTAL</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Authorized personnel & developer dashboard access
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#E31E36]" />
            <span>{error}</span>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-bold mb-1">Administrator Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#101216] text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-[#E31E36]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-bold mb-1">Security Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#101216] text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:border-[#E31E36]"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E31E36] hover:bg-[#C8162D] text-white py-3 rounded-xl font-bold text-xs shadow-glow transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Authenticate Admin
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-400">
          <Link href="/" className="hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Website
          </Link>
          <span className="text-[10px] text-gray-500">Secure Session Auth</span>
        </div>
      </div>
    </div>
  );
}
