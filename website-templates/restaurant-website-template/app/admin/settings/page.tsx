'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  CheckCircle2,
  ShieldCheck,
  Phone,
  MapPin,
  KeyRound,
  LockKeyhole,
} from 'lucide-react';
import { BusinessSettings } from '@/types';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsError, setCredentialsError] = useState('');
  const [credentialsSuccess, setCredentialsSuccess] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();

    async function loadAdminCredentials() {
      try {
        const res = await fetch('/api/admin/credentials', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success || typeof data.username !== 'string') {
          throw new Error(data.error || 'Could not load admin username.');
        }
        setAdminUsername(data.username);
      } catch (err) {
        setCredentialsError(
          err instanceof Error ? err.message : 'Could not load admin username.'
        );
      }
    }
    loadAdminCredentials();
  }, []);

  const handleCredentialsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsError('');
    setCredentialsSuccess('');

    if (newPassword !== confirmPassword) {
      setCredentialsError('New password and confirmation do not match.');
      return;
    }

    setCredentialsLoading(true);
    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          username: adminUsername,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not update admin credentials.');
      }

      setCredentialsSuccess('Credentials updated. Redirecting you to sign in again…');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.setTimeout(() => router.replace('/admin/login'), 1000);
    } catch (err) {
      setCredentialsError(
        err instanceof Error ? err.message : 'Could not update admin credentials.'
      );
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !settings) {
    return <div className="py-20 text-center text-zinc-500 text-xs">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Business Settings</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure restaurant contact info, WhatsApp number, opening hours, delivery fees, and announcements.
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs p-3 rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Business settings updated successfully and applied across website!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Contact & WhatsApp */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Phone className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Contact &amp; WhatsApp Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-zinc-300 font-bold block mb-1">
                Display Phone Number (from Printed Menu)
              </label>
              <input
                type="text"
                value={settings.phoneCandidate}
                onChange={(e) => setSettings({ ...settings, phoneCandidate: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-bold block mb-1">
                WhatsApp Number (International without +)
              </label>
              <input
                type="text"
                value={settings.whatsappNumberFormatted}
                onChange={(e) =>
                  setSettings({ ...settings, whatsappNumberFormatted: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Include your country code and digits only.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 pt-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={settings.isWhatsAppConfirmedByOwner}
              onChange={(e) =>
                setSettings({ ...settings, isWhatsAppConfirmedByOwner: e.target.checked })
              }
              className="rounded border-zinc-700 text-amber-500"
            />
            <span className="text-zinc-300 font-semibold">
              Verified by Restaurant Owner (Confirmed WhatsApp Reception)
            </span>
          </label>
        </div>

        {/* Address & Timings */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Location &amp; Operating Hours
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-zinc-300 font-bold block mb-1">Physical Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-bold block mb-1">City</label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-bold block mb-1">Operating Hours Text</label>
              <input
                type="text"
                value={settings.openingHoursFormatted}
                onChange={(e) =>
                  setSettings({ ...settings, openingHoursFormatted: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

          </div>
        </div>

        {/* Pricing & Service Charges */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3">
            Delivery &amp; Service Controls
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-zinc-300 font-bold block mb-1">
                Flat Delivery Charge (PKR)
              </label>
              <input
                type="number"
                value={settings.deliveryCharges}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    deliveryCharges: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-zinc-300 font-bold block mb-1">
                Minimum Delivery Order (PKR)
              </label>
              <input
                type="number"
                value={settings.minimumOrder}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minimumOrder: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3">
            Homepage Announcement Banner
          </h2>

          <div className="text-xs space-y-3">
            <div>
              <label className="text-zinc-300 font-bold block mb-1">Announcement Text</label>
              <input
                type="text"
                value={settings.announcementText}
                onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.isAnnouncementActive}
                onChange={(e) =>
                  setSettings({ ...settings, isAnnouncementActive: e.target.checked })
                }
                className="rounded border-zinc-700 text-amber-500"
              />
              <span className="text-zinc-300 font-semibold">Display banner on top of website</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 text-sm transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Business Settings</span>
        </button>
      </form>

      <form
        onSubmit={handleCredentialsSave}
        className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-5"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Admin Login Credentials
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Change the username and password used to sign in to this dashboard.
            </p>
          </div>
        </div>

        {credentialsError && (
          <p role="alert" className="rounded-xl border border-red-800 bg-red-950/70 p-3 text-xs text-red-200">
            {credentialsError}
          </p>
        )}
        {credentialsSuccess && (
          <p role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/70 p-3 text-xs text-emerald-200">
            {credentialsSuccess}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label htmlFor="admin-username" className="text-zinc-300 font-bold block mb-1">
              New Username
            </label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              minLength={3}
              maxLength={64}
              required
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label htmlFor="current-admin-password" className="text-zinc-300 font-bold block mb-1">
              Current Password
            </label>
            <input
              id="current-admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label htmlFor="new-admin-password" className="text-zinc-300 font-bold block mb-1">
              New Password
            </label>
            <input
              id="new-admin-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Use 12–128 characters. The password is stored as a salted hash.
            </p>
          </div>
          <div>
            <label htmlFor="confirm-admin-password" className="text-zinc-300 font-bold block mb-1">
              Confirm New Password
            </label>
            <input
              id="confirm-admin-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <LockKeyhole className="w-3.5 h-3.5 shrink-0" />
            Changing credentials signs out all active admin sessions.
          </p>
          <button
            type="submit"
            disabled={credentialsLoading || !adminUsername}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            <span>{credentialsLoading ? 'Updating…' : 'Update Login Credentials'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
