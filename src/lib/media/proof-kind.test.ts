import { describe, expect, it } from "vitest";
import { proofMediaKind } from "./proof-kind";

describe("proofMediaKind", () => {
  it("detects images", () => {
    expect(proofMediaKind("payment-proofs/x/a.JPG")).toBe("image");
    expect(proofMediaKind("a/b/c.png")).toBe("image");
    expect(proofMediaKind("x.webp")).toBe("image");
  });

  it("detects pdf", () => {
    expect(proofMediaKind("payment-proofs/x/doc.PDF")).toBe("pdf");
  });

  it("returns other for unknown", () => {
    expect(proofMediaKind("file.bin")).toBe("other");
    expect(proofMediaKind("noext")).toBe("other");
  });
});
