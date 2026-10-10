import { describe, expect, it } from "vitest";
import {
  assertInstallmentsAllowed,
  normalizeAdminInstallments,
  parseInstallmentsAllowList,
  PAYWAY_INSTALLMENT_OPTIONS,
} from "./installments";
import { DomainError } from "../errors";

describe("installments", () => {
  it("parses csv and array", () => {
    expect(parseInstallmentsAllowList("1,3,6")).toEqual([1, 3, 6]);
    expect(parseInstallmentsAllowList([1, 3])).toEqual([1, 3]);
  });

  it("defaults to [1] when empty", () => {
    expect(parseInstallmentsAllowList(null)).toEqual([1]);
    expect(parseInstallmentsAllowList("")).toEqual([1]);
  });

  it("allows listed installments", () => {
    expect(() => assertInstallmentsAllowed(3, [1, 3, 6])).not.toThrow();
  });

  it("rejects unlisted", () => {
    expect(() => assertInstallmentsAllowed(12, [1, 3, 6])).toThrow(DomainError);
    try {
      assertInstallmentsAllowed(12, [1, 3, 6]);
    } catch (e) {
      expect((e as DomainError).code).toBe("INSTALLMENTS_NOT_ALLOWED");
    }
  });

  it("admin options are 1, 3, 6", () => {
    expect(PAYWAY_INSTALLMENT_OPTIONS).toEqual([1, 3, 6]);
  });

  it("normalizeAdminInstallments keeps fixed set only, sorted unique", () => {
    expect(normalizeAdminInstallments([3, 1, 3, 99, 9, 6])).toEqual([1, 3, 6]);
  });

  it("normalizeAdminInstallments defaults empty to [1]", () => {
    expect(normalizeAdminInstallments([])).toEqual([1]);
    expect(normalizeAdminInstallments([9, 12])).toEqual([1]);
  });
});
