# Activate Moda Deportiva — Frontend handoff (cola de trabajo)

**Para:** agente / humano que sigue el FE  
**Repo:** `Estudio-Nomade/activatemodadeportiva`  
**Path local tipico:** `~/Documentos/Estudio Nomade/activatemodadeportiva`  
**Fecha de este handoff:** 2026-04-01 (T0–T11 en `feat/frontend-baseline`)

Leelo **entero** antes de tocar codigo. Ejecuta **una tarea a la vez** (orden sugerido abajo). No mezcles 3 features en un solo PR mental.

---

## 0. Que es el proyecto

E-commerce AR sportswear **guest checkout** (sin cuentas de comprador v1):

- Catalogo + carrito client-only + checkout con `quote` / `placeOrder`
- Stock por variante con reservas 24h (`pendiente_pago`)
- Pago: transferencia o efectivo (efectivo **solo** retiro)
- Envio: retiro San Manuel o Andreani (Photon en direccion)
- Admin: pedidos, catalogo, settings
- Monosistema **Next.js App Router + tRPC + Supabase**

**Backend core esta en `main` (origin).**  
**Frontend baseline en branch `feat/frontend-baseline`** (`5ccf0aa` T0 … `73a1b2b` T10, T11 pendiente de commit).

Ownership:

| Capa | Paths |
|------|--------|
| Backend | `src/server/**`, `src/app/api/**`, `supabase/**`, `docs/contracts/**` |
| Frontend | `src/app/**` (pages), `src/components/**`, `src/lib/**` (client) |

Reglas duras (no romper):

1. Nunca confiar totales/precios del client → solo mostrar `checkout.quote` / order `*_cents`
2. Stock UI = `available` (on_hand − reservas), no solo on_hand
3. Solo productos `is_published` en storefront
4. `cash ⇒ pickup` only
5. Andreani requiere `shippingAddress` con `line1`, `city`, `postalCode`
6. `orders.getByCode` **no** expone `access_token`
7. Proofs: path `payment-proofs/{orderId}/…`
8. Domain errors via `error.data.domainCode`
9. Money = integer **cents**; display `es-AR`
10. Codigo/comentarios en **ingles**; copy producto ES-AR

Lectura obligatoria (en orden):

1. `AGENTS.md`
2. `docs/contracts/domain-invariants.md`
3. `docs/contracts/procedure-map.md` (actualizar si cambias shapes)
4. `docs/contracts/backend-for-frontend.md`
5. Skill: `activate-moda-deportiva-dev-pitfalls` (Hermes)
6. Design SoT: `design/ui-ux.pen` (Pencil frames 00–64)
7. Demos HTML (solo referencia visual): `demos/cliente.html`, `demos/admin.html`
8. PRD ES: `docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`

Package manager: **pnpm**. Verify: `pnpm lint` · `pnpm test` · `pnpm build`.

---

## 1. Stack / env / trampas

| Item | Valor |
|------|--------|
| App | Next 16 App Router + tRPC `/api/trpc` + superjson + React Query |
| DB | Supabase (local tests + cloud prod) |
| Cloud SB ref | `ujsrqqblhayumojskrow` (**doble q** despues de `ujsr`) |
| Vercel | scope/project `activatemodadeportiva` |
| `.env.local` | cloud / `pnpm dev` |
| `.env.test.local` | local Supabase para Vitest |
| Ports | **no hardcodear 54321** → `pnpm exec supabase status -o env` |
| Tests | `vitest.config.ts` tiene `fileParallelism: false` (stock seed compartido) |

JWT trap: ref con una sola `q` → `ENOTFOUND`. Decodificar payload del JWT.

Cloud vacio (`PGRST205`): aplicar `scripts/cloud-bootstrap.sql` en SQL Editor, no chase bugs de dominio.

Admin auth: Supabase password + fila en `admin_profiles` + `Authorization: Bearer <access_token>` (localStorage `activate_admin_access_token` via `src/lib/trpc/provider.tsx`).

---

## 2. Design tokens (Pencil)

| Token | Value |
|-------|--------|
| bg | `#F7F4EF` |
| surface | `#FFFFFF` |
| surface-soft | `#EFEAE3` |
| text | `#2C2A28` |
| text-muted | `#7A756E` |
| accent / bar | `#2F6F6A` |
| accent-soft | `#E4F0EE` |
| promo | `#C45C4A` |
| border | `#E5DFD6` |
| success | `#3D7A5A` |
| danger | `#B54040` |
| font | DM Sans |
| radius | 8 / 12 / 16 / pill 999 |
| mobile | 390 width frames |
| desktop | 1440 frames |

Ya cableados en `src/app/globals.css` (+ safe-area PWA).

---

## 3. YA HECHO (no rehacer)

Tratalo como baseline. Mejorar si la tarea lo pide; no reescribir de cero.

### Infra FE
- [x] tRPC client + provider + superjson (`src/lib/trpc/*`)
- [x] Cart client-only (`src/lib/cart/store.tsx`)
- [x] Money format (`src/lib/format/money.ts`)
- [x] Supabase browser (`src/lib/supabase/browser.ts`)
- [x] Store shell / chrome / product card
- [x] Admin shell + auth helpers (`src/lib/admin/auth.ts`, `src/components/admin/shell.tsx`)
- [x] Tokens CSS + btn/field/chip
- [x] Brand logo `public/brand/logo.png`

### PWA / mobile-first
- [x] `src/app/manifest.ts` → `/manifest.webmanifest` (standalone, theme accent)
- [x] Icons `public/icons/*` + apple-touch + favicon
- [x] SW `public/sw.js` + `RegisterServiceWorker` (no cache `/api` ni `/admin`)
- [x] Viewport `device-width` + `viewportFit: cover` + themeColor
- [x] Safe-area CSS, inputs 16px, targets ≥48px, FAB/admin nav insets
- [x] Headers SW/manifest/icons en `next.config.ts`

### Storefront routes (funcionales, no 1:1 Pencil)
- [x] `/` home basico (hero + cats + benefits)
- [x] `/c/[slug]` grid
- [x] `/p/[slug]` PDP color/talle/available, zoom, add cart
- [x] `/carrito` vacio + max stock
- [x] `/checkout` quote/placeOrder, cash⇒pickup, CBU copy
- [x] **Photon autocomplete** (`src/lib/photon/client.ts`, `PhotonAddressField`)
  - **Pitfall:** Photon NO acepta `lang=es` (solo default/de/en/fr) → usar `en` + bias BA
- [x] Checkout polish: validacion por campo, banner envio gratis, layout 2 col desktop, stock error screen
- [x] `/pedido` + `/pedido/exito` tracking code/token + proof upload
- [x] `/buscar` + empty shortcuts
- [x] Legales: quienes-somos, envios, medios-de-pago, cambios, terminos, privacidad, contacto

### Imagenes producto
- [x] `resolveProductImageUrl` + `ProductImage` + placeholder `/placeholders/product.svg`
- [x] Catalog `list/get/search` devuelven `product_images[].url`
- [x] Seed demo Unsplash en `calza-performance`
- [x] Admin upload: `createImageUploadUrl` → PUT → `attachProductImage` / `removeProductImage`
- [x] UI `AdminProductImages` en `/admin/catalogo/[id]`
- [x] Path storage: `products/{productId}/…` bucket **`product-images`** (publico)

### Guia de talles
- [x] Assets `public/size-guides/{magher-mujer,magher-hombre,medias-sox}.jpg`
- [x] Seed 3 `size_guides` + product seed con Magher mujer
- [x] `catalog.getProduct` → `size_guide { id, name, url }`
- [x] `catalog.listSizeGuides` + `admin.catalog.listSizeGuides`
- [x] PDP link + bottom sheet `SizeGuideSheet` (frame 13)
- [x] Admin picker guia en editar producto (`sizeGuideId`)

### Admin split (Pencil rutas)
- [x] `/admin/login`
- [x] `/admin` dashboard metricas
- [x] `/admin/pedidos?tab=` pendientes/en-curso/todos
- [x] `/admin/pedidos/[id]` detalle + acciones + modal comprobante (path texto; signed view pendiente)
- [x] `/admin/catalogo` lista + publish + stock + thumbs
- [x] `/admin/catalogo/nuevo` createProduct + variantes
- [x] `/admin/catalogo/[id]` update + stock + fotos + guia
- [x] `/admin/config` settings
- [x] Bottom nav Inicio/Pedidos/Catalogo/Config

### Verify gates (al momento del handoff)
- `pnpm lint` → 0 errors (warning viejo `_token` en `public-order.ts`)
- `pnpm build` → OK

### Git status (importante)
Baseline FE + T1 en **`feat/frontend-baseline`** (working tree limpio al cerrar T1).
1. Seguir tareas en branch feature o cortar `feat/<tarea>` desde acá
2. Commit firmado cuando haya GPG (`git commit -S`)
3. No commitear `.env.local` / secrets

---

## 4. COLA DE TRABAJO (una por una)

Prioridad = orden. Cada item: objetivo, archivos, criterios de done, pitfalls.

### T0 — Higiene repo (hacer primero si el agente va a PR)

**Objetivo:** baseline FE commiteable.

- [x] Branch descriptivo (`feat/frontend-baseline` o similar)
- [x] Stage solo FE relevante (no `.env*`, no basura)
- [x] `pnpm lint && pnpm build` verdes
- [x] Commit local `5ccf0aa` (sin GPG: no hay clave secreta en este entorno; re-firmar con `-S` si hace falta)
- [x] Actualizar `docs/ONBOARDING.md` (todavia dice “UI is next track”)

**Done:** baseline en `feat/frontend-baseline` (`5ccf0aa`). Working tree limpio.

---

### T1 — Tracking timeline visual (P0 restante UX post-compra) ✅

**Commit:** `b68ff4b` — `feat: order tracking timeline and status banners`  
**Pencil:** 09, 18, 26, 27, 32, 36, 41–43, 50  
**Ruta:** `src/app/pedido/page.tsx`

**Hecho:**
1. `OrderTimeline` — dots/línea; step 4 = `listo_retiro` **o** `enviado` según `shipping_method`
2. `OrderStatusBanner` — pendiente 24h, listo, en camino, entregado, cancelado
3. Empty not-found + toast comprobante
4. Totals solo de API; `access_token` solo vía token (no getByCode)

**Verify:** 5 tests OK · lint 0 err · build OK  
**Archivos:** `src/components/store/order-*.tsx`, `/pedido`, `order-timeline.test.ts`

- [x] `OrderTimeline` + `OrderStatusBanner` (`src/components/store/order-*.tsx`)
- [x] `/pedido` banners, empty not-found, toast comprobante
- [x] Unit: `order-timeline.test.ts`


---

### T2 — Home fidelidad Pencil (01 + 61) ✅

**Ruta:** `src/app/page.tsx`, `src/components/store/chrome.tsx`  
**Helpers:** `src/lib/format/promo.ts`, `src/lib/media/category-tile.ts`  
**Assets:** `public/home/hero.jpg`, `public/categories/{mujer,hombre,accesorios,fallback}.jpg`

**Hecho:**
1. Promo bar desde `settings.payment_discount_bps` (`formatPromoBarCopy`)
2. Hero mobile overlay + `season_label`; desktop split (61)
3. Tiles cat con imagen estática por slug + overlay (sin CMS)
4. Brand block (logo + copy + CTAs)
5. Benefits con % off dinámico

**Verify:** 7 tests OK · lint 0 err · build OK  
**Commit:** pendiente (working tree dirty en `feat/frontend-baseline`)

**Done:** mobile ~frame 01; desktop split sin romper; season/discount visibles.

---

### T3 — Categoria chips + agotados (06 / 23 / 46) ✅

**Ruta:** `src/app/c/[slug]/page.tsx`, `product-card.tsx`  
**Domain:** `category-tree`, `sold-out` · **UI helper:** `lib/catalog/category-chips`  
**API:** `listProducts` / `search` → `is_sold_out`; root slug incluye descendientes

**Hecho:**
1. Chips Todas + subcats (root children / child siblings)
2. Badge Agotado vía `is_sold_out` (available ≤ 0 en todas las variantes)
3. Empty state con CTAs inicio/buscar
4. Contracts: `procedure-map.md` + `domain-invariants.md`

**Verify:** 10 unit tests · lint 0 err · build OK

---

### T4 — Menu drawer Pencil (07 / 35) ✅

**Ruta:** `src/components/store/chrome.tsx`, `icons.tsx`  
**Helper:** `src/lib/contact/whatsapp.ts`

**Hecho:**
1. Drill-down root → subcats (Volver / Ver todo / hijos)
2. Iconos SVG (menu, close, search, cart, chevrons, WA) — sin emoji
3. WA en drawer + fab + footer via `whatsappHref(settings)`
4. Targets ≥48px; desktop header sin cambios de layout

**Verify:** whatsapp tests · lint 0 err · build OK

---

### T5 — PDP polish restante (02 / 14 / 16) ✅

**Ruta:** `src/app/p/[slug]/page.tsx` · helper `lib/catalog/pdp-meta.ts`

**Hecho:**
1. Meta lines dinámicas (% off / Andreani-retiro / cambios) desde settings bps
2. OOS producto (banner + badge) y OOS combo (warning)
3. Zoom fullscreen (Escape, flechas, dots, safe-area, botón zoom)
4. CTA sticky mobile “Sumar al carrito”; precio promo en color promo

**Verify:** pdp-meta tests · lint 0 err · build OK

---

### T6 — Admin comprobante signed URL (48) ✅

**Ruta:** `src/app/admin/pedidos/[id]/page.tsx`  
**API:** `admin.orders.getProofDownloadUrl({ proofId })`  
**Helpers:** `proofMediaKind`, tests `public-order` + `proof-kind`

**Hecho:**
1. Signed download (~15 min) bucket privado `payment-proofs`
2. Path re-validado con `assertProofStoragePath`
3. Modal: imagen / PDF iframe / link “otro”
4. `procedure-map.md` actualizado
5. Lint: warning `_token` en `toPublicOrderByCode` silenciado

**Verify:** 6 unit tests · lint 0 · build OK

---

### T7 — Admin add variant a producto existente ✅

**API:** `admin.catalog.addVariant` / `removeVariant`  
**Domain:** `canRemoveVariant` (bloquea si reservas u order_items)  
**UI:** `/admin/catalogo/[id]` form agregar + borrar

**Hecho:**
1. Add color/size/stock; unique conflict → CONFLICT
2. Remove solo si no hay reservas ni líneas de pedido (si no → stock 0)
3. `procedure-map.md` + tests

**Verify:** 3 unit tests · lint 0 · build OK

---

### T8 — Reorder product images UI ✅

**API:** `admin.catalog.reorderProductImages` (existente)  
**UI:** ↑↓ en `AdminProductImages` · helper `moveIdInOrder`

**Hecho:** reordenar con botones; badge Portada en índice 0; tests helper.

**Verify:** 4 unit tests · lint 0 · build OK

---

### T9 — Size guides admin CRUD (opcional v1.1) ✅

**Ruta:** `/admin/guias`  
**API:** `createSizeGuide` / `updateSizeGuide` / `createSizeGuideUploadUrl` / `deleteSizeGuide`  
**Migration:** `20261001000000_size_guides_bucket.sql` (bucket público `size-guides`)  
**Nota:** en cloud/local aplicar migration (`supabase db push` / reset) para el bucket.

**Hecho:** list + create name + rename + upload image + delete; seed paths `/size-guides/…` siguen OK.

**Verify:** 5 path tests · lint 0 · build OK (+ route `/admin/guias`)

---

### T10 — Desktop layouts (61–63) ✅

**Hecho (sin dark mode):**
- Shell/header/footer → `max-w-7xl` + padding lg
- Home: hero más alto, tiles/benefits/brand spacing desktop
- PDP: sticky gallery, tipografía lg, CTA max-width
- Checkout: grid `max-w-6xl`, gap/sticky aside
- Cart: max-width + summary card desktop
- Categoría: títulos/gaps grid desktop

**Verify:** lint 0 · build OK

---

### T11 — Emails Resend alineados a mocks (37–38, 51–54) ✅

**Server:** `src/server/email/templates.ts` (+ resend/console)

**Hecho:**
- HTML brand (accent bar, logo si `NEXT_PUBLIC_APP_URL`, CTA pill “Ver pedido”)
- Templates: order_created, payment_confirmed, ready_pickup, shipped, delivered, cancelled
- Magic link `/pedido?token=…`; transfer CBU en order_created
- Resend usa templates; console loguea subject + htmlBytes (`EMAIL_CONSOLE_HTML=1` dump)

**Env:** `RESEND_API_KEY` + `EMAIL_FROM` + `NEXT_PUBLIC_APP_URL`  
**Verify:** 5 template tests · lint 0 · build OK

---

### T12 — Copy legales / contacto desde settings

**Rutas:** `src/app/quienes-somos` etc.  
Hoy copy estatico basico.  
Conectar `settings.getPublic` / contact fields; WA/IG reales.

---

### T13 — Smoke QA end-to-end (antes de “listo cliente”)

Checklist manual (browser 390 + desktop):

1. Home → cat → PDP → add → cart → checkout transfer+Andreani (Photon) → exito → upload proof → admin confirma → timeline avanza
2. Checkout cash+pickup OK; cash+Andreani bloqueado
3. Stock max en carrito; oversell → error `STOCK_INSUFFICIENT`
4. Admin create product + foto + guia + publish → aparece en tienda
5. PWA: manifest + SW en Application tab; Add to Home Screen
6. `pnpm test` con `.env.test.local` + local Supabase seed
7. `pnpm build`

---

## 5. Fuera de scope v1 (NO hacer sin OK humano)

- Payway / Mercado Pago / tarjetas
- Cuentas de comprador
- Tabla `carts` server-side
- Home CMS rico
- Roles admin finos
- Inventar REST paralelo a tRPC

---

## 6. Mapa rapido “donde esta X”

| Necesito | Path |
|----------|------|
| Totals | `src/server/domain/pricing/calculate-totals.ts` |
| Place order | `src/server/domain/checkout/place-order.ts` + RPC SQL |
| Status machine | `src/server/domain/orders/status.ts`, `transitions.ts` |
| Expire 24h | cron `/api/cron/expire-reservations` |
| Public routers | `src/server/trpc/routers/{catalog,checkout,orders,settings}.ts` |
| Admin routers | `src/server/trpc/routers/admin/*` |
| Procedures I/O | `docs/contracts/procedure-map.md` |
| Photon | `src/lib/photon/client.ts` |
| Product images | `src/lib/media/product-image.ts` |
| Size guides | `src/lib/media/size-guide.ts` |
| Pencil frames | `design/ui-ux.pen` + skill reference `ui-screens-and-routes.md` |
| Demos | `demos/cliente.html`, `demos/admin.html` |

---

## 7. Como ejecutar una tarea (plantilla)

```text
1. Leer AGENTS.md + contracts tocados
2. git checkout -b feat/<tarea-corta>
3. Implementar SOLO esa tarea
4. Si cambias procedure shapes → procedure-map.md + domain-invariants si aplica
5. pnpm lint && pnpm build
6. Si tocás checkout/stock/status → pnpm test (con .env.test.local)
7. Smoke browser de la ruta
8. Commit -S / pedir humano
9. Marcar checkbox en este archivo
```

Skill Hermes a cargar: **`activate-moda-deportiva-dev-pitfalls`**.

---

## 8. Estado emocional del FE (para no engañarse)

| Capa | ~% vs Pencil |
|------|----------------|
| Rutas storefront | ~85% |
| Logica tRPC cableada | ~80% |
| Admin estructura | ~75% |
| Fidelidad visual mobile | ~45–55% |
| Desktop polish | ~25% |
| Emails | ~10% |
| Tracking visual | ~hecho (T1) |
| Home Pencil 01/61 | ~hecho (T2) |
| Categoria chips + agotado | ~hecho (T3) |
| Menu drawer drill-down | ~hecho (T4) |
| PDP polish | ~hecho (T5) |
| Admin proof signed URL | ~hecho (T6) |
| Admin add/remove variant | ~hecho (T7) |
| Reorder product images | ~hecho (T8) |
| Size guides admin CRUD | ~hecho (T9) |
| Desktop layouts | ~hecho (T10) |
| Emails brand templates | ~hecho (T11) |
| Photon / imagenes / guia talles | ~hechos |

**No es greenfield.** Es **pulir y cerrar gaps** contra Pencil + PRD.

---

## 9. Proxima tarea recomendada

**T12 — legales / contacto desde settings**  
**T13 — smoke QA** end-to-end.

T0–T11 en `feat/frontend-baseline`.

**Ops T9:** migration bucket `size-guides`.  
**Ops T11:** `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`.

---

*Mantener este archivo actualizado: tachar `[x]` al cerrar cada T# y anotar pitfalls nuevos abajo.*

### Pitfalls descubiertos en sesiones recientes

1. Photon `lang=es` → HTTP 400 (usar `en`)
2. Supabase port no siempre 54321
3. Cloud ref JWT doble `q`: `ujsrqqbl…`
4. `vercel link` puede pisar `.env.local`
5. Vitest parallel = flaky stock → `fileParallelism: false`
6. React lint: no setState sync en effect (usar key/remount o defer)
7. `storage_path` puede ser URL absoluta **o** key de bucket — siempre pasar por `resolveProductImageUrl` / `resolveSizeGuideUrl`
