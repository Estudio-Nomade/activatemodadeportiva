import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../init";

type PublicSettingsRow = {
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

const SELECT_FULL =
  "season_label, whatsapp_url_or_phone, whatsapp_prefill_message, instagram_url, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents, contact_email, contact_address, payway_installments";

/** Legacy cloud DBs may lag migrations (prefill message, payway installments). */
const SELECT_LEGACY =
  "season_label, whatsapp_url_or_phone, instagram_url, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents, contact_email, contact_address";

function isMissingColumnError(message: string | undefined, column: string): boolean {
  const m = (message ?? "").toLowerCase();
  return m.includes(column.toLowerCase()) && (m.includes("does not exist") || m.includes("could not find"));
}

function isMissingOptionalSettingsColumn(message: string | undefined): boolean {
  return (
    isMissingColumnError(message, "payway_installments") ||
    isMissingColumnError(message, "whatsapp_prefill_message")
  );
}

function mapPublicSettings(row: PublicSettingsRow) {
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
}

export const settingsRouter = createTRPCRouter({
  getPublic: publicProcedure.query(async ({ ctx }) => {
    const run = (columns: string) =>
      ctx.db.from("store_settings").select(columns).eq("id", 1).single();

    let { data, error } = await run(SELECT_FULL);

    // Cloud may not have payway_installments / whatsapp_prefill_message yet.
    // Fall back so WA FAB, promo bar, and contact links keep working.
    if (error && isMissingOptionalSettingsColumn(error.message)) {
      const legacy = await run(SELECT_LEGACY);
      data = legacy.data as typeof data;
      error = legacy.error;
    }

    if (error || !data) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message ?? "Store settings not found",
      });
    }

    return mapPublicSettings(data as unknown as PublicSettingsRow);
  }),
});
