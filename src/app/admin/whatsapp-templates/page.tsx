"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, RotateCcw, Save } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  createTemplatePreviewValues,
  renderWhatsAppTemplate,
  WHATSAPP_TEMPLATE_CATEGORY_LABELS,
  type WhatsAppTemplate,
  type WhatsAppTemplateCategory,
} from "@/lib/whatsapp-message-templates";

const CATEGORIES: WhatsAppTemplateCategory[] = ["website_development", "creative_studio"];

interface TemplateApiResponse {
  success: boolean;
  error?: string;
  templates: WhatsAppTemplate[];
}

export default function WhatsAppTemplatesAdminPage() {
  const [category, setCategory] = useState<WhatsAppTemplateCategory>("website_development");
  const [templates, setTemplates] = useState<Partial<Record<WhatsAppTemplateCategory, WhatsAppTemplate>>>({});
  const [variables, setVariables] = useState<Partial<Record<WhatsAppTemplateCategory, string[]>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const current = templates[category];

  const preview = useMemo(
    () => current ? renderWhatsAppTemplate(current.content, createTemplatePreviewValues(category)) : "",
    [category, current]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/whatsapp-templates", { cache: "no-store" });
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        const result = await response.json() as TemplateApiResponse & {
          variables?: Record<WhatsAppTemplateCategory, string[]>;
        };
        if (!response.ok || !result.success) throw new Error(result.error || "WhatsApp templates could not be loaded.");
        setTemplates(Object.fromEntries(result.templates.map((template) => [template.category, template])));
        setVariables(result.variables || {});
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "WhatsApp templates could not be loaded.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const updateCurrent = (patch: Partial<WhatsAppTemplate>) => {
    setTemplates((previous) => ({
      ...previous,
      [category]: previous[category] ? { ...previous[category]!, ...patch } : undefined,
    }));
    setNotice("");
    setError("");
  };

  const save = async () => {
    if (!current) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/whatsapp-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, category }),
      });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Template could not be saved.");
      setTemplates((previous) => ({ ...previous, [category]: result.template }));
      setNotice(`${WHATSAPP_TEMPLATE_CATEGORY_LABELS[category]} template saved.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Template could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(`Reset the ${WHATSAPP_TEMPLATE_CATEGORY_LABELS[category]} template and destination to their defaults?`)) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/whatsapp-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, reset: true }),
      });
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Template could not be reset.");
      setTemplates((previous) => ({ ...previous, [category]: result.template }));
      setNotice(`${WHATSAPP_TEMPLATE_CATEGORY_LABELS[category]} template reset to defaults.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Template could not be reset.");
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !current) return;
    const token = `{${variable}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = `${current.content.slice(0, start)}${token}${current.content.slice(end)}`;
    updateCurrent({ content });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const copyPreview = async () => {
    setError("");
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Preview could not be copied. Select and copy it manually.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <AdminSidebar />
      <main className="ml-64 min-h-screen">
        <AdminHeader title="WhatsApp Message Templates" subtitle="Manage the custom reply option used in each inquiry inbox." />
        <div className="mx-auto max-w-7xl space-y-5 p-5 sm:p-8">
          {(error || notice) && (
            <div role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
              {error || notice}
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-b border-slate-200">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setCategory(item); setNotice(""); setError(""); }}
                className={`border-b-2 px-4 py-3 text-sm font-bold ${category === item ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}
              >
                {WHATSAPP_TEMPLATE_CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>

          {loading || !current ? (
            <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">
              {loading ? "Loading WhatsApp templates…" : "Template data is unavailable."}
            </p>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Template settings</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    This category saves independently and does not change the other template.
                  </p>
                </div>
                <label className="block text-xs font-bold text-slate-700">
                  Template name
                  <input value={current.name} onChange={(event) => updateCurrent({ name: event.target.value })} maxLength={100} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-emerald-500 focus:outline-none" />
                </label>
                <label htmlFor="whatsapp-template-content" className="block text-xs font-bold text-slate-700">Editable message template</label>
                <textarea
                  id="whatsapp-template-content"
                  ref={textareaRef}
                  value={current.content}
                  onChange={(event) => updateCurrent({ content: event.target.value })}
                  rows={17}
                  maxLength={12000}
                  className="-mt-4 w-full resize-y rounded-xl border border-slate-300 p-3 font-mono text-sm leading-6 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <div>
                  <h3 className="mb-2 text-xs font-bold text-slate-700">Available variables — click to insert</h3>
                  <div className="flex flex-wrap gap-2">
                    {(variables[category] || []).map((variable) => (
                      <button key={variable} type="button" onClick={() => insertVariable(variable)} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:border-emerald-400 hover:bg-emerald-50">
                        {`{${variable}}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg bg-[#E31E36] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C8162D] disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Template"}
                  </button>
                  <button type="button" disabled={saving} onClick={() => void reset()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <RotateCcw className="h-4 w-4" /> Reset to Default
                  </button>
                </div>
              </section>

              <section className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Live message preview</h2>
                    <p className="mt-1 text-xs text-slate-500">Variables without a selected inquiry are shown as “Not provided”.</p>
                  </div>
                  <button type="button" onClick={() => void copyPreview()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy Message"}
                  </button>
                </div>
                <pre className="max-h-[70vh] min-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-700">{preview}</pre>
                {current.updatedAt && (
                  <p className="text-[11px] text-slate-500">
                    Last saved {new Date(current.updatedAt).toLocaleString()}
                    {current.updatedBy ? ` by ${current.updatedBy}` : ""}
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
