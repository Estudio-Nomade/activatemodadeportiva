import { z } from "zod";
import { createPaymentLink } from "@/server/domain/checkout/create-payment-link";
import { placeOrder } from "@/server/domain/checkout/place-order";
import { quote } from "@/server/domain/checkout/quote";
import { createTRPCRouter, publicProcedure, rethrowDomain } from "../init";

const lineSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().positive(),
});

const shippingMethodSchema = z.enum(["pickup", "andreani"]);
/** payway | transfer | cash. Cash requires pickup (PRD). */
const paymentMethodSchema = z.enum(["payway", "transfer", "cash"]);

const shippingAddressSchema = z
  .object({
    line1: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    line2: z.string().optional(),
    province: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

function refineCheckoutCombo(
  val: {
    shippingMethod: "pickup" | "andreani";
    paymentMethod: "payway" | "transfer" | "cash";
    shippingAddress?: unknown;
  },
  ctx: z.RefinementCtx,
) {
  if (val.shippingMethod === "andreani" && !val.shippingAddress) {
    ctx.addIssue({
      code: "custom",
      message: "shippingAddress is required for andreani",
      path: ["shippingAddress"],
    });
  }
  if (val.paymentMethod === "cash" && val.shippingMethod !== "pickup") {
    ctx.addIssue({
      code: "custom",
      message: "Cash payment requires pickup shipping",
      path: ["paymentMethod"],
    });
  }
}

export const checkoutRouter = createTRPCRouter({
  quote: publicProcedure
    .input(
      z
        .object({
          lines: z.array(lineSchema).min(1),
          shippingMethod: shippingMethodSchema,
          paymentMethod: paymentMethodSchema,
          shippingAddress: shippingAddressSchema.nullable().optional(),
          installments: z.number().int().positive().optional(),
        })
        .superRefine(refineCheckoutCombo),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await quote(
          {
            lines: input.lines,
            shippingMethod: input.shippingMethod,
            paymentMethod: input.paymentMethod,
            shippingAddress: input.shippingAddress ?? null,
          },
          { db: ctx.db },
        );
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  placeOrder: publicProcedure
    .input(
      z
        .object({
          lines: z.array(lineSchema).min(1),
          shippingMethod: shippingMethodSchema,
          paymentMethod: paymentMethodSchema,
          installments: z.number().int().positive().default(1),
          customerName: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email(),
          shippingAddress: shippingAddressSchema.nullable().optional(),
        })
        .superRefine(refineCheckoutCombo),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await placeOrder(
          {
            lines: input.lines,
            shippingMethod: input.shippingMethod,
            paymentMethod: input.paymentMethod,
            installments: input.installments,
            customerName: input.customerName,
            phone: input.phone,
            email: input.email,
            shippingAddress: input.shippingAddress ?? null,
          },
          {
            db: ctx.db,
            email: ctx.email,
            payway: ctx.payway,
            appBaseUrl: ctx.appBaseUrl,
          },
        );
      } catch (e) {
        rethrowDomain(e);
      }
    }),

  createPaymentLink: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPaymentLink(
          { token: input.token },
          {
            db: ctx.db,
            payway: ctx.payway,
            appBaseUrl: ctx.appBaseUrl,
          },
        );
      } catch (e) {
        rethrowDomain(e);
      }
    }),
});
