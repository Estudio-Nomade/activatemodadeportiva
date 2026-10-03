# Design: Composition & care text per leaf category

**Date:** 2026-10-03  
**Status:** approved (human)  
**Branch intent:** `feat/category-composition-care` (or continue on storefront branch if preferred)  
**Language:** code/comments EN; admin + PDP copy ES-AR.

## Problem

PDP Magher-style accordion **“Composición y cuidados”** currently uses a **static** generic blurb because there is no DB field. Admin should edit that content once per **leaf category** so all products in that leaf share the same care copy (e.g. all “Calzas largas”).

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Scope of truth | **Leaf category only** (not product, not store-global) |
| Content shape | **Single textarea** `composition_care_text` |
| Product override | **None in v1** |
| Empty text on PDP | **Hide** the accordion section (no fake static fallback) |
| Parent categories | Not editable for this field (or UI lists leaves only) |

## Current context

- `categories`: `id, slug, name, parent_id, sort_order` — no care field.
- `products.description` remains product-level (Descripción accordion).
- Public catalog: `catalog.getProduct` selects product + variants/images; category is `category_id` only.
- Admin: product create/edit picks a leaf category; **no** category management UI yet.
- PDP: `PdpInfoAccordions` hardcodes composition/care copy.

## Data model

Migration (new file under `supabase/migrations/`):

```sql
alter table public.categories
  add column if not exists composition_care_text text not null default '';
```

- No CHECK that row is a leaf in SQL (tree shape can change); enforce leaf-only in **admin UI** and optionally in admin procedure.
- Seed: leave `''` for all categories (PDP hides section until admin fills).

### Types

- Update `src/server/db/types.ts` (or regenerate) so `categories.Row` includes `composition_care_text: string`.

## Resolution rule (PDP / public API)

```
product.category_id → categories.composition_care_text
```

- If product has no category (impossible under FK) or text is whitespace-only → treat as empty → **omit** accordion item.
- Do **not** walk parent categories for inheritance in v1.
- Do **not** fall back to static marketing copy when empty.

## API

### Public

**`catalog.getProduct`**

- Extend select / join so the returned product payload includes:

```ts
composition_care_text: string  // from categories, default ""
```

- Implementation options (either OK):
  1. Select category in the same query via embed `categories(composition_care_text)` and flatten in router.
  2. Second query by `category_id` after product load.
- Prefer embed if existing Supabase select style supports it without breaking list endpoints.
- **`listProducts` / cards:** do **not** need this field (PDP-only).

### Admin

Thin routers; service role after `adminProcedure`.

| Procedure | I/O |
|-----------|-----|
| `admin.catalog.listCategoriesForCare` (name flexible) | Returns tree or flat leaves: `{ id, name, slug, parent_id, parentName?, composition_care_text, isLeaf }` |
| `admin.catalog.updateCategoryCompositionCare` | Input: `{ id: uuid, compositionCareText: string }` → updates only that column. Reject unknown id. Optional: reject if category has children (`isLeaf === false`). |

- Max length: Zod `.max(20_000)` (or similar) to avoid abuse; plain text, no HTML.
- Update contracts: `docs/contracts/procedure-map.md` in the same PR.

## Admin UI

- Route: **`/admin/categorias`**
- Nav item in `AdminShell`: “Categorías” (between Catálogo and Talles or after Catálogo).
- Layout:
  - Group leaves under parent label (Mujer / Hombre / Accesorios).
  - Each leaf row: name + short preview of care text (truncated) + link/button “Editar”.
  - Edit view (same page expand or `/admin/categorias/[id]`):
    - Read-only: name, slug, parent.
    - Textarea: “Composición y cuidados” (rows ~8–12).
    - Helper: “Se muestra en el acordeón del PDP de todos los productos de esta categoría. Vacío = se oculta la sección.”
    - Save → mutation → toast/inline success.

No create/delete/reorder categories in this feature (tree remains seed/migration-managed unless already planned elsewhere).

## Storefront PDP

- `PdpInfoAccordions` receives `compositionCareText?: string | null` from product query (not hardcoded).
- Build items:
  1. Descripción — if product description non-empty.
  2. Composición y cuidados — **only if** `compositionCareText.trim()`.
  3–5. Pago / envío / cambios — unchanged (settings + legal links).
- Render care body with `whitespace-pre-wrap` (preserve line breaks from textarea).
- Remove static `COMPOSITION_CARE` constant once wired (or keep only as admin placeholder string in UI, not on PDP).

## Error handling

- Public: missing category join → `composition_care_text: ""` (safe degrade).
- Admin update: not found → domain/TRPC NOT_FOUND; non-leaf if enforced → `VALIDATION_ERROR` with clear ES message optional (admin UI is ES).
- No client-side inventing of care text for checkout or SEO beyond PDP accordion.

## Testing

- Unit/integration as fits repo:
  - After migration + seed, update one leaf category text; `getProduct` for seed product returns that string.
  - Empty string → accordion builder omits section (small pure helper test optional).
  - Admin procedure rejects bogus id.
- Manual smoke: admin fill “Calzas largas” → `/p/calza-performance` shows accordion with that text; clear text → section gone.

## Out of scope

- Per-product override / inheritance from parent.
- Rich text, markdown, images in care block.
- Editing category name/slug/tree in admin.
- SEO structured data for materials.
- Changing payment/shipping accordion sources.

## Implementation sketch (order)

1. Migration + types.
2. Public `getProduct` field + contract note.
3. Admin list + update procedures.
4. Admin page + nav.
5. PDP accordion wiring; drop static fallback.
6. Tests + `pnpm test` scoped; smoke `:3000`.

## Success criteria

- [ ] Admin can set care text per leaf category without touching each product.
- [ ] All products in that leaf show the same accordion content on PDP.
- [ ] Empty care text hides the section.
- [ ] Description remains product-level only.
- [ ] No Andreani/payment domain changes.
