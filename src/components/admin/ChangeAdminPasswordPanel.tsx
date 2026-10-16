"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound } from "lucide-react";

export default function ChangeAdminPasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not change the admin password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(result.message);
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Could not change the admin password."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-5">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="rounded-xl bg-red-50 p-2.5 text-[#E31E36]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-[#101216]">Admin Password</h3>
          <p className="text-xs text-gray-500">
            Change the dashboard password. It is stored as a secure hash.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={changePassword} className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1.5 text-xs font-bold text-gray-700">
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-[#E31E36]"
          />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-gray-700">
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-[#E31E36]"
          />
        </label>
        <label className="space-y-1.5 text-xs font-bold text-gray-700">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-[#E31E36]"
          />
        </label>
        <div className="md:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#101216] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#252932] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Change password"}
          </button>
          <p className="mt-2 text-[11px] text-gray-500">
            Use at least 12 characters. Supabase credential storage must be configured.
          </p>
        </div>
      </form>
    </section>
  );
}
