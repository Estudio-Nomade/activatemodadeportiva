import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "./status";
import { DomainError } from "../errors";

describe("assertTransition", () => {
  it("allows happy path transitions", () => {
    expect(() => assertTransition("pendiente_pago", "pago_confirmado")).not.toThrow();
    expect(() => assertTransition("pago_confirmado", "preparando")).not.toThrow();
    expect(() =>
      assertTransition("preparando", "listo_retiro", { shippingMethod: "pickup" }),
    ).not.toThrow();
    expect(() =>
      assertTransition("preparando", "enviado", { shippingMethod: "andreani" }),
    ).not.toThrow();
    expect(() => assertTransition("listo_retiro", "entregado")).not.toThrow();
    expect(() => assertTransition("enviado", "entregado")).not.toThrow();
  });

  it("allows cancel from intermediate statuses", () => {
    expect(() => assertTransition("pendiente_pago", "cancelado")).not.toThrow();
    expect(() => assertTransition("pago_confirmado", "cancelado")).not.toThrow();
    expect(() => assertTransition("preparando", "cancelado")).not.toThrow();
    expect(() => assertTransition("listo_retiro", "cancelado")).not.toThrow();
    expect(() => assertTransition("enviado", "cancelado")).not.toThrow();
  });

  it("forbids cancel from entregado", () => {
    expect(() => assertTransition("entregado", "cancelado")).toThrow(DomainError);
  });

  it("forbids any transition from cancelado", () => {
    expect(() => assertTransition("cancelado", "pago_confirmado")).toThrow(DomainError);
  });

  it("listo_retiro requires pickup", () => {
    expect(() =>
      assertTransition("preparando", "listo_retiro", { shippingMethod: "andreani" }),
    ).toThrow(DomainError);
    expect(() => assertTransition("preparando", "listo_retiro")).toThrow(DomainError);
  });

  it("enviado requires andreani", () => {
    expect(() =>
      assertTransition("preparando", "enviado", { shippingMethod: "pickup" }),
    ).toThrow(DomainError);
    expect(() => assertTransition("preparando", "enviado")).toThrow(DomainError);
  });

  it("rejects invalid transitions", () => {
    expect(() => assertTransition("pendiente_pago", "entregado")).toThrow(DomainError);
    expect(() => assertTransition("pago_confirmado", "enviado")).toThrow(DomainError);
    expect(() => assertTransition("pago_confirmado", "entregado")).toThrow(DomainError);
  });
});

describe("canTransition", () => {
  it("mirrors assertTransition without throwing", () => {
    expect(canTransition("pago_confirmado", "preparando")).toBe(true);
    expect(canTransition("pago_confirmado", "entregado")).toBe(false);
    expect(canTransition("preparando", "listo_retiro", { shippingMethod: "pickup" })).toBe(
      true,
    );
    expect(canTransition("preparando", "enviado", { shippingMethod: "pickup" })).toBe(false);
  });
});
