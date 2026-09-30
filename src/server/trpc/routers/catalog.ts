import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

export const catalogRouter = createTRPCRouter({
  listCategories: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("categories")
      .select("id, name, slug, parent_id, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  listProducts: publicProcedure
    .input(z.object({ categorySlug: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let categoryId: string | undefined;
      if (input.categorySlug) {
        const { data: cat, error: catError } = await ctx.db
          .from("categories")
          .select("id")
          .eq("slug", input.categorySlug)
          .maybeSingle();
        if (catError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: catError.message });
        }
        if (!cat) return [];
        categoryId = cat.id;
      }

      let q = ctx.db
        .from("products")
        .select(
          "id, name, slug, description, list_price_cents, promo_price_cents, category_id, is_published",
        )
        .eq("is_published", true)
        .order("name", { ascending: true });

      if (categoryId) q = q.eq("category_id", categoryId);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  getProduct: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("products")
        .select(
          `
          id, name, slug, description, list_price_cents, promo_price_cents,
          category_id, is_published, size_guide_id,
          product_variants(id, color, size, stock_on_hand),
          product_images(id, storage_path, alt, sort_order)
        `,
        )
        .eq("slug", input.slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      return data;
    }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const term = `%${input.q}%`;

      const { data: byName, error: nameError } = await ctx.db
        .from("products")
        .select(
          "id, name, slug, description, list_price_cents, promo_price_cents, category_id, is_published",
        )
        .eq("is_published", true)
        .ilike("name", term);

      if (nameError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: nameError.message });
      }

      const { data: categories, error: catError } = await ctx.db
        .from("categories")
        .select("id")
        .ilike("name", term);

      if (catError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: catError.message });
      }

      let byCategory: typeof byName = [];
      const catIds = (categories ?? []).map((c) => c.id);
      if (catIds.length) {
        const { data, error } = await ctx.db
          .from("products")
          .select(
            "id, name, slug, description, list_price_cents, promo_price_cents, category_id, is_published",
          )
          .eq("is_published", true)
          .in("category_id", catIds);
        if (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        byCategory = data ?? [];
      }

      const map = new Map<string, (typeof byName)[number]>();
      for (const p of [...(byName ?? []), ...byCategory]) {
        if (p) map.set(p.id, p);
      }
      return Array.from(map.values());
    }),
});
