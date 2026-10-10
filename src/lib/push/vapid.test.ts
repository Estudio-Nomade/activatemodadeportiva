import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./vapid";

describe("urlBase64ToUint8Array", () => {
  it("decodes URL-safe base64 without padding", () => {
    // "Hello" in standard base64 is SGVsbG8= → URL-safe without padding: SGVsbG8
    const bytes = urlBase64ToUint8Array("SGVsbG8");
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it("handles - and _ URL-safe alphabet", () => {
    // bytes [0xfb, 0xff] → standard +/8P, URL-safe -_8P
    const bytes = urlBase64ToUint8Array("-_8");
    expect(Array.from(bytes)).toEqual([0xfb, 0xff]);
  });
});
