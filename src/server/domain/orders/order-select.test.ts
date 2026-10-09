import { describe, expect, it } from "vitest";
import { isMissingOrdersPaywayColumn } from "./order-select";

describe("isMissingOrdersPaywayColumn", () => {
  it("detects missing installments column", () => {
    expect(
      isMissingOrdersPaywayColumn('column orders.installments does not exist'),
    ).toBe(true);
  });

  it("detects missing payway columns", () => {
    expect(
      isMissingOrdersPaywayColumn(
        "Could not find the 'payway_payment_id' column of 'orders' in the schema cache",
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMissingOrdersPaywayColumn("permission denied")).toBe(false);
    expect(isMissingOrdersPaywayColumn(undefined)).toBe(false);
  });
});
