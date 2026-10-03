import { describe, expect, it } from "vitest";
import { canRemoveVariant } from "./variant-ops";

describe("canRemoveVariant", () => {
  it("allows remove when no reservations and no order lines", () => {
    expect(canRemoveVariant({ reservationCount: 0, orderItemCount: 0 })).toEqual({
      ok: true,
    });
  });

  it("blocks when reservations exist", () => {
    expect(canRemoveVariant({ reservationCount: 1, orderItemCount: 0 })).toEqual({
      ok: false,
      reason: "HAS_RESERVATIONS",
    });
  });

  it("blocks when order items reference the variant", () => {
    expect(canRemoveVariant({ reservationCount: 0, orderItemCount: 2 })).toEqual({
      ok: false,
      reason: "HAS_ORDER_ITEMS",
    });
  });
});
