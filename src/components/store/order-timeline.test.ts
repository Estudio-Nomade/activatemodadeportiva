import { describe, expect, it } from "vitest";
import { buildOrderTimelineSteps } from "./order-timeline";

describe("buildOrderTimelineSteps", () => {
  it("marks pendiente_pago as first current step", () => {
    const steps = buildOrderTimelineSteps("pendiente_pago", "andreani");
    expect(steps.map((s) => s.state)).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(steps[0]?.label).toBe("Pedido recibido");
  });

  it("uses listo_retiro label for pickup fulfillment", () => {
    const steps = buildOrderTimelineSteps("listo_retiro", "pickup");
    expect(steps[3]?.label).toBe("Listo para retiro");
    expect(steps[3]?.state).toBe("current");
    expect(steps.slice(0, 3).every((s) => s.state === "done")).toBe(true);
  });

  it("uses enviado label for andreani fulfillment", () => {
    const steps = buildOrderTimelineSteps("enviado", "andreani");
    expect(steps[3]?.label).toBe("Enviado");
    expect(steps[3]?.state).toBe("current");
  });

  it("uses enviado label for andreani_sucursal fulfillment", () => {
    const steps = buildOrderTimelineSteps("enviado", "andreani_sucursal");
    expect(steps[3]?.label).toBe("Enviado");
    expect(steps[3]?.state).toBe("current");
  });

  it("marks all done when entregado", () => {
    const steps = buildOrderTimelineSteps("entregado", "pickup");
    expect(steps.every((s) => s.state === "done" || s.state === "current")).toBe(true);
    expect(steps[4]?.state).toBe("current");
  });

  it("returns empty for cancelado", () => {
    expect(buildOrderTimelineSteps("cancelado", "pickup")).toEqual([]);
  });
});
