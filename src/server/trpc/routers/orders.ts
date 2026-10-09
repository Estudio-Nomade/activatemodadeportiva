import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { selectOrderByCodeOrToken } from "@/server/domain/orders/order-select";
import {
  assertProofStoragePath,
  toPublicOrderByCode,
} from "@/server/domain/orders/public-order";
import { createTRPCRouter, publicProcedure, rethrowDomain } from "../init";

async function findOrderByCodeOrToken(
  db: ServiceClient,
  input: { code?: string; token?: string },
) {
  if (!input.code && !input.token) {
    throw new DomainError("VALIDATION_ERROR", "code or token is required");
  }

  const { data, error } = await selectOrderByCodeOrToken(db, input, "public");
  if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  if (!data) throw new DomainError("ORDER_NOT_FOUND", "Order not found");
  return data;
}

export const ordersRouter = createTRPCRouter({
  getByCode: publicProcedure
    .input(z.object({ code: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        const order = await findOrderByCodeOrToken(ctx.db, { code: input.code });
        return toPublicOrderByCode(order as Record<string, unknown>);
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

  createProofUploadUrl: publicProcedure
    .input(
      z.object({
        code: z.string().min(1).optional(),
        token: z.string().min(1).optional(),
        fileName: z.string().min(1).max(120),
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

        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const path = `payment-proofs/${order.id}/${Date.now()}-${safeName}`;
        const signed = await ctx.storage.createSignedUploadUrl({
          bucket: "payment-proofs",
          path,
        });
        return {
          bucket: "payment-proofs",
          path: signed.path || path,
          signedUrl: signed.signedUrl,
          token: signed.token,
          orderId: order.id,
        };
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

        try {
          assertProofStoragePath(String(order.id), input.storagePath);
        } catch {
          throw new DomainError(
            "VALIDATION_ERROR",
            "storagePath must be under payment-proofs/{orderId}/",
          );
        }

        const { data, error } = await ctx.db
          .from("payment_proofs")
          .insert({
            order_id: String(order.id),
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
