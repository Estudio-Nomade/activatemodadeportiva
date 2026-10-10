import { describe, expect, it } from "vitest";
import { assertShippingAddress } from "./address";
import { DomainError } from "@/server/domain/errors";

describe("assertShippingAddress", () => {
  it("skips pickup", () => {
    expect(() => assertShippingAddress("pickup", null)).not.toThrow();
  });

  it("requires home fields for andreani", () => {
    expect(() => assertShippingAddress("andreani", null)).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani", { line1: "x", city: "y", postalCode: "" }),
    ).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani", {
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).not.toThrow();
  });

  it("requires branchName + home fields for andreani_sucursal", () => {
    expect(() => assertShippingAddress("andreani_sucursal", null)).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani_sucursal", {
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani_sucursal", {
        branchName: "Andreani Centro",
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).not.toThrow();
  });

  it("does not require branchName for home andreani", () => {
    expect(() =>
      assertShippingAddress("andreani", {
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).not.toThrow();
  });
});
