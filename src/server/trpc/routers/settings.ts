import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../init";

export const settingsRouter = createTRPCRouter({
  getPublic: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("store_settings")
      .select(
        "season_label, whatsapp_url_or_phone, whatsapp_prefill_message, instagram_url, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents, contact_email, contact_address",
      )
      .eq("id", 1)
      .single();

    if (error || !data) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message ?? "Store settings not found",
      });
    }

    return {
      season_label: data.season_label,
      whatsapp: data.whatsapp_url_or_phone,
      whatsapp_message: data.whatsapp_prefill_message ?? "",
      instagram: data.instagram_url,
      transfer_cbu_alias_text: data.transfer_cbu_alias_text,
      payment_discount_bps: data.payment_discount_bps,
      andreani_fee_cents: data.andreani_fee_cents,
      free_shipping_threshold_cents: data.free_shipping_threshold_cents,
      contact_email: data.contact_email,
      contact_address: data.contact_address,
    };
  }),
});
