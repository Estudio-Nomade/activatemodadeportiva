import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  cancelOrder,
  confirmPayment,
  markDelivered,
  markReadyForPickup,
  markShipped,
  startPreparing,
} from "@/server/domain/orders/transitions";
import { adminProcedure, createTRPCRouter, rethrowDomain } from "../../init";

export const adminOrdersRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "pendiente_pago",
              "pago_confirmado",
              "preparando",
              "listo_retiro",
              "enviado",
              "entregado",
              "cancelado",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      let q = ctx.db
        .from("orders")
        .select(
          "id, code, status, customer_name, phone, email, shipping_method, payment_method, total_cents, created_at, updated_at, reservation_expires_at",
        )
        .order("created_at", { ascending: false });

      if (input?.status) q = q.eq("status", input.status);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("orders")
        .select(
          `
          id, code, access_token, status, customer_name, phone, email,
          shipping_method, payment_method, subtotal_cents, discount_cents,
          shipping_cents, total_cents, shipping_address, reservation_expires_at,
          cancel_reason, created_at, updated_at, cancelled_at,
          order_items(id, product_name, color, size, unit_price_cents, qty, variant_id),
          payment_proofs(id, storage_path, uploaded_at),
          stock_reservations(id, variant_id, qty, status, expires_at)
        `,
        )
        .eq("id", input.id)
        .maybeSingle();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      return data;
    }),

  confirmPayment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await confirmPayment(input.id, { db: ctx.db, email: ctx.email });
        return { ok: true as const };
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  startPreparing: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await startPreparing(input.id, { db: ctx.db, email: ctx.email });
        return { ok: true as const };
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  markReadyForPickup: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await markReadyForPickup(input.id, { db: ctx.db, email: ctx.email });
        return { ok: true as const };
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  markShipped: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await markShipped(input.id, { db: ctx.db, email: ctx.email });
        return { ok: true as const };
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  markDelivered: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await markDelivered(input.id, { db: ctx.db, email: ctx.email });
        return { ok: true as const };
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  cancel: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await cancelOrder(input.id, "admin", { db: ctx.db, email: ctx.email });
        return { ok: true as const };
      } catch (e) {
        rethrowDomain(e);
      }
    }),
});
