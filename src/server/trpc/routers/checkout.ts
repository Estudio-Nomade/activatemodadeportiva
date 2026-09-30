import { z } from "zod";
import { placeOrder } from "@/server/domain/checkout/place-order";
import { quote } from "@/server/domain/checkout/quote";
import { createTRPCRouter, publicProcedure, rethrowDomain } from "../init";

const lineSchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().positive(),
});

const shippingMethodSchema = z.enum(["pickup", "andreani"]);
const paymentMethodSchema = z.enum(["transfer", "cash"]);

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

export const checkoutRouter = createTRPCRouter({
  quote: publicProcedure
    .input(
      z
        .object({
          lines: z.array(lineSchema).min(1),
          shippingMethod: shippingMethodSchema,
          paymentMethod: paymentMethodSchema,
          shippingAddress: shippingAddressSchema.nullable().optional(),
        })
        .superRefine((val, ctx) => {
          if (val.shippingMethod === "andreani" && !val.shippingAddress) {
            ctx.addIssue({
              code: "custom",
              message: "shippingAddress is required for andreani",
              path: ["shippingAddress"],
            });
          }
        }),
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
          customerName: z.string().min(1),
          phone: z.string().min(1),
          email: z.string().email(),
          shippingAddress: shippingAddressSchema.nullable().optional(),
        })
        .superRefine((val, ctx) => {
          if (val.shippingMethod === "andreani" && !val.shippingAddress) {
            ctx.addIssue({
              code: "custom",
              message: "shippingAddress is required for andreani",
              path: ["shippingAddress"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await placeOrder(
          {
            lines: input.lines,
            shippingMethod: input.shippingMethod,
            paymentMethod: input.paymentMethod,
            customerName: input.customerName,
            phone: input.phone,
            email: input.email,
            shippingAddress: input.shippingAddress ?? null,
          },
          { db: ctx.db, email: ctx.email },
        );
      } catch (e) {
        rethrowDomain(e);
      }
    }),
});
