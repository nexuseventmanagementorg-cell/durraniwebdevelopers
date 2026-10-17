"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Project, OrderStatus } from "@/lib/types";
import { formatPKR, buildWhatsAppLink } from "@/lib/constants";
import {
  Briefcase,
  Search,
  Filter,
  ExternalLink,
  Edit2,
  CheckCircle2,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editStatus, setEditStatus] = useState<OrderStatus>("Approved");
  const [editUrl, setEditUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [savingWorkflow, setSavingWorkflow] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const statusList: OrderStatus[] = [
    "Approved",
    "In Development",
    "Testing",
    "Delivered",
    "Completed",
    "On Hold",
    "Cancelled",
  ];

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/admin/projects");
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        setLoadError(data.error || "Projects could not be loaded.");
      }
    } catch (e) {
      console.error(e);
      setLoadError("Projects could not be loaded. Check the project storage configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openEditModal = (p: Project) => {
    setSelectedProject(p);
    setEditStatus(p.status);
    setEditUrl(p.deploymentUrl || "");
    setEditNotes(p.adminNotes || "");
  };

  const handleSaveProject = async () => {
    if (!selectedProject) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProject.id,
          status: editStatus,
          deploymentUrl: editUrl,
          adminNotes: editNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === selectedProject.id ? data.project : p))
        );
        setSelectedProject(null);
        setSuccessMsg("Project updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleProjectChecklistChange = async (itemId: string, completed: boolean) => {
    if (!selectedProject?.projectBuildBrief) return;
    const checklist = selectedProject.projectBuildBrief.checklist.map((item) =>
      item.id === itemId ? { ...item, completed } : item
    );
    setSavingChecklist(true);

    try {
      const response = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProject.id, projectBuildBrief: { checklist } }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save checklist progress.");
      setSelectedProject(result.project);
      setProjects((previous) => previous.map((project) => project.id === result.project.id ? result.project : project));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not save checklist progress.");
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleWorkflowTaskChange = async (taskId: string, status: "in_progress" | "completed") => {
    if (!selectedProject?.automationWorkflow) return;
    setSavingWorkflow(true);
    try {
      const response = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProject.id, automationTask: { taskId, status } }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not update the workflow task.");
      setSelectedProject(result.project);
      setProjects((previous) => previous.map((project) => project.id === result.project.id ? result.project : project));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update the workflow task.");
    } finally {
      setSavingWorkflow(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex">
      <AdminSidebar />

      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <AdminHeader
          title="Active Projects Pipeline"
          subtitle="Monitor active builds, Vercel deployments, timelines, and balances"
        />

        <div className="p-6 space-y-6 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
          {loadError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
              {loadError}
            </div>
          )}

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects by name, client, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F4F5F7] text-xs text-[#101216] pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
            <span className="text-xs text-gray-500 font-semibold">
              Total Projects: <strong>{projects.length}</strong>
            </span>
          </div>

          {/* Projects Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center space-y-2">
                <div className="w-7 h-7 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500">Loading active projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-500">
                No active projects found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F5F7] border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Project ID & Name</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Approved Total</th>
                      <th className="py-3 px-4">Advance Received</th>
                      <th className="py-3 px-4">Balance Remaining</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Deployment</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4">
                          <strong className="text-[#101216] block">{p.name}</strong>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {p.id} • {p.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-gray-800 block">{p.clientName}</strong>
                          <span className="text-[11px] text-gray-400">{p.clientPhone}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-800">
                          {formatPKR(p.approvedPrice)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {formatPKR(p.advanceReceived || 0)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#E31E36]">
                          {formatPKR(p.remainingBalance || 0)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.deploymentUrl ? (
                            <a
                              href={p.deploymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#E31E36] hover:underline inline-flex items-center gap-1"
                            >
                              Live App <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Pending Deploy</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="bg-gray-100 hover:bg-gray-200 text-[#101216] px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <a
                            href={buildWhatsAppLink(
                              `Assalam-o-Alaikum ${p.clientName}, Durrani Web Developers update regarding project "${p.name}". Status: ${p.status}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg inline-flex items-center transition"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
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

      {/* Edit Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-gray-300">
            <div className="flex justify-between items-start pb-3 border-b border-gray-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Update Project</span>
                <h3 className="text-xl font-black text-[#101216]">{selectedProject.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-400 hover:text-black p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Project Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-[#101216]"
                >
                  {statusList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Vercel Live Deployment URL
                </label>
                <input
                  type="url"
                  placeholder="https://client-project.vercel.app"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Private Admin Notes & Scope Progress
                </label>
                <textarea
                  rows={4}
                  placeholder="Internal development notes, client requests..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#F4F5F7] px-3.5 py-2.5 rounded-xl border border-gray-300 text-[#101216]"
                />
              </div>

              {selectedProject.projectBuildBrief && (
                <section className="border-t border-gray-200 pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="font-bold text-gray-700">Build readiness</h4>
                    <span className="text-[10px] text-gray-500">
                      {selectedProject.projectBuildBrief.checklist.filter((item) => item.completed).length} / {selectedProject.projectBuildBrief.checklist.length} complete
                    </span>
                  </div>
                  <div className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                    {selectedProject.projectBuildBrief.checklist.map((item) => (
                      <label key={item.id} className="flex items-start gap-2.5 px-3 py-2 text-[11px] leading-relaxed text-gray-700">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={savingChecklist}
                          onChange={(event) => void handleProjectChecklistChange(item.id, event.target.checked)}
                          className="mt-0.5 accent-[#E31E36]"
                        />
                        <span className={item.completed ? "text-gray-400 line-through" : ""}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  <details className="mt-2 text-[11px] text-gray-600">
                    <summary className="cursor-pointer font-semibold">View saved project brief</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-mono text-[10px] leading-relaxed">{selectedProject.projectBuildBrief.content}</pre>
                  </details>
                </section>
              )}

              {selectedProject.automationWorkflow && (
                <section className="border-t border-gray-200 pt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="font-bold text-gray-700">Project workflow</h4>
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">
                      Admin assisted
                    </span>
                  </div>
                  <p className="mb-3 text-[10px] text-gray-500">
                    Role-assigned work queue. Code generation and deployment agents are not connected yet.
                  </p>
                  <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {selectedProject.automationWorkflow.tasks.map((task) => (
                      <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div>
                          <p className="text-[11px] font-bold text-gray-800">{task.title}</p>
                          <p className="text-[10px] text-gray-500">{task.role} · {task.status.replaceAll("_", " ")}</p>
                        </div>
                        {task.status === "ready" && (
                          <button type="button" disabled={savingWorkflow} onClick={() => void handleWorkflowTaskChange(task.id, "in_progress")} className="rounded-md border border-gray-300 px-2.5 py-1.5 text-[10px] font-bold text-gray-700 disabled:opacity-50">
                            Start
                          </button>
                        )}
                        {task.status === "in_progress" && (
                          <button type="button" disabled={savingWorkflow} onClick={() => void handleWorkflowTaskChange(task.id, "completed")} className="rounded-md bg-[#101216] px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">
                            Complete
                          </button>
                        )}
                        {task.status === "awaiting_admin" && (
                          <button type="button" disabled={savingWorkflow} onClick={() => void handleWorkflowTaskChange(task.id, "completed")} className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-950 disabled:opacity-50">
                            Confirm deployment
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProject}
                className="bg-[#E31E36] hover:bg-[#C8162D] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-glow disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
