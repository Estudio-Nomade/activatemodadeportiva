import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../../init";

export const adminSettingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message ?? "Store settings not found",
      });
    }
    return data;
  }),

  update: adminProcedure
    .input(
      z.object({
        season_label: z.string().optional(),
        whatsapp_url_or_phone: z.string().optional(),
        instagram_url: z.string().optional(),
        transfer_cbu_alias_text: z.string().optional(),
        payment_discount_bps: z.number().int().nonnegative().optional(),
        andreani_fee_cents: z.number().int().nonnegative().optional(),
        free_shipping_threshold_cents: z.number().int().nonnegative().optional(),
        contact_email: z.string().optional(),
        contact_address: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("store_settings")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1)
        .select("*")
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to update settings",
        });
      }
      return data;
    }),
});
