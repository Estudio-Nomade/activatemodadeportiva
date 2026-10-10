import { describe, expect, it } from "vitest";
import { assertAdminDeepLink } from "./admin-url";

describe("assertAdminDeepLink", () => {
  it("allows order and catalog paths", () => {
    expect(assertAdminDeepLink("/admin/pedidos/abc")).toBe("/admin/pedidos/abc");
    expect(assertAdminDeepLink("/admin/catalogo/abc")).toBe("/admin/catalogo/abc");
  });

  it("rejects open redirects and non-admin paths", () => {
    expect(() => assertAdminDeepLink("https://evil.com")).toThrow();
    expect(() => assertAdminDeepLink("//evil.com")).toThrow();
    expect(() => assertAdminDeepLink("/productos")).toThrow();
    expect(() => assertAdminDeepLink("/admin/../api/secret")).toThrow();
    expect(() => assertAdminDeepLink("/administrator")).toThrow();
  });
});
