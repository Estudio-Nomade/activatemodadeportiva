import { describe, expect, it } from "vitest";
import { whatsappHref } from "./whatsapp";

describe("whatsappHref", () => {
  it("returns null for empty", () => {
    expect(whatsappHref(null)).toBeNull();
    expect(whatsappHref(undefined)).toBeNull();
    expect(whatsappHref("")).toBeNull();
    expect(whatsappHref("   ")).toBeNull();
  });

  it("keeps http(s) URLs as-is after trim", () => {
    expect(whatsappHref(" https://wa.me/54911 ")).toBe("https://wa.me/54911");
    expect(whatsappHref("http://wa.me/1")).toBe("http://wa.me/1");
  });

  it("builds wa.me from phone digits", () => {
    expect(whatsappHref("+54 9 11 1234-5678")).toBe("https://wa.me/5491112345678");
  });

  it("returns null when phone has no digits", () => {
    expect(whatsappHref("abc")).toBeNull();
  });
});
