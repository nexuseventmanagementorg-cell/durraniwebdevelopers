import { NextRequest, NextResponse } from "next/server";
import { DataStore } from "@/lib/store";
import { BUSINESS_INFO } from "@/lib/constants";
import { PaymentReminder } from "@/lib/types";
import { runWithCronAuthorization } from "@/lib/cron-auth";

async function createRemindersResponse(): Promise<NextResponse> {
  try {
    const projects = DataStore.getProjects().filter(
      (project) =>
        project.status === "Approved" ||
        project.status === "In Development" ||
        project.status === "Delivered"
    );
    const existingReminders = DataStore.getReminders();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const generatedReminders: PaymentReminder[] = [];
    const hasExternalWhatsAppApi = Boolean(process.env.WHATSAPP_API_TOKEN);
    const hasExternalEmailApi = Boolean(process.env.RESEND_API_KEY);

    for (const project of projects) {
      if (project.remainingBalance <= 0) continue;

      const monthlyAmount = Number((project.remainingBalance / 11).toFixed(2));
      const nextDue = new Date(project.createdAt);
      nextDue.setMonth(nextDue.getMonth() + 1);

      const daysDiff = Math.ceil(
        (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let reminderType: PaymentReminder["reminderType"] | null = null;
      if (daysDiff === 7) reminderType = "7_days_before";
      else if (daysDiff === 3) reminderType = "3_days_before";
      else if (daysDiff === 0) reminderType = "on_due_date";
      else if (daysDiff < 0) reminderType = "overdue";

      if (!reminderType) continue;

      const alreadyExists = existingReminders.some(
        (reminder) =>
          reminder.projectId === project.id &&
          reminder.reminderType === reminderType &&
          reminder.scheduledDate === today.toISOString().split("T")[0]
      );
      if (alreadyExists) continue;

      const reminder: PaymentReminder = {
        id: `rem-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`,
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
        status: hasExternalWhatsAppApi ? "Sent" : "Pending Manual Action",
        messageText: `Assalam-o-Alaikum ${project.clientName}, your installment of PKR ${monthlyAmount} for ${project.name} is due on ${nextDue.toLocaleDateString()}. Durrani Web Developers (${BUSINESS_INFO.phoneDisplay}).`,
        sentAt: hasExternalWhatsAppApi ? new Date().toISOString() : undefined,
      };

      DataStore.saveReminder(reminder, "Cron Worker");
      generatedReminders.push(reminder);
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
    return NextResponse.json(
      { success: false, error: "Cron execution failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const result = await runWithCronAuthorization(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
    createRemindersResponse
  );

  if (!result.authorized) {
    return NextResponse.json(
      { success: false, error: "Unauthorized cron execution" },
      { status: 401 }
    );
  }

  return result.value;
}
