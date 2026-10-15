import { NextRequest, NextResponse } from "next/server";
import { DataStore } from "@/lib/store";
import { PaymentReminder } from "@/lib/types";

export async function GET(request: NextRequest) {
  // Authorization check for Vercel Cron or secure external runners
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    process.env.NODE_ENV === "production" &&
    (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
  ) {
    return NextResponse.json({ success: false, error: "Unauthorized cron execution" }, { status: 401 });
  }

  try {
    const projects = DataStore.getProjects().filter(
      (p) => p.status === "Approved" || p.status === "In Development" || p.status === "Delivered"
    );
    const existingReminders = DataStore.getReminders();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const generatedReminders: PaymentReminder[] = [];
    const hasExternalWhatsAppApi = Boolean(process.env.WHATSAPP_API_TOKEN);
    const hasExternalEmailApi = Boolean(process.env.RESEND_API_KEY);

    for (const project of projects) {
      if (project.remainingBalance <= 0) continue;

      // Project installment calculation
      const monthlyAmount = Number((project.remainingBalance / 11).toFixed(2));
      const nextDue = new Date(project.createdAt);
      nextDue.setMonth(nextDue.getMonth() + 1);

      const daysDiff = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let reminderType: PaymentReminder["reminderType"] | null = null;
      if (daysDiff === 7) reminderType = "7_days_before";
      else if (daysDiff === 3) reminderType = "3_days_before";
      else if (daysDiff === 0) reminderType = "on_due_date";
      else if (daysDiff < 0) reminderType = "overdue";

      if (reminderType) {
        // Idempotency check: Don't create duplicate reminder for same project + type today
        const alreadyExists = existingReminders.some(
          (r) =>
            r.projectId === project.id &&
            r.reminderType === reminderType &&
            r.scheduledDate === today.toISOString().split("T")[0]
        );

        if (!alreadyExists) {
          const reminderId = `rem-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
          const status = hasExternalWhatsAppApi ? "Sent" : "Pending Manual Action";

          const reminder: PaymentReminder = {
            id: reminderId,
            projectId: project.id,
            projectName: project.name,
            clientId: project.clientId,
            clientName: project.clientName,
            clientPhone: project.clientPhone,
            clientEmail: project.clientEmail,
            installmentNumber: 1,
            amount: monthlyAmount,
            dueDate: nextDue.toISOString().split("T")[0],
            reminderType,
            channel: "whatsapp",
            scheduledDate: today.toISOString().split("T")[0],
            status,
            messageText: `Assalam-o-Alaikum ${project.clientName}, your installment of PKR ${monthlyAmount} for ${project.name} is due on ${nextDue.toLocaleDateString()}. Durrani Web Developers (03299669565).`,
            sentAt: hasExternalWhatsAppApi ? new Date().toISOString() : undefined,
          };

          DataStore.saveReminder(reminder, "Cron Worker");
          generatedReminders.push(reminder);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedAt: new Date().toISOString(),
      generatedCount: generatedReminders.length,
      automatedIntegrations: {
        whatsAppApi: hasExternalWhatsAppApi,
        emailApi: hasExternalEmailApi,
      },
      reminders: generatedReminders,
    });
  } catch (error) {
    console.error("Cron reminders error", error);
    return NextResponse.json({ success: false, error: "Cron execution failed" }, { status: 500 });
  }
}
