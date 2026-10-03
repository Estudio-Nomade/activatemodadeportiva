# PROMPT — feat: hover de product card estilo Nike (scale / “sale hacia afuera”)

**Modo:** implementar UI + smoke browser (no investigate-only).  
**Idioma respuesta al humano:** español, corto, con URL de smoke.  
**Código/comentarios en el repo:** inglés (AGENTS.md). Copy UI: ES-AR.

---

## 0) Kickoff

Repo absoluto:

```text
/home/marti/Documentos/Estudio Nomade/activatemodadeportiva
```

Package manager: **pnpm**. Stack: Next.js App Router + Tailwind + tokens Pencil.

Branch base: checkout principal que sirve **http://localhost:3000** (no worktree `:3001`).

Nueva branch:

```text
feat/product-card-hover-lift
```

Síntoma del humano (palabras):

> Cuando el usuario pase el mouse por arriba de cada producto, que se vea más grande o haga un movimiento hacia afuera. Nike tiene eso en sus productos de ropa.

Traducción de producto (lo que quiere ver):

- En grillas de catálogo (home/categoría/buscar/productos), **hover desktop** sobre la card:
  - la foto (o la card) **crece un poco** y/o **se eleva** (lift + scale),
  - sensación de “sale hacia el usuario / hacia afuera”, no un flash brusco,
  - transición suave tipo Nike PLP (subtle, premium).
- **Mobile:** no depende de hover; touch no debe quedar “agrandado” raro. Preferir solo `@media (hover: hover)` / `group-hover` en pointer fino, o no animar en touch.

Smoke obligatorio:

- `http://localhost:3000/productos` o `/c/mujer` (o categoría con grilla)
- Desktop: hover varias cards → scale/lift visible y agradable
- Mobile viewport: sin glitch; tap sigue yendo al PDP

---

## 1) Qué ya existe (NO reinventar)

| Pieza | Path |
|-------|------|
| Card de producto | `src/components/store/product-card.tsx` |
| Imagen | `src/components/store/product-image.tsx` |
| Grillas que usan `ProductCard` | buscar usos de `ProductCard` en `src/app/**` y `src/components/**` |

**Estado actual del hover (ya hay algo débil):**

```tsx
// product-card.tsx (aprox.)
<Link href={`/p/${product.slug}`} className="group block">
  <div className="relative aspect-[3/4] overflow-hidden rounded-[12px] bg-surface-soft">
    <ProductImage
      className="h-full w-full transition duration-300 group-hover:scale-[1.02]"
      …
    />
```

`scale-[1.02]` es **casi invisible**. El humano no lo “ve”. Hay que **subir el efecto** al rango Nike-like sin romper layout ni recortar mal.

Tokens marca (no inventar colores):

- surface / surface-soft / border / text de `globals.css` / Pencil
- radius card ya `rounded-[12px]`
- tipografía DM/Montserrat+Inter según globals actuales

---

## 2) Dirección visual (Nike-like, KISS)

Objetivo: **un solo componente** (`ProductCard`) para que todas las grillas hereden el hover.

Propuesta preferida (combinar 2–3, no 10):

1. **Imagen zoom-in** dentro del frame con `overflow-hidden`:
   - `scale` hover ~ **1.04–1.08** (probar; 1.02 es insuficiente).
   - `transition-transform duration-300` o `duration-500` + `ease-out`.
2. **Lift de la card** (opcional pero “hacia afuera”):
   - en el wrapper: `transition`, hover `translate-y-[-2px]` o `[-4px]` + sombra suave (`shadow-md` / shadow con border brand, no glow neón).
   - Cuidado: no empujar vecinos de la grilla (transform no reflow; OK).
3. **Media query hover real**:
   - `@media (hover: hover) and (pointer: fine)` en CSS, **o** clases Tailwind `hover:` solo donde tenga sentido.
   - Evitar que el primer tap en mobile dispare scale y deje la card grande.
4. **Accessibility**:
   - `:focus-visible` en el `Link` con outline/ring accesible (no solo hover).
   - No reducir contraste del precio/nombre.
5. **Perf**:
   - preferir `transform` + `opacity` (GPU), no animar `width/height/top`.
   - no JS de mouse move parallax v1 (overkill).

Anti-patrones:

- No agrandar el box del grid (layout shift).
- No `scale` del **Link entero** si rompe gap de grilla de forma fea; preferí scale de **img** dentro de frame + lift sutil del bloque.
- No second image swap Nike “hover second photo” **salvo** que el producto ya traiga 2+ imágenes y sea trivial — **fuera de scope** si complica; este prompt es **scale/lift**, no carousel hover.
- No tocar admin, checkout, ni dominio cents/stock.
- No `git add -A` con PDFs/fotos root.

---

## 3) Acceptance checklist

- [ ] Desktop hover: efecto **claramente visible** (más que el 1.02 actual)
- [ ] Sensación “sale un poco hacia afuera” (scale y/o lift + sombra suave)
- [ ] Transición suave 250–500ms, no rebote exagerado
- [ ] `overflow-hidden` en frame de imagen: no se desborda feo sobre vecinos
- [ ] Mobile/touch: sin estado hover pegado; tap → `/p/[slug]` OK
- [ ] Mismo efecto en todas las grillas que usan `ProductCard`
- [ ] Sold-out badge sigue legible encima
- [ ] Smoke :3000; si “no lo veo” → wrong port / SW (dev unregister ya existe)
- [ ] Sin drive-by refactor de grillas enteras

---

## 4) Pasos de trabajo

1. `git status` / branch desde base limpia de este scope.
2. Leer `product-card.tsx` + `product-image.tsx` + un page de grilla (ej. `src/app/c/[slug]/page.tsx`, `src/app/productos/page.tsx`, `src/app/buscar/page.tsx`).
3. Subir hover en `ProductCard` (CSS/Tailwind only si alcanza).
4. Si hace falta clase en `globals.css` (p.ej. `.product-card` + `@media (hover: hover)`), mantener KISS y tokens existentes.
5. Smoke desktop + mobile viewport.
6. Verify scoped: eslint del archivo tocado; `pnpm exec tsc --noEmit` si tocás tipos (no debería). Build opcional.
7. Commit convencional, stage **solo** archivos del hover:

```text
feat(store): nike-like product card hover scale and lift
```

GPG: esta máquina a veces falla `-S` → `--no-gpg-sign` OK.

---

## 5) Constraints Activate

- Leer `AGENTS.md` si tocás contratos (no hace falta para CSS hover).
- Smoke **http://localhost:3000** only (no :3001 worktree).
- Dirty tree frecuente: no mezclar WIP quienes-somos / money / root dumps.
- Código EN; no secretos.

---

## 6) Reporte al humano

```text
Branch:
SHA:
Qué efecto quedó (scale X + lift Y + shadow):
Archivos:
Smoke grid: http://localhost:3000/…
Notas mobile:
```

---

## 7) Fuera de scope

- Hover second-image Nike (foto 2 al hover) salvo win trivial con imágenes ya cargadas
- Quick-add al carrito en hover
- Wishlist / compare
- Rediseño completo PLP
- Cambios de precio/admin money
