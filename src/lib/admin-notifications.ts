import { BUSINESS_INFO } from "@/lib/constants";

export interface AdminSubmissionAlert {
  type: "Project inquiry" | "Contact inquiry" | "Payment order" | "Payment received";
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  details: string;
}

type DeliveryResult = "sent" | "failed" | "not_configured";

function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const recipient = (process.env.WHATSAPP_ADMIN_PHONE || BUSINESS_INFO.whatsappInternational)
    .replace(/\D/g, "");
  const templateName = process.env.WHATSAPP_ADMIN_TEMPLATE_NAME?.trim();
  const templateLanguage = process.env.WHATSAPP_ADMIN_TEMPLATE_LANGUAGE?.trim() || "en";

  if (!token || !phoneNumberId || !templateName) return null;
  if (!/^\d{7,20}$/.test(phoneNumberId) || !/^\d{8,15}$/.test(recipient)) {
    throw new Error("WhatsApp Cloud API phone number configuration is invalid.");
  }
  if (!/^[a-z0-9_]{1,512}$/i.test(templateName) || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(templateLanguage)) {
    throw new Error("WhatsApp notification template configuration is invalid.");
  }

  const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0";
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error("WhatsApp Graph API version must use the format vNN.N.");
  }

  return { token, phoneNumberId, recipient, templateName, templateLanguage, version };
}

async function sendEmailAlert(alert: AdminSubmissionAlert): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return "not_configured";

  const to = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || BUSINESS_INFO.email;
  const text = [
    `New ${alert.type}`,
    `Reference: ${alert.reference}`,
    `Customer: ${alert.customerName}`,
    `Email: ${alert.customerEmail}`,
    `Phone: ${alert.customerPhone}`,
    "",
    alert.details,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${alert.type}: ${alert.reference}`,
      text,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the notification (HTTP ${response.status}).`);
  }
  return "sent";
}

async function sendWhatsAppAlert(alert: AdminSubmissionAlert): Promise<DeliveryResult> {
  const config = getWhatsAppConfig();
  if (!config) return "not_configured";

  const response = await fetch(
    `https://graph.facebook.com/${config.version}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: config.recipient,
        type: "template",
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: alert.type },
                { type: "text", text: alert.reference },
                { type: "text", text: `${alert.customerName} (${alert.customerPhone})` },
                { type: "text", text: alert.details.slice(0, 1024) || "No additional details." },
              ],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!response.ok) {
    throw new Error(`WhatsApp Cloud API rejected the notification (HTTP ${response.status}).`);
  }
  return "sent";
}

export async function notifyAdminOfSubmission(alert: AdminSubmissionAlert): Promise<void> {
  const channels = await Promise.allSettled([
    sendEmailAlert(alert),
    sendWhatsAppAlert(alert),
  ]);
  const names = ["email", "WhatsApp"] as const;

  channels.forEach((result, index) => {
    const channel = names[index];
    if (result.status === "rejected") {
      console.error(`Admin ${channel} notification failed for ${alert.reference}`, result.reason);
    } else if (result.value === "not_configured") {
      console.warn(`Admin ${channel} notification is not configured; ${alert.reference} was saved without this alert.`);
    }
  });
}
