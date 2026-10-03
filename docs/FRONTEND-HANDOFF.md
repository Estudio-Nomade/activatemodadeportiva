# Activate Moda Deportiva — Frontend handoff (cola de trabajo)

**Para:** agente / humano que sigue el FE  
**Repo:** `Estudio-Nomade/activatemodadeportiva`  
**Path local tipico:** `~/Documentos/Estudio Nomade/activatemodadeportiva`  
**Fecha de este handoff:** 2026-10-02 (T0–T13 en `feat/frontend-baseline` + visual fidelity en `feat/visual-fidelity-pencil-brand`)

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
**Frontend baseline en branch `feat/frontend-baseline`** (`5ccf0aa` T0 … `a62d7f6` T11; T12–T13 en commits siguientes).

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

## 2. Design tokens (brand PDF gana sobre Pencil e-commerce)

**SoT color/logo:** `docs/Identidad visual.pdf` + `LOGO SIN FONDO.png`  
**SoT layout pantallas:** `design/ui-ux.pen` (estructura), **no** el teal del pen.

| Token | Value (brand) | Notas |
|-------|---------------|--------|
| bg | `#F3EEE7` | papel cálido PDF (~`#DDD5CD` suavizado para UI) |
| surface | `#FAF7F3` | crema |
| surface-soft | `#E8E0D6` | |
| text / ink | `#12100F` | tinta monograma logo |
| text-muted | `#7A736C` | |
| accent / bar / CTA | `#1A1816` | charcoal — **no** `#2F6F6A` teal Pencil |
| accent-soft | `#EDE6DD` | |
| promo | `#8F5E4A` | terracotta suave (PDF no trae coral chillón) |
| border | `#D6CDC3` | |
| success | `#5C5346` | taupe (sin verde) |
| danger | `#9A4540` | terracota oscuro |
| wa FAB | `#1A1816` | charcoal (no verde marca WhatsApp en UI) |
| font | DM Sans | PDF sin tipografía extraíble; se mantiene |
| radius | 8 / 12 / 16 / pill 999 | |
| mobile / desktop | 390 / 1440 | frames Pencil |

Cableados en `src/app/globals.css` (+ themeColor/manifest/emails).

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

### T12 — Copy legales / contacto desde settings ✅

**API:** `settings.getPublic` + `contact_email`, `contact_address`  
**UI:** `src/components/store/info-page.tsx` + páginas legales/contacto

**Hecho:** WA/IG/email/dirección/CBU/% off/Andreani fee desde settings en quiénes-somos, envíos, medios de pago, cambios, términos, privacidad, contacto.

**Verify:** lint 0 · build OK · procedure-map

---

### T13 — Smoke QA end-to-end (antes de “listo cliente”) ✅ casi cerrado

**Automatizado (agente, 2026-10-02):**
- `pnpm exec supabase start` + `db reset` (incl. migration `size-guides`)
- `.env.test.local` alineado a ports de `supabase status` (API `54421`)
- `pnpm test` → **77/77 passed** (unit + integration)
- `pnpm lint` → 0 errors

**Smoke browser (Playwright headless, Chromium del sistema):**
1. Home → `/c/mujer` → PDP → cart → checkout **transfer+Andreani** (addr manual) → `/pedido/exito` → **OK** (`ACT-*`)
2. **cash+pickup** → éxito **OK**; cash bajo Andreani **disabled** + copy “Efectivo solo con retiro”
3. Stock oversell: quote falla → confirm disabled + msg `STOCK_INSUFFICIENT`; cart capea `qty ≤ maxAvailable`
4. Tracking `/pedido?token=…`: timeline + **Subir comprobante** (`input[type=file]`) **OK**
5. PWA: `/manifest.webmanifest` + `/sw.js` **OK**; admin login page carga
6. Admin confirma pago / CRUD producto+foto+guía+publish: **pendiente humano** (user `admin_profiles` + sesión)

**Bugfix en smoke:** `useSyncExternalStore` cart — `getSnapshot` hacía `JSON.parse` nuevo cada call → infinite loop. Fix en `src/lib/cart/store.tsx` (cache `memoryLines`). Checkout muestra copy clara si quote devuelve `STOCK_INSUFFICIENT`.

**A2HS:** no verificado en device real (solo manifest/SW HTTP).

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
| Fidelidad visual mobile | ~70–75% (pass 2026-10-02) |
| Desktop polish | ~45% |
| Emails | ~hecho brand HTML (T11) |
| Tracking visual | ~hecho (T1) |
| Home Pencil 01/61 | ~hecho + brand block overlay |
| Categoria chips + agotado | ~hecho (chips solid accent) |
| Menu drawer 07/35 | ~hecho flat list + drill-down |
| PDP polish 02/13 | ~hecho gallery bleed, size tiles, sheet |
| Admin proof signed URL | ~hecho (T6) |
| Admin add/remove variant | ~hecho (T7) |
| Reorder product images | ~hecho (T8) |
| Size guides admin CRUD | ~hecho (T9) |
| Desktop layouts | ~hecho (T10) |
| Emails brand templates | ~hecho (T11) |
| Legales/contacto settings | ~hecho (T12) |
| Smoke QA | ~cerrado (77 tests + browser; admin confirm/CRUD humano) |
| Photon / imagenes / guia talles | ~hechos |

**No es greenfield.** Es **pulir y cerrar gaps** contra Pencil + PRD.

---

## 8b. Visual fidelity pass (`feat/visual-fidelity-pencil-brand`)

Pass extra post T0–T13. **No reabre** la cola T#. SoT: `design/ui-ux.pen` + brand pack cliente.

### Checklist frames

| Frame | Qué se alineó | ~% |
|-------|----------------|-----|
| Tokens / DS 00 | **Corregido 2026-10-02:** PDF brand (beige+charcoal) pisa teal Pencil; DM Sans se mantiene | 90 |
| Brand assets | `public/brand/logo-mark.png` (+ transparent/on-light), icons PWA desde mark | 90 |
| 07 / 35 menú | Drawer 300px flat (sin cards), tipografía 18/15, overlay `#2C2A2866`, WA + legales muted | 85 |
| Header | Wordmark mark + ACTIVATE + season; iconos sin círculo borde; badge cart | 80 |
| 01 / 61 home | Hero 420 mobile, tiles 110, brand block accent overlay quote | 80 |
| 06 / 46 cat | Chips solid accent, cards 3:4 sin border box, precio promo | 75 |
| 02 / 13 / 14 PDP | Gallery bleed, thumbs, size tiles sm radius, sheet guía SVG close + nota cm | 80 |
| Footer / FAB | Logo mark + tracking; FAB 52 | 75 |
| 03–05 cart/checkout | Sin rediseño profundo este pass (baseline T ok) | 55 |
| 61–63 desktop | Split hero + sticky PDP ya de T10; menú desktop nav intacto | 50 |
| Admin | Fuera de prioridad este pass | — |

### Assets

- Logos: `public/brand/logo.png` (transparent full), `logo-mark.png`, `logo-transparent.png`, `logo-on-light.png`
- Size guides: ya iguales a tablas Magher/Sox del cliente (no reexport)
- **No versionar** PDF/PNG sueltos en raíz del repo (duplicados de `docs/`)

### Gaps honestos

1. PDF identidad = páginas raster sin texto extraíble; tokens siguen Pencil (coinciden con mockup cálido `#F7F4EF`)
2. Mockup cliente menú no se pudo OCR; se usó Pencil 07/35 + demo HTML
3. Pencil color swatches circulares vs chips texto (API da nombre de color, no hex) — chips texto OK
4. Cart/checkout/éxito densidades tipográficas pendientes de pass fino
5. Pencil app MCP no conectó en sesión; extracción vía parse JSON del `.pen`

### Verify

- `pnpm lint` 0 errors
- `pnpm build` OK (2026-10-02)

---

## 9. Proxima tarea recomendada

**Cola T0–T13 cerrada** + **visual fidelity pass** en `feat/visual-fidelity-pencil-brand`.  
Siguiente: smoke browser 390/1440, admin smoke, PR → `main`, ops cloud.

**Ops (humano / cloud):**
- [ ] `supabase db push` (o migrate) en cloud — bucket `size-guides` + buckets product-images / payment-proofs
- [ ] Env prod: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, Supabase URL/keys
- [ ] Admin user Auth + fila `admin_profiles`
- [ ] Vercel Cron → `/api/cron/expire-reservations` + `CRON_SECRET`
- [ ] PR `feat/frontend-baseline` → `main` + deploy

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
8. `Identidad visual.pdf` es imagen (sin texto). **Paleta real = beige papel + charcoal logo.** El teal `#2F6F6A` del Pencil es e-commerce inventado — PDF de marca gana.
9. `pencil-open` bare se clava en picker; pasar path absoluto al `.pen`
10. Logo fuente es mark circular 1254²: header usa `logo-mark` + wordmark ACTIVATE, no el PNG solo a 36px de alto (se ve pixelado/cropped)
11. No commitear duplicados root de brand pack si ya están en `docs/`
