import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TablesUpdate } from "@/server/db/types";
import { canRemoveVariant } from "@/server/domain/catalog/variant-ops";
import {
  leafCategoriesForCare,
  normalizeCompositionCareText,
  type CategoryCareRow,
} from "@/lib/catalog/composition-care";
import { withImageUrls } from "@/lib/media/product-image";
import {
  isValidSizeGuideStoragePath,
  normalizeSizeGuideStorageKey,
} from "@/lib/media/size-guide-path";
import { mapSizeGuide } from "@/lib/media/size-guide";
import { PRODUCT_IMAGES_BUCKET, SIZE_GUIDES_BUCKET } from "@/server/storage/port";
import { adminProcedure, createTRPCRouter } from "../../init";

function assertProductImagePath(productId: string, storagePath: string) {
  const prefix = `products/${productId}/`;
  const ok =
    storagePath === prefix.slice(0, -1) ||
    storagePath.startsWith(prefix) ||
    // allow full path with bucket prefix stripped already
    storagePath.startsWith(`${PRODUCT_IMAGES_BUCKET}/${prefix}`);
  if (!ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `storagePath must be under products/{productId}/`,
    });
  }
}

function normalizeStorageKey(storagePath: string): string {
  return storagePath.replace(new RegExp(`^${PRODUCT_IMAGES_BUCKET}/`), "");
}

function mapImages(
  images: { id: string; storage_path: string; alt: string; sort_order: number }[] | null | undefined,
) {
  return withImageUrls(images ?? null).map((img) => ({
    id: String(img.id ?? ""),
    storage_path: img.storage_path,
    alt: img.alt ?? "",
    sort_order: img.sort_order ?? 0,
    url: img.url,
  }));
}

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

  addVariant: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        color: z.string().min(1).max(80),
        size: z.string().min(1).max(40),
        stockOnHand: z.number().int().nonnegative().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: product, error: pErr } = await ctx.db
        .from("products")
        .select("id")
        .eq("id", input.productId)
        .maybeSingle();
      if (pErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: pErr.message });
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

      const color = input.color.trim();
      const size = input.size.trim();
      if (!color || !size) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Color and size are required" });
      }

      const { data, error } = await ctx.db
        .from("product_variants")
        .insert({
          product_id: input.productId,
          color,
          size,
          stock_on_hand: input.stockOnHand,
        })
        .select("id, product_id, color, size, stock_on_hand")
        .single();

      if (error || !data) {
        const dup = error?.code === "23505" || error?.message?.toLowerCase().includes("unique");
        throw new TRPCError({
          code: dup ? "CONFLICT" : "INTERNAL_SERVER_ERROR",
          message: dup
            ? "Ya existe esa combinación color/talle"
            : (error?.message ?? "Failed to add variant"),
        });
      }
      return data;
    }),

  removeVariant: adminProcedure
    .input(z.object({ variantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: variant, error: vErr } = await ctx.db
        .from("product_variants")
        .select("id")
        .eq("id", input.variantId)
        .maybeSingle();
      if (vErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: vErr.message });
      if (!variant) throw new TRPCError({ code: "NOT_FOUND", message: "Variant not found" });

      const { count: resCount, error: rErr } = await ctx.db
        .from("stock_reservations")
        .select("id", { count: "exact", head: true })
        .eq("variant_id", input.variantId);
      if (rErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: rErr.message });

      const { count: itemCount, error: iErr } = await ctx.db
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("variant_id", input.variantId);
      if (iErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: iErr.message });

      const gate = canRemoveVariant({
        reservationCount: resCount ?? 0,
        orderItemCount: itemCount ?? 0,
      });
      if (!gate.ok) {
        const msg =
          gate.reason === "HAS_RESERVATIONS"
            ? "No se puede borrar: hay reservas de stock asociadas"
            : "No se puede borrar: la variante figura en pedidos (poné stock 0 en su lugar)";
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: msg });
      }

      const { error } = await ctx.db.from("product_variants").delete().eq("id", input.variantId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true as const };
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
        category_id, is_published, created_at, updated_at, size_guide_id,
        product_variants(id, color, size, stock_on_hand),
        product_images(id, storage_path, alt, sort_order)
      `,
      )
      .order("updated_at", { ascending: false });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []).map((p) => ({
      ...p,
      product_images: mapImages(p.product_images),
    }));
  }),

  listSizeGuides: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("size_guides")
      .select("id, name, storage_path")
      .order("name", { ascending: true });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []).map(mapSizeGuide);
  }),

  createSizeGuide: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        storagePath: z.string().min(1).max(512).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const name = input.name.trim();
      if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "Name required" });
      let storagePath: string | null = null;
      if (input.storagePath?.trim()) {
        const key = normalizeSizeGuideStorageKey(input.storagePath);
        if (!isValidSizeGuideStoragePath(key)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid storage path" });
        }
        storagePath = key;
      }
      const { data, error } = await ctx.db
        .from("size_guides")
        .insert({ name, storage_path: storagePath })
        .select("id, name, storage_path")
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create size guide",
        });
      }
      return mapSizeGuide(data);
    }),

  updateSizeGuide: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        storagePath: z.string().min(1).max(512).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const patch: { name?: string; storage_path?: string | null } = {};
      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) throw new TRPCError({ code: "BAD_REQUEST", message: "Name required" });
        patch.name = name;
      }
      if (input.storagePath !== undefined) {
        if (input.storagePath === null || input.storagePath.trim() === "") {
          patch.storage_path = null;
        } else {
          const key = normalizeSizeGuideStorageKey(input.storagePath);
          if (!isValidSizeGuideStoragePath(key)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid storage path" });
          }
          patch.storage_path = key;
        }
      }
      if (Object.keys(patch).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing to update" });
      }
      const { data, error } = await ctx.db
        .from("size_guides")
        .update(patch)
        .eq("id", input.id)
        .select("id, name, storage_path")
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Size guide not found",
        });
      }
      return mapSizeGuide(data);
    }),

  createSizeGuideUploadUrl: adminProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(120),
        contentType: z.string().min(1).max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const path = `${Date.now()}-${safeName}`;
      let signed: Awaited<ReturnType<typeof ctx.storage.createSignedUploadUrl>>;
      try {
        signed = await ctx.storage.createSignedUploadUrl({
          bucket: SIZE_GUIDES_BUCKET,
          path,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create signed upload URL";
        const lower = msg.toLowerCase();
        if (lower.includes("bucket") || lower.includes("not found")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Bucket "${SIZE_GUIDES_BUCKET}" missing or inaccessible. Apply migration size_guides_bucket on this Supabase project.`,
          });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
      const key = normalizeSizeGuideStorageKey(signed.path || path);
      return {
        bucket: SIZE_GUIDES_BUCKET,
        path: key,
        signedUrl: signed.signedUrl,
        token: signed.token,
        publicUrl: ctx.storage.getPublicUrl({
          bucket: SIZE_GUIDES_BUCKET,
          path: key,
        }),
      };
    }),

  deleteSizeGuide: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: row, error: findErr } = await ctx.db
        .from("size_guides")
        .select("id, storage_path")
        .eq("id", input.id)
        .maybeSingle();
      if (findErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: findErr.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Size guide not found" });

      const { error } = await ctx.db.from("size_guides").delete().eq("id", input.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const path = row.storage_path?.trim() ?? "";
      if (path && !path.startsWith("/") && !/^https?:\/\//i.test(path)) {
        const key = normalizeSizeGuideStorageKey(path);
        try {
          await ctx.storage.removeObjects?.({
            bucket: SIZE_GUIDES_BUCKET,
            paths: [key],
          });
        } catch {
          /* orphan ok */
        }
      }
      return { ok: true as const };
    }),

  /** Signed upload URL for product gallery image under products/{productId}/… */
  createImageUploadUrl: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        fileName: z.string().min(1).max(120),
        contentType: z.string().min(1).max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: product, error } = await ctx.db
        .from("products")
        .select("id")
        .eq("id", input.productId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const path = `products/${input.productId}/${Date.now()}-${safeName}`;
      const signed = await ctx.storage.createSignedUploadUrl({
        bucket: PRODUCT_IMAGES_BUCKET,
        path,
      });
      return {
        bucket: PRODUCT_IMAGES_BUCKET,
        path: normalizeStorageKey(signed.path || path),
        signedUrl: signed.signedUrl,
        token: signed.token,
        productId: input.productId,
        publicUrl: ctx.storage.getPublicUrl({
          bucket: PRODUCT_IMAGES_BUCKET,
          path: normalizeStorageKey(signed.path || path),
        }),
      };
    }),

  /** Register an uploaded object in product_images (after client PUT to signed URL). */
  attachProductImage: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        storagePath: z.string().min(1),
        alt: z.string().max(200).optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const key = normalizeStorageKey(input.storagePath);
      assertProductImagePath(input.productId, key);

      const { data: product, error: pErr } = await ctx.db
        .from("products")
        .select("id")
        .eq("id", input.productId)
        .maybeSingle();
      if (pErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: pErr.message });
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });

      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const { data: existing } = await ctx.db
          .from("product_images")
          .select("sort_order")
          .eq("product_id", input.productId)
          .order("sort_order", { ascending: false })
          .limit(1);
        sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;
      }

      const { data, error } = await ctx.db
        .from("product_images")
        .insert({
          product_id: input.productId,
          storage_path: key,
          alt: input.alt ?? "",
          sort_order: sortOrder,
        })
        .select("id, product_id, storage_path, alt, sort_order")
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to attach image",
        });
      }

      const [mapped] = mapImages([data]);
      return mapped;
    }),

  removeProductImage: adminProcedure
    .input(z.object({ imageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: row, error: findErr } = await ctx.db
        .from("product_images")
        .select("id, storage_path")
        .eq("id", input.imageId)
        .maybeSingle();
      if (findErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: findErr.message });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Image not found" });

      const { error } = await ctx.db.from("product_images").delete().eq("id", input.imageId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const key = normalizeStorageKey(row.storage_path);
      // Only remove storage objects we own under products/… (not external http URLs)
      if (!/^https?:\/\//i.test(row.storage_path) && key.startsWith("products/")) {
        try {
          await ctx.storage.removeObjects?.({
            bucket: PRODUCT_IMAGES_BUCKET,
            paths: [key],
          });
        } catch {
          /* DB row already gone; orphan file is acceptable */
        }
      }

      return { ok: true as const };
    }),

  reorderProductImages: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        orderedIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      for (let i = 0; i < input.orderedIds.length; i++) {
        const id = input.orderedIds[i]!;
        const { error } = await ctx.db
          .from("product_images")
          .update({ sort_order: i })
          .eq("id", id)
          .eq("product_id", input.productId);
        if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return { ok: true as const };
    }),

  listCategoriesForCare: adminProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("categories")
      .select("id, name, slug, parent_id, composition_care_text")
      .order("sort_order", { ascending: true });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    const rows = (data ?? []) as CategoryCareRow[];
    return leafCategoriesForCare(rows);
  }),

  updateCategoryCompositionCare: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        compositionCareText: z.string().max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const text = normalizeCompositionCareText(input.compositionCareText);

      const { data: allCats, error: listError } = await ctx.db
        .from("categories")
        .select("id, name, slug, parent_id, composition_care_text");
      if (listError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: listError.message });
      }
      const rows = (allCats ?? []) as CategoryCareRow[];
      const target = rows.find((c) => c.id === input.id);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      }
      const leaves = leafCategoriesForCare(rows);
      if (!leaves.some((l) => l.id === input.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only leaf categories can have composition and care text",
        });
      }

      const { data, error } = await ctx.db
        .from("categories")
        .update({ composition_care_text: text })
        .eq("id", input.id)
        .select("id, name, slug, parent_id, composition_care_text")
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to update category",
        });
      }
      return data;
    }),
});
