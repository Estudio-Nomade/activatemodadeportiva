import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../../init";

export const adminPushRouter = createTRPCRouter({
  getVapidPublicKey: adminProcedure.query(() => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "VAPID_PUBLIC_KEY not configured",
      });
    }
    return { publicKey };
  }),

  status: adminProcedure
    .input(z.object({ endpoint: z.string().min(1).optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!input?.endpoint) return { enabledOnDevice: false };
      const { data } = await ctx.db
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", input.endpoint)
        .eq("admin_user_id", ctx.adminUserId!)
        .maybeSingle();
      return { enabledOnDevice: !!data };
    }),

  subscribe: adminProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
        userAgent: z.string().max(512).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      const { error } = await ctx.db.from("push_subscriptions").upsert(
        {
          admin_user_id: ctx.adminUserId!,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent ?? null,
          updated_at: now,
        },
        { onConflict: "endpoint" },
      );
      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return { ok: true as const };
    }),

  unsubscribe: adminProcedure
    .input(z.object({ endpoint: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", input.endpoint)
        .eq("admin_user_id", ctx.adminUserId!);
      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return { ok: true as const };
    }),
});
