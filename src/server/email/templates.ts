import type { EmailTemplate } from "./port";

const ACCENT = "#1A1816";
const BG = "#F3EEE7";
const TEXT = "#12100F";
const MUTED = "#7A756E";
const BORDER = "#E5DFD6";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildEmailSubject(template: EmailTemplate): string {
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

function headline(template: EmailTemplate): string {
  switch (template) {
    case "order_created":
      return "¡Recibimos tu pedido!";
    case "payment_confirmed":
      return "Pago confirmado";
    case "ready_pickup":
      return "Listo para retiro";
    case "shipped":
      return "Tu pedido va en camino";
    case "delivered":
      return "Pedido entregado";
    case "cancelled":
      return "Pedido cancelado";
    default:
      return "Actualización de pedido";
  }
}

function bodyParagraphs(template: EmailTemplate, data: Record<string, unknown>): string[] {
  const code = String(data.code ?? data.orderCode ?? "");
  const total = formatMoney(data.totalCents ?? data.total_cents);
  const paymentMethod = String(data.paymentMethod ?? data.payment_method ?? "");
  const cbu = String(data.transferCbuAlias ?? data.cbu ?? "");
  const reason = data.reason != null ? String(data.reason) : "";
  const safeCode = escapeHtml(code);
  const out: string[] = [];

  switch (template) {
    case "order_created":
      out.push(
        `Recibimos tu pedido <strong style="color:${TEXT}">${safeCode}</strong>${
          total ? ` por <strong style="color:${TEXT}">${escapeHtml(total)}</strong>` : ""
        }.`,
      );
      if (paymentMethod === "transfer") {
        out.push(
          `Pagá por transferencia${cbu ? ` a <strong style="color:${TEXT}">${escapeHtml(cbu)}</strong>` : " con el CBU/alias de la tienda"}.`,
        );
        out.push(
          "Tenés 24 h de reserva. Subí el comprobante desde el seguimiento del pedido mientras esté pendiente de pago.",
        );
      } else if (paymentMethod === "cash") {
        out.push("Elegiste pago en efectivo al retirar en el local de San Manuel.");
      } else {
        out.push("Seguí el estado del pedido con el botón de abajo.");
      }
      break;
    case "payment_confirmed":
      out.push(
        `Confirmamos el pago de tu pedido <strong style="color:${TEXT}">${safeCode}</strong>. Ya lo preparamos para envío o retiro.`,
      );
      break;
    case "ready_pickup":
      out.push(
        `Tu pedido <strong style="color:${TEXT}">${safeCode}</strong> está listo para retirar en el local (San Manuel).`,
      );
      break;
    case "shipped":
      out.push(
        `Tu pedido <strong style="color:${TEXT}">${safeCode}</strong> fue despachado por Andreani. Te avisamos cuando figure entregado.`,
      );
      break;
    case "delivered":
      out.push(
        `Tu pedido <strong style="color:${TEXT}">${safeCode}</strong> fue marcado como entregado. ¡Gracias por confiar en Activate!`,
      );
      break;
    case "cancelled":
      out.push(
        `Tu pedido <strong style="color:${TEXT}">${safeCode}</strong> fue cancelado${
          reason ? ` (${escapeHtml(reason)})` : ""
        }. El stock se liberó automáticamente.`,
      );
      break;
    default:
      out.push(`Actualización de tu pedido <strong style="color:${TEXT}">${safeCode}</strong>.`);
  }
  return out;
}

/**
 * Branded HTML email (Pencil-ish 37–38 / 51–54): logo bar, status, CTA to /pedido?token=.
 */
export function buildEmailHtml(
  template: EmailTemplate,
  data: Record<string, unknown>,
): string {
  const code = String(data.code ?? data.orderCode ?? "");
  const accessToken = String(data.accessToken ?? data.access_token ?? "");
  const appUrl = String(data.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const magicLink =
    accessToken && appUrl ? `${appUrl}/pedido?token=${encodeURIComponent(accessToken)}` : "";
  const logoUrl = appUrl ? `${appUrl}/brand/logo.png` : "";
  const title = headline(template);
  const paragraphs = bodyParagraphs(template, data)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${MUTED}">${p}</p>`,
    )
    .join("");

  const cta = magicLink
    ? `<p style="margin:28px 0 8px;text-align:center">
        <a href="${escapeHtml(magicLink)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:999px">Ver pedido</a>
      </p>
      <p style="margin:0 0 8px;text-align:center;font-size:12px;color:${MUTED}">O copiá este enlace:<br/><a href="${escapeHtml(magicLink)}" style="color:${ACCENT};word-break:break-all">${escapeHtml(magicLink)}</a></p>`
    : code
      ? `<p style="margin:20px 0 0;font-size:14px;color:${MUTED}">Código de pedido: <strong style="color:${TEXT}">${escapeHtml(code)}</strong></p>`
      : "";

  return `<!DOCTYPE html>
<html lang="es-AR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:'DM Sans',Helvetica,Arial,sans-serif;color:${TEXT}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid ${BORDER};overflow:hidden">
        <tr>
          <td style="background:${ACCENT};padding:18px 24px;text-align:center">
            ${
              logoUrl
                ? `<img src="${escapeHtml(logoUrl)}" alt="Activate" width="140" height="42" style="display:inline-block;height:42px;width:auto;max-width:160px;object-fit:contain"/>`
                : `<span style="color:#fff;font-weight:700;letter-spacing:0.14em;font-size:16px">ACTIVATE</span>`
            }
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT}">Activate Moda Deportiva</p>
            <h1 style="margin:0 0 18px;font-size:22px;line-height:1.25;color:${TEXT};font-weight:700">${escapeHtml(title)}</h1>
            ${paragraphs}
            ${cta}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 28px;border-top:1px solid ${BORDER}">
            <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:${MUTED}">
              San Manuel · moda deportiva<br/>
              Este mail es automático; respondé por WhatsApp si necesitás ayuda.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
