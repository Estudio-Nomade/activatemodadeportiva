import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TablesUpdate } from "@/server/db/types";
import { normalizeWhatsappStored } from "@/lib/contact/whatsapp";
import { adminProcedure, createTRPCRouter } from "../../init";

function isMissingPrefillColumn(message: string | undefined): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes("whatsapp_prefill_message");
}

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
    return {
      ...data,
      whatsapp_prefill_message:
        "whatsapp_prefill_message" in data
          ? String((data as { whatsapp_prefill_message?: string | null }).whatsapp_prefill_message ?? "")
          : "",
    };
  }),

  update: adminProcedure
    .input(
      z.object({
        season_label: z.string().optional(),
        whatsapp_url_or_phone: z.string().optional(),
        whatsapp_prefill_message: z.string().max(500).optional(),
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
      const patch: TablesUpdate<"store_settings"> = {
        updated_at: new Date().toISOString(),
      };
      if (input.season_label !== undefined) patch.season_label = input.season_label;
      if (input.whatsapp_url_or_phone !== undefined) {
        // +549… / spaces / dashes OK — store digits or URL
        patch.whatsapp_url_or_phone = normalizeWhatsappStored(input.whatsapp_url_or_phone);
      }
      if (input.whatsapp_prefill_message !== undefined) {
        patch.whatsapp_prefill_message = input.whatsapp_prefill_message;
      }
      if (input.instagram_url !== undefined) patch.instagram_url = input.instagram_url;
      if (input.transfer_cbu_alias_text !== undefined) {
        patch.transfer_cbu_alias_text = input.transfer_cbu_alias_text;
      }
      if (input.payment_discount_bps !== undefined) {
        patch.payment_discount_bps = input.payment_discount_bps;
      }
      if (input.andreani_fee_cents !== undefined) patch.andreani_fee_cents = input.andreani_fee_cents;
      if (input.free_shipping_threshold_cents !== undefined) {
        patch.free_shipping_threshold_cents = input.free_shipping_threshold_cents;
      }
      if (input.contact_email !== undefined) patch.contact_email = input.contact_email;
      if (input.contact_address !== undefined) patch.contact_address = input.contact_address;

      const runUpdate = async (body: TablesUpdate<"store_settings">) =>
        ctx.db.from("store_settings").update(body).eq("id", 1).select("*").single();

      let { data, error } = await runUpdate(patch);

      // Cloud may not have migration yet — still save phone/other fields.
      if (error && isMissingPrefillColumn(error.message) && patch.whatsapp_prefill_message !== undefined) {
        const withoutPrefill: TablesUpdate<"store_settings"> = { ...patch };
        delete withoutPrefill.whatsapp_prefill_message;
        ({ data, error } = await runUpdate(withoutPrefill));
        if (!error && data) {
          return {
            ...data,
            whatsapp_prefill_message: "",
            _prefillSkipped:
              "Columna whatsapp_prefill_message ausente en la DB. El número se guardó; aplicá la migration para el mensaje.",
          };
        }
      }

      if (error || !data) {
        const msg = error?.message ?? "Failed to update settings";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: isMissingPrefillColumn(msg)
            ? "Falta la columna de mensaje de WhatsApp en la base. El número con + está bien; corré la migration whatsapp_prefill_message o guardá solo el número tras actualizar la DB."
            : msg,
        });
      }

      return {
        ...data,
        whatsapp_prefill_message:
          "whatsapp_prefill_message" in data
            ? String(
                (data as { whatsapp_prefill_message?: string | null }).whatsapp_prefill_message ?? "",
              )
            : (input.whatsapp_prefill_message ?? ""),
      };
    }),
});
