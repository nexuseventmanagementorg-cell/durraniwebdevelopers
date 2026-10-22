"use client";

import { buildWhatsAppLink, BUSINESS_INFO } from "@/lib/constants";
import { MessageSquare, ShieldCheck } from "lucide-react";

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen bg-white text-[#101216]">
      <section className="border-b border-[#242830] bg-[#101216] py-14 text-white">
        <div className="mx-auto max-w-4xl space-y-4 px-4 text-center sm:px-6">
          <span className="inline-flex rounded-full border border-[#E31E36]/30 bg-[#242830] px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-[#E31E36]">
            Customer inquiry support
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Customer tracking is currently unavailable
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-gray-300 sm:text-base">
            Online inquiry and project-status lookup is disabled. No inquiry,
            estimate, payment, or project-progress details are displayed here.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="space-y-2">
              <h2 className="text-sm font-bold">Tracking remains disabled</h2>
              <p className="text-sm leading-relaxed text-amber-900">
                It will remain unavailable pending separately approved and
                verified session authorization. Matching an inquiry reference
                and email does not grant access, and no OTP or verified-session
                tracking feature is currently available.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-[#F4F5F7] p-6 text-center">
          <p className="text-sm text-gray-700">
            For a status inquiry, contact our team directly. Do not send
            payment details or other sensitive information in your message.
          </p>
          <a
            href={buildWhatsAppLink(
              "Assalam-o-Alaikum Durrani Web Developers, I would like to ask about my inquiry status."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            <MessageSquare className="h-4 w-4" />
            Contact DWD on WhatsApp ({BUSINESS_INFO.phoneDisplay})
          </a>
        </div>
      </section>
    </main>
  );
}
