import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { createTRPCRouter, publicProcedure, rethrowDomain } from "../init";

const orderSelect = `
  id, code, access_token, status, customer_name, phone, email,
  shipping_method, payment_method, subtotal_cents, discount_cents,
  shipping_cents, total_cents, shipping_address, reservation_expires_at,
  cancel_reason, created_at, updated_at, cancelled_at,
  order_items(id, product_name, color, size, unit_price_cents, qty, variant_id),
  payment_proofs(id, storage_path, uploaded_at)
` as const;

async function findOrderByCodeOrToken(
  db: ServiceClient,
  input: { code?: string; token?: string },
) {
  if (!input.code && !input.token) {
    throw new DomainError("VALIDATION_ERROR", "code or token is required");
  }

  let q = db.from("orders").select(orderSelect);

  if (input.code) q = q.eq("code", input.code);
  if (input.token) q = q.eq("access_token", input.token);

  const { data, error } = await q.maybeSingle();
  if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  if (!data) throw new DomainError("ORDER_NOT_FOUND", "Order not found");
  return data;
}

export const ordersRouter = createTRPCRouter({
  getByCode: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await findOrderByCodeOrToken(ctx.db, { code: input.code });
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await findOrderByCodeOrToken(ctx.db, { token: input.token });
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  uploadPaymentProof: publicProcedure
    .input(
      z.object({
        code: z.string().min(1).optional(),
        token: z.string().min(1).optional(),
        storagePath: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const order = await findOrderByCodeOrToken(ctx.db, {
          code: input.code,
          token: input.token,
        });

        if (order.status !== "pendiente_pago") {
          throw new DomainError(
            "ORDER_NOT_PENDING",
            "Payment proof only allowed while pending payment",
          );
        }

        const { data, error } = await ctx.db
          .from("payment_proofs")
          .insert({
            order_id: order.id,
            storage_path: input.storagePath,
          })
          .select("id, order_id, storage_path, uploaded_at")
          .single();

        if (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        return data;
      } catch (e) {
        rethrowDomain(e);
      }
    }),
});
