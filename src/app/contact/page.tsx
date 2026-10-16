"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BUSINESS_INFO, buildWhatsAppLink } from "@/lib/constants";
import {
  Mail,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  Calculator,
  ShieldCheck,
} from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Custom Web Application Inquiry");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit message.");
      }

      setSuccessMsg(data.message || "Thank you! We will reach out shortly.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit message. Please try WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] text-[#101216] min-h-screen">
      {/* Header Banner */}
      <section className="bg-[#101216] text-white py-14 border-b border-[#242830]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest bg-[#242830] px-3.5 py-1 rounded-full border border-[#E31E36]/30">
            Get In Touch
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Contact Durrani Web Developers
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
            Ready to build a high-performance web application? Chat directly with us on WhatsApp or submit your inquiry below.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Direct Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-bold text-[#E31E36] uppercase tracking-wider">
                Direct Communication
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                We Are Fast & Responsive
              </h2>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                We work directly with founders, business owners, and managers across Pakistan and globally. No convoluted agency layers.
              </p>
            </div>

            {/* WhatsApp Card */}
            <div className="bg-[#F4F5F7] p-6 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#101216]">
                    WhatsApp Direct Chat
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fastest response time (Typically within 15 mins)
                  </p>
                  <a
                    href={buildWhatsAppLink("Hello! I want to discuss a new web application project with Durrani Web Developers.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow transition"
                  >
                    <span>Chat Now: {BUSINESS_INFO.phoneDisplay}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Email & Phone Cards */}
            <div className="space-y-3">
              <a
                href={`mailto:${BUSINESS_INFO.email}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#F4F5F7] hover:bg-gray-100 border border-gray-200 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-white group-hover:bg-[#E31E36] text-[#E31E36] group-hover:text-white flex items-center justify-center transition shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Official Email
                  </span>
                  <span className="text-xs font-bold text-[#101216] group-hover:text-[#E31E36]">
                    {BUSINESS_INFO.email}
                  </span>
                </div>
              </a>

              <a
                href={`tel:${BUSINESS_INFO.phone}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#F4F5F7] hover:bg-gray-100 border border-gray-200 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-white group-hover:bg-[#E31E36] text-[#E31E36] group-hover:text-white flex items-center justify-center transition shadow-sm">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">
                    Phone / Call
                  </span>
                  <span className="text-xs font-bold text-[#101216] group-hover:text-[#E31E36]">
                    {BUSINESS_INFO.phoneDisplay}
                  </span>
                </div>
              </a>
            </div>

            {/* Calculator CTA Box */}
            <div className="bg-[#101216] text-white p-6 rounded-2xl border border-gray-800 shadow-card-dark space-y-3">
              <span className="text-xs font-bold text-[#E31E36] uppercase tracking-wider block">
                Need an immediate cost estimate?
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">
                Use our dynamic 8-step budget calculator to configure specific features and generate an exact breakdown right away.
              </p>
              <Link
                href="/calculator"
                className="inline-flex items-center gap-2 bg-[#E31E36] hover:bg-[#C8162D] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-glow transition"
              >
                <Calculator className="w-4 h-4" />
                Launch Calculator
              </Link>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-[#F4F5F7] p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-black text-[#101216]">
                Send Us a Message
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Fill out the form and our technical lead will contact you directly.
              </p>
            </div>

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-[#E31E36] font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Your Name <span className="text-[#E31E36]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Farhan Durrani"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address <span className="text-[#E31E36]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 03299669565"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Subject / Project Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Restaurant Web App, E-Commerce..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Your Message or Requirements <span className="text-[#E31E36]">*</span>
                </label>
                <textarea
                  rows={5}
                  placeholder="Misal: Hamein apne kapron ke business ke liye online store chahiye. Customer products ki tasveerain, sizes aur prices dekh sake, cart mein items dale aur WhatsApp par order bhej sake. Admin panel ki zaroorat hai taake hum khud naye products aur stock update kar saken."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#E31E36] hover:bg-[#C8162D] text-white py-3 rounded-xl font-bold text-xs shadow-glow transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Inquiry Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
