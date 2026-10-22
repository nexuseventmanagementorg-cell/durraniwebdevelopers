import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { BUSINESS_INFO } from "@/lib/constants";
import { PaymentReminder } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const reminders = DataStore.getReminders();
  return NextResponse.json({ success: true, reminders });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, reminderId, projectId, installmentNumber, amount, dueDate, reminderType, channel } = body;

    // Action: Mark sent manually (e.g. after admin clicks WhatsApp or confirms contact)
    if (action === "mark_sent") {
      const reminders = DataStore.getReminders();
      const target = reminders.find((r) => r.id === reminderId);
      if (!target) {
        return NextResponse.json({ success: false, error: "Reminder not found" }, { status: 404 });
      }

      target.status = "Sent";
      target.sentAt = new Date().toISOString();
      DataStore.saveReminder(target, "Admin");

      return NextResponse.json({ success: true, reminder: target });
    }

    // Action: Create or schedule new reminder
    const project = DataStore.getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const newReminder: PaymentReminder = {
      id: `rem-${Date.now().toString().slice(-6)}`,
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      clientPhone: project.clientPhone,
      clientEmail: project.clientEmail,
      installmentNumber: Number(installmentNumber || 1),
      amount: Number(amount || 0),
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      reminderType: reminderType || "7_days_before",
      channel: channel || "whatsapp",
      scheduledDate: new Date().toISOString().split("T")[0],
      status: "Scheduled",
      messageText: `Dear ${project.clientName}, this is a friendly reminder regarding your installment payment of PKR ${amount} for project "${project.name}" due on ${dueDate}. Thank you, Durrani Web Developers (${BUSINESS_INFO.phoneDisplay}).`,
    };

    DataStore.saveReminder(newReminder, "Admin");
    return NextResponse.json({ success: true, reminder: newReminder });
  } catch (error) {
    console.error("Reminder management error", error);
    return NextResponse.json(
      { success: false, error: "Failed to process reminder action" },
      { status: 500 }
    );
  }
}
