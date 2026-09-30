import { Resend } from "resend";
import type { EmailPort, EmailTemplate } from "./port";

function subjectFor(template: EmailTemplate): string {
  switch (template) {
    case "order_created":
      return "Pedido recibido — Activate Moda Deportiva";
    case "payment_confirmed":
      return "Pago confirmado — Activate Moda Deportiva";
    case "ready_pickup":
      return "Listo para retiro — Activate Moda Deportiva";
    case "shipped":
      return "Pedido enviado — Activate Moda Deportiva";
    case "delivered":
      return "Pedido entregado — Activate Moda Deportiva";
    case "cancelled":
      return "Pedido cancelado — Activate Moda Deportiva";
    default:
      return "Activate Moda Deportiva";
  }
}

function htmlFor(template: EmailTemplate, data: Record<string, unknown>): string {
  const code = String(data.code ?? data.orderCode ?? "");
  const accessToken = String(data.access_token ?? data.accessToken ?? "");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const magicLink =
    accessToken && appUrl ? `${appUrl}/pedido?token=${encodeURIComponent(accessToken)}` : "";

  const lines = [
    `<p>Hola,</p>`,
    `<p>Actualización de tu pedido <strong>${escapeHtml(code)}</strong> (${escapeHtml(template)}).</p>`,
  ];
  if (magicLink) {
    lines.push(`<p><a href="${escapeHtml(magicLink)}">Ver pedido</a></p>`);
  }
  lines.push(`<p>— Activate Moda Deportiva</p>`);
  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function createResendEmail(): EmailPort {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for Resend email");
  }
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Activate <onboarding@resend.dev>";

  return {
    async send({ template, to, data }) {
      await resend.emails.send({
        from,
        to,
        subject: subjectFor(template),
        html: htmlFor(template, data),
      });
    },
  };
}
