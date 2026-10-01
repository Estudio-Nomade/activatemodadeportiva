import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { variantsWithAvailability } from "@/server/domain/catalog/availability";
import { categoryIdsInSubtree } from "@/server/domain/catalog/category-tree";
import { isProductSoldOut } from "@/server/domain/catalog/sold-out";
import { withImageUrls } from "@/lib/media/product-image";
import { mapSizeGuide } from "@/lib/media/size-guide";
import { createTRPCRouter, publicProcedure } from "../init";

const PRODUCT_LIST_SELECT =
  "id, name, slug, description, list_price_cents, promo_price_cents, category_id, is_published, product_images(id, storage_path, alt, sort_order), product_variants(id, color, size, stock_on_hand)" as const;

type DbImage = {
  id: string;
  storage_path: string;
  alt: string;
  sort_order: number;
};

function attachImageUrls<T extends { product_images?: DbImage[] | null }>(
  row: T,
): Omit<T, "product_images"> & {
  product_images: Array<DbImage & { url: string }>;
} {
  const product_images = withImageUrls(row.product_images ?? null).map((img) => ({
    id: String(img.id ?? ""),
    storage_path: img.storage_path,
    alt: img.alt ?? "",
    sort_order: img.sort_order ?? 0,
    url: img.url,
  }));
  return { ...row, product_images };
}

export const catalogRouter = createTRPCRouter({
  listCategories: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("categories")
      .select("id, name, slug, parent_id, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return data ?? [];
  }),

  listSizeGuides: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("size_guides")
      .select("id, name, storage_path")
      .order("name", { ascending: true });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []).map(mapSizeGuide);
  }),

  listProducts: publicProcedure
    .input(z.object({ categorySlug: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let categoryIds: string[] | undefined;
      if (input.categorySlug) {
        const { data: allCats, error: catsError } = await ctx.db
          .from("categories")
          .select("id, parent_id, slug");
        if (catsError) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: catsError.message });
        }
        const cat = (allCats ?? []).find((c) => c.slug === input.categorySlug);
        if (!cat) return [];
        categoryIds = categoryIdsInSubtree(allCats ?? [], cat.id);
        if (!categoryIds.length) return [];
      }

      let q = ctx.db
        .from("products")
        .select(PRODUCT_LIST_SELECT)
        .eq("is_published", true)
        .order("name", { ascending: true });

      if (categoryIds) q = q.in("category_id", categoryIds);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const rows = data ?? [];
      const withSoldOut = await Promise.all(
        rows.map(async (row) => {
          const variants = await variantsWithAvailability(
            ctx.db,
            ((row as { product_variants?: { id: string; color: string; size: string; stock_on_hand: number }[] })
              .product_variants ?? []) as {
              id: string;
              color: string;
              size: string;
              stock_on_hand: number;
            }[],
          );
          const { product_variants: _pv, ...rest } = row as typeof row & {
            product_variants?: unknown;
          };
          void _pv;
          return {
            ...attachImageUrls(rest),
            is_sold_out: isProductSoldOut(variants),
          };
        }),
      );
      return withSoldOut;
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
          product_images(id, storage_path, alt, sort_order),
          size_guides(id, name, storage_path)
        `,
        )
        .eq("slug", input.slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

      const variants = await variantsWithAvailability(
        ctx.db,
        (data.product_variants ?? []) as {
          id: string;
          color: string;
          size: string;
          stock_on_hand: number;
        }[],
      );

      const mapped = attachImageUrls(data);
      const guideRaw = (
        data as {
          size_guides?: { id: string; name: string; storage_path: string | null } | null;
        }
      ).size_guides;
      const sizeGuide = guideRaw ? mapSizeGuide(guideRaw) : null;

      return {
        ...mapped,
        product_variants: variants,
        size_guide: sizeGuide,
      };
    }),

  search: publicProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const term = `%${input.q}%`;

      const { data: byName, error: nameError } = await ctx.db
        .from("products")
        .select(PRODUCT_LIST_SELECT)
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

      let byCategory: NonNullable<typeof byName> = [];
      const catIds = (categories ?? []).map((c) => c.id);
      if (catIds.length) {
        const { data, error } = await ctx.db
          .from("products")
          .select(PRODUCT_LIST_SELECT)
          .eq("is_published", true)
          .in("category_id", catIds);
        if (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        byCategory = data ?? [];
      }

      const map = new Map<string, NonNullable<typeof byName>[number]>();
      for (const p of [...(byName ?? []), ...byCategory]) {
        if (p) map.set(p.id, p);
      }
      const rows = Array.from(map.values());
      return Promise.all(
        rows.map(async (row) => {
          const variants = await variantsWithAvailability(
            ctx.db,
            ((row as { product_variants?: { id: string; color: string; size: string; stock_on_hand: number }[] })
              .product_variants ?? []) as {
              id: string;
              color: string;
              size: string;
              stock_on_hand: number;
            }[],
          );
          const { product_variants: _pv, ...rest } = row as typeof row & {
            product_variants?: unknown;
          };
          void _pv;
          return {
            ...attachImageUrls(rest),
            is_sold_out: isProductSoldOut(variants),
          };
        }),
      );
    }),
});
