import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../init";

export const settingsRouter = createTRPCRouter({
  getPublic: publicProcedure.query(async ({ ctx }) => {
    const full =
      "season_label, whatsapp_url_or_phone, whatsapp_prefill_message, instagram_url, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents, contact_email, contact_address, payway_installments";

    const { data, error } = await ctx.db
      .from("store_settings")
      .select(full)
      .eq("id", 1)
      .single();

    if (error || !data) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message ?? "Store settings not found",
      });
    }

    const row = data as {
      season_label: string;
      whatsapp_url_or_phone: string;
      whatsapp_prefill_message?: string | null;
      instagram_url: string;
      transfer_cbu_alias_text: string;
      payment_discount_bps: number;
      andreani_fee_cents: number;
      free_shipping_threshold_cents: number;
      contact_email: string;
      contact_address: string;
      payway_installments?: number[] | null;
    };

    const installments =
      Array.isArray(row.payway_installments) && row.payway_installments.length > 0
        ? row.payway_installments
        : [1];

    return {
      season_label: row.season_label,
      whatsapp: row.whatsapp_url_or_phone,
      whatsapp_message: row.whatsapp_prefill_message ?? "",
      instagram: row.instagram_url,
      transfer_cbu_alias_text: row.transfer_cbu_alias_text,
      payment_discount_bps: row.payment_discount_bps,
      andreani_fee_cents: row.andreani_fee_cents,
      free_shipping_threshold_cents: row.free_shipping_threshold_cents,
      contact_email: row.contact_email,
      contact_address: row.contact_address,
      payway_installments: installments,
    };
  }),
});
