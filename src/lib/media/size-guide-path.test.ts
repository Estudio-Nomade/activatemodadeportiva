import { describe, expect, it } from "vitest";
import { isValidSizeGuideStoragePath, normalizeSizeGuideStorageKey } from "./size-guide-path";

describe("normalizeSizeGuideStorageKey", () => {
  it("strips bucket prefix", () => {
    expect(normalizeSizeGuideStorageKey("size-guides/foo.jpg")).toBe("foo.jpg");
    expect(normalizeSizeGuideStorageKey("foo.jpg")).toBe("foo.jpg");
  });

  it("keeps site-relative public paths", () => {
    expect(normalizeSizeGuideStorageKey("/size-guides/magher-mujer.jpg")).toBe(
      "/size-guides/magher-mujer.jpg",
    );
  });
});

describe("isValidSizeGuideStoragePath", () => {
  it("allows site-relative public assets", () => {
    expect(isValidSizeGuideStoragePath("/size-guides/x.jpg")).toBe(true);
  });

  it("allows storage object keys without traversal", () => {
    expect(isValidSizeGuideStoragePath("2026-guide.png")).toBe(true);
    expect(isValidSizeGuideStoragePath("size-guides/nested/a.png")).toBe(true);
  });

  it("rejects empty, traversal, and external schemes as storage keys", () => {
    expect(isValidSizeGuideStoragePath("")).toBe(false);
    expect(isValidSizeGuideStoragePath("../x")).toBe(false);
    expect(isValidSizeGuideStoragePath("http://evil")).toBe(false);
  });
});
