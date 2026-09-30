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

function formatMoney(cents: unknown): string {
  const n = typeof cents === "number" ? cents : Number(cents);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(n / 100);
}

function htmlFor(template: EmailTemplate, data: Record<string, unknown>): string {
  const code = String(data.code ?? data.orderCode ?? "");
  const accessToken = String(data.access_token ?? data.accessToken ?? "");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const magicLink =
    accessToken && appUrl ? `${appUrl}/pedido?token=${encodeURIComponent(accessToken)}` : "";
  const total = formatMoney(data.totalCents ?? data.total_cents);
  const paymentMethod = String(data.paymentMethod ?? data.payment_method ?? "");
  const cbu = String(data.transferCbuAlias ?? data.cbu ?? "");

  const lines: string[] = [`<p>Hola,</p>`];

  switch (template) {
    case "order_created":
      lines.push(
        `<p>Recibimos tu pedido <strong>${escapeHtml(code)}</strong>${total ? ` por <strong>${escapeHtml(total)}</strong>` : ""}.</p>`,
      );
      if (paymentMethod === "transfer") {
        lines.push(
          `<p>Pagá por transferencia${cbu ? ` a <strong>${escapeHtml(cbu)}</strong>` : " usando el CBU/alias de la tienda"}.</p>`,
          `<p>Podés subir el comprobante desde el seguimiento del pedido mientras esté pendiente de pago (reserva 24 h).</p>`,
        );
      } else if (paymentMethod === "cash") {
        lines.push(`<p>Elegiste pago en efectivo al retirar en el local.</p>`);
      }
      break;
    case "payment_confirmed":
      lines.push(`<p>Confirmamos el pago de tu pedido <strong>${escapeHtml(code)}</strong>.</p>`);
      break;
    case "ready_pickup":
      lines.push(
        `<p>Tu pedido <strong>${escapeHtml(code)}</strong> está listo para retirar en el local.</p>`,
      );
      break;
    case "shipped":
      lines.push(`<p>Tu pedido <strong>${escapeHtml(code)}</strong> fue despachado (Andreani).</p>`);
      break;
    case "delivered":
      lines.push(`<p>Tu pedido <strong>${escapeHtml(code)}</strong> fue marcado como entregado.</p>`);
      break;
    case "cancelled":
      lines.push(
        `<p>Tu pedido <strong>${escapeHtml(code)}</strong> fue cancelado${data.reason ? ` (${escapeHtml(String(data.reason))})` : ""}.</p>`,
      );
      break;
    default:
      lines.push(`<p>Actualización de tu pedido <strong>${escapeHtml(code)}</strong>.</p>`);
  }

  if (magicLink) {
    lines.push(`<p><a href="${escapeHtml(magicLink)}">Ver pedido</a></p>`);
  } else if (code) {
    lines.push(`<p>Código de pedido: <strong>${escapeHtml(code)}</strong></p>`);
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
