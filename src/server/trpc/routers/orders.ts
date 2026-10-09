import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { selectOrderByCodeOrToken } from "@/server/domain/orders/order-select";
import {
  assertProofStoragePath,
  toPublicOrderByCode,
} from "@/server/domain/orders/public-order";
import type { EmailPort } from "@/server/email/port";
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

/** Best-effort ops mail when a buyer uploads a transfer proof. */
async function notifyAdminPaymentProof(
  db: ServiceClient,
  email: EmailPort,
  order: {
    id: string;
    code: string;
    customer_name: string;
    total_cents: number;
  },
) {
  const { data: settings } = await db
    .from("store_settings")
    .select("contact_email")
    .eq("id", 1)
    .maybeSingle();
  const to = String(settings?.contact_email ?? "").trim();
  if (!to || !to.includes("@")) return;

  await email.send({
    template: "payment_proof_received",
    to,
    data: {
      orderId: order.id,
      code: order.code,
      customerName: order.customer_name,
      totalCents: order.total_cents,
    },
  });
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

        try {
          await notifyAdminPaymentProof(ctx.db, ctx.email, {
            id: String(order.id),
            code: String(order.code),
            customer_name: String(order.customer_name ?? ""),
            total_cents: Number(order.total_cents ?? 0),
          });
        } catch {
          // best-effort; proof row already saved
        }

        return data;
      } catch (e) {
        rethrowDomain(e);
      }
    }),
});
