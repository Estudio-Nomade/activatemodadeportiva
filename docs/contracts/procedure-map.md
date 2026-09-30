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

### `catalog.listProducts`

| | |
|--|--|
| Type | query |
| Input | `{ categorySlug?: string }` |
| Output | published products: `{ id, name, slug, description, list_price_cents, promo_price_cents, category_id, is_published }[]` |

### `catalog.getProduct`

| | |
|--|--|
| Type | query |
| Input | `{ slug: string }` |
| Output | product + `product_variants(id, color, size, stock_on_hand)` + `product_images(id, storage_path, alt, sort_order)` |
| Errors | `NOT_FOUND` if missing/unpublished |

### `catalog.search`

| | |
|--|--|
| Type | query |
| Input | `{ q: string }` (min 1) |
| Output | published products matching name or category name (deduped) |

---

## `settings`

### `settings.getPublic`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | `{ season_label, whatsapp, instagram, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents }` |

---

## `checkout`

### `checkout.quote`

| | |
|--|--|
| Type | mutation |
| Input | `{ lines: { variantId: uuid, qty: positive int }[], shippingMethod: "pickup" \| "andreani", paymentMethod: "transfer" \| "cash" }` |
| Output | `{ lines: { variantId, productId, productName, color, size, unitPriceCents, qty, available }[], subtotalCents, discountCents, shippingCents, totalCents }` |
| Domain | stock + combo + pricing |

### `checkout.placeOrder`

| | |
|--|--|
| Type | mutation |
| Input | quote fields + `{ customerName, phone, email, shippingAddress?: Record \| null }` |
| Output | order row: `id, code, access_token, status, customer_*, shipping_method, payment_method, *_cents, shipping_address, reservation_expires_at, cancel_reason, created_at, updated_at, cancelled_at` |
| Domain | reserves 24h, emails `order_created` |

---

## `orders`

### `orders.getByCode`

| | |
|--|--|
| Type | query |
| Input | `{ code: string }` |
| Output | order + `order_items` + `payment_proofs` (includes `access_token`) |

### `orders.getByToken`

| | |
|--|--|
| Type | query |
| Input | `{ token: string }` |
| Output | same as `getByCode` |

### `orders.uploadPaymentProof`

| | |
|--|--|
| Type | mutation |
| Input | `{ code?: string, token?: string, storagePath: string }` (code or token required) |
| Output | `{ id, order_id, storage_path, uploaded_at }` |
| Domain | only when `status === pendiente_pago`; else `ORDER_NOT_PENDING` |

Upload file first via Storage signed URL into bucket `payment-proofs`, then pass `storagePath`.

---

## `admin.catalog` (admin)

### `admin.catalog.createProduct`

| | |
|--|--|
| Type | mutation |
| Input | `{ name, slug, description?, categoryId, listPriceCents, promoPriceCents?, isPublished?, sizeGuideId?, variants?: { color, size, stockOnHand? }[] }` |
| Output | product row |

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

### `admin.catalog.setPublished`

| | |
|--|--|
| Type | mutation |
| Input | `{ id, isPublished }` |
| Output | product row |

### `admin.catalog.listProducts`

| | |
|--|--|
| Type | query |
| Input | none |
| Output | all products + variants (published and draft) |

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
| Output | full order + items + proofs + stock_reservations |

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
| Input | partial: `season_label, whatsapp_url_or_phone, instagram_url, transfer_cbu_alias_text, payment_discount_bps, andreani_fee_cents, free_shipping_threshold_cents, contact_email, contact_address` |
| Output | updated row |
