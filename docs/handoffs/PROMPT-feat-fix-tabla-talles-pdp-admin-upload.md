# PROMPT — feat/fix: Tabla de talles (PDP estilo Magher) + upload imagen en admin

**Modo:** implementar + smoke browser (no investigate-only).  
**Idioma respuesta al humano:** español, corto, con URLs de smoke.  
**Código/comentarios en el repo:** inglés (AGENTS.md). Copy UI: ES-AR.

---

## 0) Kickoff (leé esto primero)

Repo absoluto:

```text
/home/marti/Documentos/Estudio Nomade/activatemodadeportiva
```

Package manager: **pnpm**. App: Next.js App Router + tRPC + Supabase.

Branch base: el HEAD del checkout principal que esté corriendo en **http://localhost:3000** (hoy puede ser `feat/quienes-somos-content-photos` u otra). **No** uses worktree `:3001` salvo que el humano lo diga.

Nueva branch:

```text
feat/tabla-talles-pdp-admin-upload
```

Referencia de producto (humano):

```text
https://www.magher.com.ar/top-pure-1/p
```

En Magher, en la ficha de producto, **debajo del selector de Talle** hay un enlace tipo **“Tabla de talles”** que abre la **imagen** de la tabla. Eso hay que tenerlo bien en Activate.

Síntoma del humano (palabras):

> En Magher, abajo del Talle hay “Tabla de talles” y sale una imagen con la tabla. Eso hay que hacerlo. Y desde admin en guía de talles **no te deja subir una imagen** de la tabla de talles.

**Importante:** el feature **ya está parcialmente implementado** (T9 handoff). **NO rehacer greenfield.** Auditar, completar UX Magher-like, y **arreglar el upload admin** hasta que funcione de punta a punta.

Smoke obligatorio al final:

- Store: `http://localhost:3000/p/<slug-con-guía>` — link bajo Talle → sheet con imagen legible
- Admin: `http://localhost:3000/admin/guias` — crear guía + **subir JPEG** + ver preview
- Admin producto: `http://localhost:3000/admin/catalogo/[id]` — asignar guía y guardar
- Nunca asumir `:3001`

---

## 1) Qué ya existe (leé el código vivo, no confíes solo en este doc)

| Pieza | Path |
|-------|------|
| PDP store | `src/app/p/[slug]/page.tsx` — link actual **“Guía de talles”** solo si `product.size_guide`; abre sheet |
| Bottom sheet imagen | `src/components/store/size-guide-sheet.tsx` |
| Resolve URL | `src/lib/media/size-guide.ts`, `src/lib/media/size-guide-path.ts` (+ test) |
| Admin CRUD UI | `src/app/admin/guias/page.tsx` — crear nombre, renombrar, **Subir imagen**, eliminar |
| Link desde catálogo | `src/app/admin/catalogo/[id]/page.tsx` (+ nuevo) select `sizeGuideId` + link a `/admin/guias` |
| Admin shell title | `src/components/admin/shell.tsx` — title “Guías de talles” si path `/admin/guias`, **pero NO está en el bottom NAV** (solo 4: Inicio/Pedidos/Catálogo/Config) |
| tRPC public | `src/server/trpc/routers/catalog.ts` — `getProduct` join `size_guides` → `size_guide: { id, name, storage_path, url }` |
| tRPC admin | `src/server/trpc/routers/admin/catalog.ts` — `listSizeGuides`, `createSizeGuide`, `updateSizeGuide`, `createSizeGuideUploadUrl`, `deleteSizeGuide` |
| Storage | bucket const `SIZE_GUIDES_BUCKET = "size-guides"` en `src/server/storage/port.ts`; signed upload `src/server/storage/supabase-storage.ts` |
| Migration bucket | `supabase/migrations/20261001000000_size_guides_bucket.sql` — **solo** `insert into storage.buckets … public true` (sin policies extra) |
| Seed | `supabase/seed.sql` — 3 guías Magher mujer/hombre + Medias Sox con paths **site** `/size-guides/….jpg` |
| Assets seed | `public/size-guides/magher-mujer.jpg`, `magher-hombre.jpg`, `medias-sox.jpg` |
| JPEGs cliente (root untracked) | `Tabla de talles mujer MAGHER.jpeg`, `Tabla de talles hombre MAGHER.jpeg`, `Tabla de talles MEDIAS SOX.jpeg` (+ `(1)`) — **copiar a `public/size-guides/` si hace falta refresh**, no `git add` dumps sueltos en root |
| Contracts | `docs/contracts/procedure-map.md` § admin size guides |
| Pitfalls skill | Activate: admin JWT stale → UNAUTHORIZED; cloud sin bucket → upload falla; smoke **:3000** |

Flujo upload admin (código actual):

1. `createSizeGuideUploadUrl({ fileName, contentType })` → signed PUT + `path`
2. `fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file })`
3. `updateSizeGuide({ id, storagePath: up.path })`

---

## 2) Objetivo de producto (acceptance)

### A) Storefront PDP (estilo Magher)

1. En `/p/[slug]`, sección **Talle** (chips de size):
   - Si el producto tiene `size_guide` con URL resoluble: mostrar enlace claro **debajo o al lado del label Talle** (como Magher).
   - Copy preferido del humano/ref: **“Tabla de talles”** (puede quedar “Guía de talles” como sinónimo solo si el humano lo pide; default = **Tabla de talles**).
   - Tap/click → sheet/modal con la **imagen completa** de la tabla (zoom/scroll OK en mobile), título = nombre de la guía, cerrar con X / backdrop / “Entendido” / Escape (ya hay sheet).
2. Si **no** hay guía asignada o no hay imagen: **no** mostrar el link (o mostrar disabled con copy “Sin tabla” — preferir **ocultar** como hoy).
3. Producto seed `calza-performance` (u otro publicado) debe poder demostrar el flujo con guía Magher mujer.

### B) Admin — subir imagen de tabla **sí o sí**

1. Ruta `/admin/guias` usable y descubrible:
   - Hoy solo se llega por link en ficha producto. **Agregar entrada de nav admin** (“Guías” o “Talles”) **o** acceso evidente desde Catálogo/Config — KISS: sumar item al `NAV` de `AdminShell` (puede pasar a 5 cols o menú “más”).
2. Flujo feliz:
   - Crear guía con nombre (ej. “Magher mujer”)
   - **Subir imagen** (JPEG/PNG/WebP, tope ~8MB ya en UI)
   - Ver **preview** thumbnail + path/url
   - Renombrar / reemplazar imagen / eliminar
3. En ficha producto: select de guía → guardar `sizeGuideId` → PDP muestra link + imagen.
4. Errores **visibles** en UI (no silent fail): UNAUTHORIZED, bucket missing, PUT 4xx, path inválido.

### C) No romper seed local

- Paths `/size-guides/…` en `public/` deben seguir resolviendo en browser sin Supabase Storage.
- Uploads nuevos van a bucket `size-guides` como object key (no site path).

---

## 3) Hipótesis rankeadas del “no te deja subir” (arreglar la causa real)

Trabajá en orden; no inventes un segundo CRUD.

1. **Admin JWT stale / sin login** → `adminProcedure` UNAUTHORIZED en `createSizeGuideUploadUrl` / `listSizeGuides`.  
   - Re-login `/admin/login` (cloud local a menudo `activate.deportiva.2025@gmail.com`).  
   - Mantener `useAdminSessionSync`. **No** abrir admin procedures sin auth.

2. **Bucket `size-guides` ausente en el Supabase que usa `.env.local`** (cloud vacío o migration no aplicada).  
   - `createSignedUploadUrl` falla con mensaje tipo bucket not found.  
   - Fix código+ops: migration ya existe; documentar/aplicar en cloud; local: `pnpm exec supabase status -o env` + `db reset` si stack local.  
   - Si policies de storage bloquean PUT con signed URL, alinear con cómo funcionan `product-images` (service role crea signed URL; PUT del browser al signed URL).

3. **PUT signed URL falla** (CORS, Content-Type, token). Comparar con upload de fotos de producto en `AdminProductImages` / mismo patrón `createImageUploadUrl` — copiar el patrón que **sí** funciona.

4. **UX engañosa**: botón “Subir imagen” deshabilitado por `busy` global, file input mal cableado, o página inalcanzable (no está en nav) → el humano cree que “no deja”.

5. **Preview roto post-upload**: `storage_path` guardado OK pero `resolveSizeGuideUrl` / `NEXT_PUBLIC_SUPABASE_URL` mal → sheet “No hay imagen”.

6. **Producto sin `size_guide_id`**: upload OK pero PDP sin link — falta asignar en catálogo.

Instrumentá con Network: tRPC `createSizeGuideUploadUrl` + request PUT + `updateSizeGuide`. Pegá status codes en el reporte.

---

## 4) Trabajo esperado (mínimo, KISS)

1. `git status` / branch; crear `feat/tabla-talles-pdp-admin-upload` desde base limpia de este scope (no mezclar WIP de quienes-somos/fotos root).
2. Smoke actual:
   - PDP seed con guía
   - `/admin/guias` upload de un JPEG de prueba
3. Fix upload hasta verde (backend storage + UI error + nav discoverability).
4. PDP copy **“Tabla de talles”** + sheet imagen (ref Magher).
5. Opcional UX polish sheet: pinch/scroll, imagen nítida mobile (`object-contain`, max height).
6. Si actualizás assets desde root `Tabla de talles *.jpeg` → copiar a `public/size-guides/` con nombres seed; **no** `git add -A` de PDF/LOGO/root dumps.
7. Tests: mantener/ampliar `size-guide-path.test.ts` si tocás validación; no aflojar dominio plata/stock.
8. Verify: `pnpm lint` scoped si global inundado; `pnpm test` si env test OK; `pnpm build` si tocás tipos/routers.
9. Commit convencional (esta máquina a veces sin GPG: `--no-gpg-sign` OK). Ejemplo:
   - `fix(admin): size guide image upload + nav entry`
   - `feat(store): tabla de talles link copy on PDP`
10. PR opcional hacia la branch base / `main` según indiquen; resumen 3–5 líneas causa raíz.

**Out of scope**

- Payway/MP, buyer accounts, rediseño total PDP, CMS home
- Reescribir catálogo entero
- Commit de secretos / `.env.local`
- Reabrir T0–T13 como greenfield

---

## 5) Constraints Activate

- Leer `AGENTS.md` + contracts si tocás I/O tRPC.
- Dinero en cents; no confiar totales client.
- Admin: Bearer Supabase + `admin_profiles`.
- Código EN; copy ES-AR.
- Dirty tree frecuente (icons, PDFs, fotos root): **stage solo archivos del fix**.
- SW: si “no veo cambio”, smoke `:3000` + unregister SW en dev (`RegisterServiceWorker` ya limpia en development).

---

## 6) Definition of done

- [ ] `/admin/guias` reachable sin adivinar URL (nav o link fuerte)
- [ ] Subir JPEG de tabla → preview OK + `storage_path` persistido
- [ ] Producto con esa guía → PDP muestra **“Tabla de talles”** bajo Talle
- [ ] Click → imagen de tabla visible (no placeholder “No hay imagen…”)
- [ ] Seed `/size-guides/*.jpg` sigue andando sin bucket
- [ ] Errores de auth/storage visibles
- [ ] Reporte corto: causa raíz del upload + URLs smoke + commit SHA

---

## 7) Reporte al humano (plantilla)

```text
Branch:
SHA:
Causa raíz upload:
Fix:
Smoke PDP: http://localhost:3000/p/...
Smoke admin: http://localhost:3000/admin/guias
Notas ops cloud bucket size-guides:
```
