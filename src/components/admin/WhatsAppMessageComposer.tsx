"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MessageSquare, X } from "lucide-react";
import {
  buildWhatsAppTemplateLink,
  type WhatsAppReplyOption,
} from "@/lib/whatsapp-message-templates";

interface WhatsAppMessageComposerProps {
  title: string;
  customerName: string;
  recipientPhone: string;
  templateOptions: WhatsAppReplyOption[];
  onClose: () => void;
}

export default function WhatsAppMessageComposer({
  title,
  customerName,
  recipientPhone,
  templateOptions,
  onClose,
}: WhatsAppMessageComposerProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateOptions[0]?.id || "");
  const [message, setMessage] = useState(templateOptions[0]?.message || "");
  const whatsappUrl = useMemo(
    () => buildWhatsAppTemplateLink(recipientPhone, message),
    [message, recipientPhone]
  );

  const selectTemplate = (id: string) => {
    const option = templateOptions.find((item) => item.id === id);
    if (!option) return;
    setSelectedTemplateId(option.id);
    setMessage(option.message);
  };

  const copyMessage = async () => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Message could not be copied. Select and copy the text manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-composer-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="whatsapp-composer-title" className="text-xl font-black text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Replying to <strong>{customerName}</strong>. Choose a ready-made reply, edit it if needed, then open WhatsApp to send it yourself.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close message preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label htmlFor="whatsapp-ready-reply" className="mb-2 block text-xs font-bold text-slate-700">
          Ready-made reply template
        </label>
        <select
          id="whatsapp-ready-reply"
          value={selectedTemplateId}
          onChange={(event) => selectTemplate(event.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
        >
          {templateOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>

        <label htmlFor="whatsapp-message-preview" className="mb-2 block text-xs font-bold text-slate-700">
          Editable message preview
        </label>
        <textarea
          id="whatsapp-message-preview"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={18}
          className="w-full resize-y rounded-xl border border-slate-300 p-3 font-mono text-sm leading-6 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
        <p className="mt-3 break-all text-xs text-slate-600">
          Customer WhatsApp: <strong>{recipientPhone || "Not provided"}</strong>
        </p>
        {copyError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{copyError}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => void copyMessage()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Message"}
          </button>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">
              <MessageSquare className="h-4 w-4" />
              Send via WhatsApp
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500">
              Customer WhatsApp number is unavailable or invalid
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
