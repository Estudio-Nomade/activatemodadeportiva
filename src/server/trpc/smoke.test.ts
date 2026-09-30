import { describe, expect, it } from "vitest";
import { createTRPCContext } from "./context";
import { createCallerFactory } from "./init";
import { appRouter } from "./routers/app";

describe("trpc smoke", () => {
  it("health returns ok", async () => {
    const createCaller = createCallerFactory(appRouter);
    const caller = createCaller(await createTRPCContext({ headers: new Headers() }));
    await expect(caller.health()).resolves.toEqual({ ok: true });
  });

  it("catalog.listCategories returns an array", async () => {
    const createCaller = createCallerFactory(appRouter);
    const caller = createCaller(await createTRPCContext({ headers: new Headers() }));
    const categories = await caller.catalog.listCategories();
    expect(Array.isArray(categories)).toBe(true);
  });
});
