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

  it("accepts bare wa.me paths", () => {
    expect(whatsappHref("wa.me/5491112345678")).toBe("https://wa.me/5491112345678");
  });

  it("builds wa.me from phone digits", () => {
    expect(whatsappHref("+54 9 11 1234-5678")).toBe("https://wa.me/5491112345678");
  });

  it("prefixes 54 for bare 10-digit AR numbers", () => {
    expect(whatsappHref("2494 12-3456")).toBe("https://wa.me/542494123456");
  });

  it("returns null when phone has no digits", () => {
    expect(whatsappHref("abc")).toBeNull();
  });

  it("appends prefill text when provided", () => {
    expect(whatsappHref("5491112345678", "Hola! quiero consultar")).toBe(
      "https://wa.me/5491112345678?text=Hola%21+quiero+consultar",
    );
  });

  it("does not override existing text query on URL", () => {
    expect(whatsappHref("https://wa.me/54911?text=Ya", "Otro")).toBe(
      "https://wa.me/54911?text=Ya",
    );
  });
});
