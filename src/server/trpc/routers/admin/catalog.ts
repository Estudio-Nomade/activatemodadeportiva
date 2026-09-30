import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TablesUpdate } from "@/server/db/types";
import { adminProcedure, createTRPCRouter } from "../../init";

export const adminCatalogRouter = createTRPCRouter({
  createProduct: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().default(""),
        categoryId: z.string().uuid(),
        listPriceCents: z.number().int().nonnegative(),
        promoPriceCents: z.number().int().nonnegative().nullable().optional(),
        isPublished: z.boolean().optional(),
        sizeGuideId: z.string().uuid().nullable().optional(),
        variants: z
          .array(
            z.object({
              color: z.string().min(1),
              size: z.string().min(1),
              stockOnHand: z.number().int().nonnegative().default(0),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: product, error } = await ctx.db
        .from("products")
        .insert({
          name: input.name,
          slug: input.slug,
          description: input.description,
          category_id: input.categoryId,
          list_price_cents: input.listPriceCents,
          promo_price_cents: input.promoPriceCents ?? null,
          is_published: input.isPublished ?? false,
          size_guide_id: input.sizeGuideId ?? null,
        })
        .select("*")
        .single();

      if (error || !product) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create product",
        });
      }

      if (input.variants?.length) {
        const { error: vError } = await ctx.db.from("product_variants").insert(
          input.variants.map((v) => ({
            product_id: product.id,
            color: v.color,
            size: v.size,
            stock_on_hand: v.stockOnHand,
          })),
        );
        if (vError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: vError.message });
        }
      }

      return product;
    }),

  updateProduct: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        listPriceCents: z.number().int().nonnegative().optional(),
        promoPriceCents: z.number().int().nonnegative().nullable().optional(),
        isPublished: z.boolean().optional(),
        sizeGuideId: z.string().uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: TablesUpdate<"products"> = {
        updated_at: new Date().toISOString(),
      };
      if (input.name !== undefined) patch.name = input.name;
      if (input.slug !== undefined) patch.slug = input.slug;
      if (input.description !== undefined) patch.description = input.description;
      if (input.categoryId !== undefined) patch.category_id = input.categoryId;
      if (input.listPriceCents !== undefined) patch.list_price_cents = input.listPriceCents;
      if (input.promoPriceCents !== undefined) patch.promo_price_cents = input.promoPriceCents;
      if (input.isPublished !== undefined) patch.is_published = input.isPublished;
      if (input.sizeGuideId !== undefined) patch.size_guide_id = input.sizeGuideId;

      const { data, error } = await ctx.db
        .from("products")
        .update(patch)
        .eq("id", input.id)
        .select("*")
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Product not found",
        });
      }
      return data;
    }),

  setVariantStock: adminProcedure
    .input(
      z.object({
        variantId: z.string().uuid(),
        stockOnHand: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("product_variants")
        .update({ stock_on_hand: input.stockOnHand })
        .eq("id", input.variantId)
        .select("*")
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Variant not found",
        });
      }
      return data;
    }),

  setPublished: adminProcedure
    .input(z.object({ id: z.string().uuid(), isPublished: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("products")
        .update({
          is_published: input.isPublished,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select("*")
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Product not found",
        });
      }
      return data;
    }),

  listProducts: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("products")
      .select(
        `
        id, name, slug, description, list_price_cents, promo_price_cents,
        category_id, is_published, created_at, updated_at,
        product_variants(id, color, size, stock_on_hand)
      `,
      )
      .order("updated_at", { ascending: false });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),
});
