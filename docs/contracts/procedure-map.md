# tRPC procedure map

Source: `src/server/trpc/routers/*`. Type export: `AppRouter` from `@/server/trpc/routers/app`.

Transformer: **superjson**. Endpoint: `POST|GET /api/trpc`.

Auth: `publicProcedure` = no auth. `adminProcedure` = `Authorization: Bearer <supabase access_token>` and row in `admin_profiles`.

---

## `health`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | `{ ok: true }` |

---

## `catalog`

### `catalog.listCategories`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | `{ id, name, slug, parent_id, sort_order }[]` |

### `catalog.listSizeGuides`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | `{ id, name, storage_path, url }[]` |

### `catalog.listProducts`

| | |
|--|--|
| Type | query |
| Input | `{ categorySlug?: string }` |
| Output | published products + `product_images` (with `url`) + `is_sold_out: boolean` |
| Note | If `categorySlug` is a root, includes products in that category **and descendants**. `is_sold_out` = no variants or all variants `available <= 0` (on_hand − active reservations). |

### `catalog.getProduct`

| | |
|--|--|
| Type | query |
| Input | `{ slug: string }` |
| Output | product + `product_variants(…, available)` + `product_images` + `size_guide?: { id, name, storage_path, url }` + `composition_care_text: string` (from leaf category; `""` if unset) |
| Errors | `NOT_FOUND` if missing/unpublished |
| Note | `available` = on_hand − active reservations (use this for add-to-cart, not raw on_hand alone). Care text is category-level, not product-level. |

### `catalog.search`

| | |
|--|--|
| Type | query |
| Input | `{ q: string }` (min 1) |
| Output | published products matching name or category name (deduped) + `product_images` + `is_sold_out: boolean` |

---

## `settings`

### `settings.getPublic`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | `{ season_label, whatsapp, whatsapp_message, instagram, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents, contact_email, contact_address }` |

---

## `checkout`

### `checkout.quote`

| | |
|--|--|
| Type | mutation |
| Input | `{ lines: { variantId: uuid, qty: positive int }[], shippingMethod: "pickup" \| "andreani", paymentMethod: "transfer" \| "cash", shippingAddress?: { line1, city, postalCode, ... } \| null }` |
| Output | `{ lines: { variantId, productId, productName, color, size, unitPriceCents, qty, available }[], subtotalCents, discountCents, shippingCents, totalCents }` |
| Domain | merges duplicate variant lines; published products only; andreani requires address; stock + combo + pricing |

### `checkout.placeOrder`

| | |
|--|--|
| Type | mutation |
| Input | same as quote + `{ customerName, phone, email }` (andreani requires `shippingAddress` with `line1`, `city`, `postalCode`) |
| Output | order row including `access_token` (only place this is returned to client besides email) |
| Domain | merges lines; published only; atomic `place_order_tx`; 24h reserve; email `order_created` |

---

## `orders`

### `orders.getByCode`

| | |
|--|--|
| Type | query |
| Input | `{ code: string }` |
| Output | order + items + proofs **without** `access_token` |

### `orders.getByToken`

| | |
|--|--|
| Type | query |
| Input | `{ token: string }` (magic link) |
| Output | full order including `access_token` |

### `orders.createProofUploadUrl`

| | |
|--|--|
| Type | mutation |
| Input | `{ code? or token?, fileName }` |
| Output | `{ bucket, path, signedUrl, token, orderId }` path under `payment-proofs/{orderId}/` |

### `orders.uploadPaymentProof`

| | |
|--|--|
| Type | mutation |
| Input | `{ code? or token?, storagePath }` — path must match `payment-proofs/{orderId}/...` |
| Output | `{ id, order_id, storage_path, uploaded_at }` |
| Domain | only `pendiente_pago` |

---

## `admin.catalog` (admin)

### `admin.catalog.listCategoriesForCare`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | leaf categories only: `{ id, name, slug, parent_id, parentName, composition_care_text, isLeaf: true }[]` |
| Note | Parents with children are omitted. Used by `/admin/categorias`. |

### `admin.catalog.updateCategoryCompositionCare`

| | |
|--|--|
| Type | mutation |
| Input | `{ id: uuid, compositionCareText: string }` (max 20_000; trimmed server-side) |
| Output | category row `{ id, name, slug, parent_id, composition_care_text }` |
| Errors | `NOT_FOUND`, `BAD_REQUEST` if category is not a leaf |

### `admin.catalog.createProduct`

| | |
|--|--|
| Type | mutation |
| Input | `{ name, slug, description?, categoryId, listPriceCents, promoPriceCents?, isPublished?, sizeGuideId?, variants?: { color, size, stockOnHand?, sku? }[] }` |
| Output | product row |
| Notes | `sku` = optional external stock code (Excel); trim; empty → null; max 64; unique case-insensitive when set |

### `admin.catalog.updateProduct`

| | |
|--|--|
| Type | mutation |
| Input | `{ id, name?, slug?, description?, categoryId?, listPriceCents?, promoPriceCents?, isPublished?, sizeGuideId? }` |
| Output | product row |

### `admin.catalog.setVariantStock`

| | |
|--|--|
| Type | mutation |
| Input | `{ variantId, stockOnHand }` |
| Output | variant row |

### `admin.catalog.addVariant`

| | |
|--|--|
| Type | mutation |
| Input | `{ productId, color, size, stockOnHand?, sku? }` |
| Output | variant row `{ id, product_id, color, size, stock_on_hand, sku }` |
| Errors | `NOT_FOUND`, `CONFLICT` if unique `(product_id, color, size)` or duplicate `sku` |

### `admin.catalog.updateVariant`

| | |
|--|--|
| Type | mutation |
| Input | `{ variantId, sku? }` (`sku` null/empty clears code) |
| Output | variant row `{ id, product_id, color, size, stock_on_hand, sku }` |
| Errors | `NOT_FOUND`, `CONFLICT` if sku already used on another variant, `BAD_REQUEST` if nothing to update |

### `admin.catalog.removeVariant`

| | |
|--|--|
| Type | mutation |
| Input | `{ variantId }` |
| Output | `{ ok: true }` |
| Errors | `NOT_FOUND`, `PRECONDITION_FAILED` if reservations or order_items reference the variant (use stock 0 instead) |

### `admin.catalog.setPublished`

| | |
|--|--|
| Type | mutation |
| Input | `{ id, isPublished }` |
| Output | product row |

### `admin.catalog.deleteProduct`

| | |
|--|--|
| Type | mutation |
| Input | `{ id }` |
| Output | `{ ok: true }` |
| Errors | `NOT_FOUND`, `PRECONDITION_FAILED` if any variant has reservations or order_items (unpublish + stock 0 instead) |
| Notes | Cascades `product_images` + `product_variants`. Best-effort remove of storage objects under `products/{id}/`. Multiple gallery images already supported via attach/remove/reorder. |

### `admin.catalog.listProducts`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | all products + variants (`id, color, size, stock_on_hand, sku`) + `product_images` (with resolved `url` when mapped) |

### `admin.catalog.listSizeGuides`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | `{ id, name, storage_path, url }[]` |

### `admin.catalog.createSizeGuide`

| | |
|--|--|
| Type | mutation |
| Input | `{ name, storagePath? }` — path = site `/size-guides/…` or object key in bucket `size-guides` |
| Output | `{ id, name, storage_path, url }` |

### `admin.catalog.updateSizeGuide`

| | |
|--|--|
| Type | mutation |
| Input | `{ id, name?, storagePath? }` (`storagePath` null clears image) |
| Output | `{ id, name, storage_path, url }` |

### `admin.catalog.createSizeGuideUploadUrl`

| | |
|--|--|
| Type | mutation |
| Input | `{ fileName, contentType? }` |
| Output | `{ bucket: "size-guides", path, signedUrl, token?, publicUrl }` |

### `admin.catalog.deleteSizeGuide`

| | |
|--|--|
| Type | mutation |
| Input | `{ id }` |
| Output | `{ ok: true }` |
| Note | Products with this guide get `size_guide_id` null (FK ON DELETE SET NULL). Storage object removed when path is a bucket key (not `/public` site path). |

### `admin.catalog.createImageUploadUrl`

| | |
|--|--|
| Type | mutation |
| Input | `{ productId, fileName, contentType? }` |
| Output | `{ bucket: "product-images", path, signedUrl, token?, productId, publicUrl }` |
| Notes | path is `products/{productId}/{ts}-{safeName}` |

### `admin.catalog.attachProductImage`

| | |
|--|--|
| Type | mutation |
| Input | `{ productId, storagePath, alt?, sortOrder? }` |
| Output | image row + `url` |
| Domain | `storagePath` must be under `products/{productId}/` |

### `admin.catalog.removeProductImage`

| | |
|--|--|
| Type | mutation |
| Input | `{ imageId }` |
| Output | `{ ok: true }` |
| Notes | deletes DB row; best-effort remove of storage object if path is under `products/` |

### `admin.catalog.reorderProductImages`

| | |
|--|--|
| Type | mutation |
| Input | `{ productId, orderedIds: uuid[] }` |
| Output | `{ ok: true }` |

---

## `admin.orders` (admin)

### `admin.orders.list`

| | |
|--|--|
| Type | query |
| Input | `{ status?: OrderStatus }?` optional |
| Output | summary rows ordered by `created_at` desc |

### `admin.orders.getById`

| | |
|--|--|
| Type | query |
| Input | `{ id: uuid }` |
| Output | full order + items (`…, sku` snapshot) + proofs + stock_reservations |

### `admin.orders.getProofDownloadUrl`

| | |
|--|--|
| Type | query |
| Input | `{ proofId: uuid }` |
| Output | `{ proofId, orderId, storagePath, signedUrl, expiresIn }` |
| Errors | `NOT_FOUND`, `BAD_REQUEST` if path not under `payment-proofs/{orderId}/` |
| Note | Private bucket `payment-proofs`; signed download (~15 min). Path re-validated server-side. |

### `admin.orders.confirmPayment` → `{ ok: true }`

Input `{ id }` — `pendiente_pago` → `pago_confirmado`

### `admin.orders.startPreparing` → `{ ok: true }`

Input `{ id }` — `pago_confirmado` → `preparando`

### `admin.orders.markReadyForPickup` → `{ ok: true }`

Input `{ id }` — pickup only

### `admin.orders.markShipped` → `{ ok: true }`

Input `{ id }` — andreani only

### `admin.orders.markDelivered` → `{ ok: true }`

Input `{ id }`

### `admin.orders.cancel` → `{ ok: true }`

Input `{ id }` — `cancel_reason = admin`

---

## `admin.settings` (admin)

### `admin.settings.get`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | full `store_settings` row (`id = 1`) |

### `admin.settings.update`

| | |
|--|--|
| Type | mutation |
| Input | partial: `season_label, whatsapp_url_or_phone, whatsapp_prefill_message, instagram_url, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents, contact_email, contact_address` |
| Output | updated row |
