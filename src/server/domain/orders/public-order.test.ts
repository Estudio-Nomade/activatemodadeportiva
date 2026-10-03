import { describe, expect, it } from "vitest";
import { assertProofStoragePath, toPublicOrderByCode } from "./public-order";

describe("toPublicOrderByCode", () => {
  it("strips access_token", () => {
    const out = toPublicOrderByCode({
      id: "1",
      code: "ACT-1",
      access_token: "secret",
    });
    expect(out).toEqual({ id: "1", code: "ACT-1" });
    expect("access_token" in out).toBe(false);
  });
});

describe("assertProofStoragePath", () => {
  const orderId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("accepts path under payment-proofs/{orderId}/", () => {
    expect(() =>
      assertProofStoragePath(orderId, `payment-proofs/${orderId}/123-file.jpg`),
    ).not.toThrow();
  });

  it("rejects wrong order id or traversal", () => {
    expect(() =>
      assertProofStoragePath(orderId, "payment-proofs/other/file.jpg"),
    ).toThrow("INVALID_PROOF_PATH");
    expect(() =>
      assertProofStoragePath(orderId, `payment-proofs/${orderId}/../x.jpg`),
    ).toThrow("INVALID_PROOF_PATH");
  });
});
