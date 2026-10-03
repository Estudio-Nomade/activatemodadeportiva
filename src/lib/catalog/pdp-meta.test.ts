import { describe, expect, it } from "vitest";
import { buildPdpMetaChips } from "./pdp-meta";

describe("buildPdpMetaChips", () => {
  it("builds three chips from discount percent", () => {
    expect(buildPdpMetaChips(10)).toEqual([
      "10% off transferencia o efectivo",
      "Envío Andreani o retiro en San Manuel",
      "Cambios por WhatsApp o en el local",
    ]);
  });

  it("uses 0% when discount is zero", () => {
    expect(buildPdpMetaChips(0)[0]).toBe("0% off transferencia o efectivo");
  });
});
