import { describe, expect, it } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns fallback for empty", () => {
    expect(errorMessage(null)).toBe("Algo salió mal");
    expect(errorMessage(undefined, "x")).toBe("x");
  });

  it("passes through plain messages", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
  });

  it("formats Zod issue JSON arrays from tRPC input validation", () => {
    const zodJson = JSON.stringify([
      {
        origin: "string",
        code: "too_small",
        minimum: 1,
        inclusive: true,
        path: ["code"],
        message: "Too small: expected string to have >=1 characters",
      },
    ]);
    expect(errorMessage({ message: zodJson })).toBe(
      "code: Too small: expected string to have >=1 characters",
    );
  });
});
