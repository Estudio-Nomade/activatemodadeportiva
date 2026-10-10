import { describe, expect, it } from "vitest";
import {
  buildEmailHtml,
  buildEmailSubject,
  buildEmailSubjectWithData,
} from "./templates";

describe("buildEmailSubject", () => {
  it("returns branded subjects per template", () => {
    expect(buildEmailSubject("order_created")).toContain("Pedido recibido");
    expect(buildEmailSubject("payment_confirmed")).toContain("Pago confirmado");
    expect(buildEmailSubject("payment_proof_received")).toContain("Comprobante");
    expect(buildEmailSubject("cancelled")).toContain("cancelado");
  });
});

describe("buildEmailSubjectWithData", () => {
  it("includes order code on payment_proof_received", () => {
    expect(
      buildEmailSubjectWithData("payment_proof_received", { code: "ACT-99" }),
    ).toContain("ACT-99");
  });
});

describe("buildEmailHtml", () => {
  const base = {
    code: "ACT-28491",
    accessToken: "tok-secret",
    totalCents: 24500_00,
    paymentMethod: "transfer",
    transferCbuAlias: "activate.moda.mp",
    appUrl: "https://shop.example",
  };

  it("includes order code, magic link CTA, and escapes HTML in code", () => {
    const html = buildEmailHtml("order_created", {
      ...base,
      code: "ACT-<x>",
    });
    expect(html).toContain("ACT-&lt;x&gt;");
    expect(html).toContain("https://shop.example/pedido?token=tok-secret");
    expect(html).toContain("Ver pedido");
    expect(html).toContain("Activate");
    expect(html).toContain("activate.moda.mp");
    expect(html).toContain('href="https://shop.example/pedido?token=tok-secret"');
  });

  it("shows cash copy when payment is cash", () => {
    const html = buildEmailHtml("order_created", {
      ...base,
      paymentMethod: "cash",
    });
    expect(html.toLowerCase()).toContain("efectivo");
  });

  it("renders status-specific body for shipped and cancelled", () => {
    expect(buildEmailHtml("shipped", base)).toMatch(/despachado|enviado/i);
    expect(buildEmailHtml("cancelled", { ...base, reason: "admin" })).toContain("admin");
  });

  it("falls back without magic link when appUrl missing", () => {
    const html = buildEmailHtml("payment_confirmed", {
      code: "ACT-1",
      accessToken: "t",
      appUrl: "",
    });
    expect(html).toContain("ACT-1");
    expect(html).not.toContain("/pedido?token=");
  });

  it("admin proof notice links to order detail and names customer", () => {
    const html = buildEmailHtml("payment_proof_received", {
      code: "ACT-28491",
      orderId: "ord-uuid-1",
      customerName: "María Pérez",
      totalCents: 12_500_00,
      appUrl: "https://shop.example",
    });
    expect(html).toContain("ACT-28491");
    expect(html).toContain("María Pérez");
    expect(html).toContain("https://shop.example/admin/pedidos/ord-uuid-1");
    expect(html).toContain("Ver en admin");
    expect(html).not.toContain("/pedido?token=");
  });

  it("uses compact on-light logo on an explicit light header cell", () => {
    const html = buildEmailHtml("order_created", base);
    expect(html).toContain("https://shop.example/brand/logo-on-light-160.png");
    expect(html).not.toContain("/brand/logo.png\"");
    expect(html).not.toContain("/brand/logo-on-light.png\"");
    // Header <td> specifically — not body/card BG alone
    expect(html).toContain(
      'td style="background:#ffffff;padding:16px 24px;text-align:center;border-bottom:1px solid #E5DFD6"',
    );
    expect(html).toContain('width="80"');
    expect(html).toContain('height="80"');
  });

  it("falls back to dark text wordmark when appUrl missing", () => {
    const html = buildEmailHtml("order_created", {
      code: "ACT-1",
      appUrl: "",
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("ACTIVATE");
    expect(html).toContain("color:#1A1816");
  });
});
