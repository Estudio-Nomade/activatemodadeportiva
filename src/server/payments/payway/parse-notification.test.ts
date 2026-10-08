import { describe, expect, it } from "vitest";
import { parsePaywayNotification } from "./parse-notification";

describe("parsePaywayNotification", () => {
  it("parses flat payload", () => {
    expect(
      parsePaywayNotification({
        id: "pw-1",
        site_transaction_id: "order-uuid",
        status: "approved",
        amount: 1000,
      }),
    ).toEqual({
      siteTransactionId: "order-uuid",
      paywayPaymentId: "pw-1",
      status: "approved",
      amountRaw: 1000,
    });
  });

  it("parses nested data", () => {
    expect(
      parsePaywayNotification({
        data: {
          paymentId: "x",
          siteTransactionId: "y",
          status: "accredited",
          amount: 50,
        },
      }),
    ).toEqual({
      siteTransactionId: "y",
      paywayPaymentId: "x",
      status: "accredited",
      amountRaw: 50,
    });
  });

  it("returns nulls for empty body", () => {
    expect(parsePaywayNotification(null)).toEqual({
      siteTransactionId: null,
      paywayPaymentId: null,
      status: null,
      amountRaw: null,
    });
  });
});
