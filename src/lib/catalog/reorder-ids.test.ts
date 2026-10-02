import { describe, expect, it } from "vitest";
import { moveIdInOrder } from "./reorder-ids";

describe("moveIdInOrder", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves item up", () => {
    expect(moveIdInOrder(ids, "c", "up")).toEqual(["a", "c", "b", "d"]);
  });

  it("moves item down", () => {
    expect(moveIdInOrder(ids, "a", "down")).toEqual(["b", "a", "c", "d"]);
  });

  it("no-ops at edges", () => {
    expect(moveIdInOrder(ids, "a", "up")).toEqual(ids);
    expect(moveIdInOrder(ids, "d", "down")).toEqual(ids);
  });

  it("no-ops for unknown id", () => {
    expect(moveIdInOrder(ids, "z", "up")).toEqual(ids);
  });
});
