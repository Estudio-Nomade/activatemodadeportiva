import { describe, expect, it } from "vitest";
import { normalizeWhatsappStored, whatsappDigits, whatsappHref } from "./whatsapp";

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

  it("builds wa.me from phone digits with + and spaces", () => {
    expect(whatsappHref("+54 9 11 1234-5678")).toBe("https://wa.me/5491112345678");
    expect(whatsappHref("+5491112345678")).toBe("https://wa.me/5491112345678");
    expect(whatsappHref("+54-9-11-1234-5678")).toBe("https://wa.me/5491112345678");
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
    expect(whatsappHref("+5491112345678", "Hola")).toBe(
      "https://wa.me/5491112345678?text=Hola",
    );
  });

  it("does not override existing text query on URL", () => {
    expect(whatsappHref("https://wa.me/54911?text=Ya", "Otro")).toBe(
      "https://wa.me/54911?text=Ya",
    );
  });
});

describe("normalizeWhatsappStored", () => {
  it("keeps empty", () => {
    expect(normalizeWhatsappStored("")).toBe("");
    expect(normalizeWhatsappStored("  ")).toBe("");
  });

  it("strips + and punctuation to digits", () => {
    expect(normalizeWhatsappStored("+5491112345678")).toBe("5491112345678");
    expect(normalizeWhatsappStored("+54 9 11 1234-5678")).toBe("5491112345678");
  });

  it("keeps absolute URLs", () => {
    expect(normalizeWhatsappStored(" https://wa.me/54911 ")).toBe("https://wa.me/54911");
  });
});

describe("whatsappDigits", () => {
  it("accepts leading +549", () => {
    expect(whatsappDigits("+5491112345678")).toBe("5491112345678");
  });
});
