import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clients = DataStore.getClients();
  const projects = DataStore.getProjects();
  const inquiries = DataStore.getInquiries();
  const payments = DataStore.getPayments();
  const reminders = DataStore.getReminders();
  const auditLogs = DataStore.getAuditLogs();

  const totalClients = clients.length;
  const activeProjects = projects.filter(
    (p) => p.status === "In Development" || p.status === "Testing" || p.status === "Approved"
  ).length;

  const newInquiries = inquiries.filter((i) => i.status === "New Inquiry").length;
  const projectsAwaitingApproval = inquiries.filter(
    (i) => i.status === "Quotation Sent" || i.status === "Awaiting Advance"
  ).length;

  // Revenue calculation: only verified Paid payments
  const revenueReceived = payments
    .filter((p) => p.status === "Paid" && p.verifiedByAdmin)
    .reduce((sum, p) => sum + p.amount, 0);

  // Outstanding balances across active projects
  const outstandingBalances = projects.reduce((sum, p) => sum + (p.remainingBalance || 0), 0);

  const pendingPayments = payments.filter((p) => p.status === "Awaiting Verification").length;
  const upcomingReminders = reminders.filter((r) => r.status === "Scheduled").length;

  // Monthly revenue breakdown for charting
  const monthlyRevenueMap: Record<string, number> = {};
  for (const p of payments) {
    if (p.status === "Paid" && p.verifiedByAdmin) {
      const date = new Date(p.paymentDate);
      const key = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + p.amount;
    }
  }

  return NextResponse.json({
    success: true,
    stats: {
      totalClients,
      activeProjects,
      newInquiries,
      projectsAwaitingApproval,
      revenueReceived,
      outstandingBalances,
      pendingPayments,
      upcomingReminders,
      monthlyRevenueMap,
      recentActivity: auditLogs.slice(0, 8),
    },
  });
}
