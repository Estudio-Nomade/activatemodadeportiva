import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { DomainError } from "@/server/domain/errors";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    if (cause instanceof DomainError) {
      return { ...shape, data: { ...shape.data, domainCode: cause.code } };
    }
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.adminUserId) throw new TRPCError({ code: "UNAUTHORIZED" });
  const { data } = await ctx.db
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", ctx.adminUserId)
    .maybeSingle();
  if (!data) throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export function rethrowDomain(e: unknown): never {
  if (e instanceof DomainError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: e.message, cause: e });
  }
  throw e;
}
