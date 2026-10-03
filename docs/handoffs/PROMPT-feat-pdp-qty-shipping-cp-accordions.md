# PROMPT — feat: PDP Magher-like (cantidad + envío por CP + acordeones)

**Modo:** implementar + smoke browser (no investigate-only).  
**Idioma respuesta al humano:** español, corto, con URL smoke.  
**Código/comentarios:** inglés (AGENTS.md). Copy UI: ES-AR.

---

## 0) Kickoff

Repo:

```text
/home/marti/Documentos/Estudio Nomade/activatemodadeportiva
```

pm: **pnpm**. Branch base = checkout en **http://localhost:3000** (nunca asumir `:3001`).

Nueva branch:

```text
feat/pdp-qty-shipping-cp-accordions
```

Síntoma humano:

> En los productos no se puede elegir cuántas unidades comprar. Quiero también como Magher el cálculo de envío por CP. Y abajo del producto, como Magher: descripción, composición y cuidados, métodos de pago, métodos de envío, cambios y devoluciones — solo se ven los títulos y al apretar se despliega la info.

Ref UX: https://www.magher.com.ar/ (PDP) — qty, estimator CP, acordeones.

Smoke final:

- `http://localhost:3000/p/<slug>` (seed p.ej. `calza-performance` si existe)
- Elegir qty > 1 → carrito con esa qty
- CP → mensaje de envío coherente con settings
- Acordeones abren/cierran; mobile OK con bottom CTA

---

## 1) Arquitectura actual (NO reinventar)

| Pieza | Path |
|-------|------|
| PDP | `src/app/p/[slug]/page.tsx` |
| Cart client | `src/lib/cart/store.tsx` — `addLine({…, qty?})`, `setQty`, cap `maxAvailable` |
| Meta chips PDP | `src/lib/catalog/pdp-meta.ts` — 3 líneas fijas (dto, envío, cambios); **no** son acordeones |
| Settings públicos | `trpc.settings.getPublic` — `andreani_fee_cents`, `free_shipping_threshold_cents`, `payment_discount_bps`, alias, address, WA |
| Quote servidor | `checkout.quote` + `src/server/domain/checkout/quote.ts` + `calculate-totals.ts` |
| Legales ya armados | `/envios`, `/medios-de-pago`, `/cambios-y-devoluciones` + `src/components/store/info-page.tsx` (`ShippingFeesCopy`, `TransferAliasCopy`, `PaymentDiscountLabel`, `StoreAddressBlock`, `ContactLinks`) |
| Product fields DB | `products.description` (text). **No hay** columnas `composition` / `care` hoy |
| Admin producto | description textarea en `src/app/admin/catalogo/[id]/page.tsx` y `nuevo` |
| Size guide | sheet ya en PDP; no romper |
| Money display | `formatArsCents` — no inventar totales de cobro en client salvo **preview** explícita de envío |

### Hecho crítico de dominio (envío)

**Andreani v1 NO cotiza por zona/CP.** El motor es:

```ts
// calculate-totals.ts
// pickup → shipping 0
// andreani → fee fijo andreani_fee_cents
//           salvo subtotal−descuento >= free_shipping_threshold_cents → 0
```

El CP en checkout es **dato de dirección** (requerido para andreani + Photon), **no** cambia el fee.

Por tanto el bloque “calcular envío por CP” estilo Magher en Activate debe ser **honest UX**:

1. Input CP (validar formato AR razonable, 4 dígitos / CPA `A1234BCD` light).
2. Mostrar:
   - Retiro local: **gratis** (San Manuel / `contact_address`).
   - Andreani a domicilio: **costo de referencia** = `andreani_fee_cents` formateado, y si hay threshold: “Gratis desde {threshold} (post dto transferencia)”.
3. Opcional: con el **precio unitario × qty elegida** (y dto bps) estimar si **esta compra suelta** ya alcanza envío gratis — usando la **misma fórmula** que `calculateTotals` (importar helper de dominio o duplicar **solo** la aritmética de shipping en un util de UI que llame números de settings; **preferir** reutilizar `calculateTotals` en client si el módulo no tira Node-only, o extraer pure fn ya pure en `calculate-totals.ts`).
4. Texto disclaimer corto: “El total final se confirma en el checkout. Mismo costo Andreani a todo el país en v1 (no tarifa por CP).”
5. **Prohibido:** inventar API Andreani real, tabla de zonas, o fees distintos por CP sin pedido de producto + migration.

Si el humano espera cotización real por CP: en el reporte aclarar límite v1; implementar el estimator honesto de arriba (sigue siendo útil y “se siente” Magher).

`checkout.quote` hoy exige lines + payment + shipping (+ address si andreani). Para PDP estimator **no hace falta** llamar quote con producto fake si usás settings + `calculateTotals` pure. Si preferís tRPC: quote con 1 line del variant + qty + transfer + andreani + address mínima `{ line1: "—", city: "—", postalCode: cp }` — más pesado; KISS = client pure + settings.

---

## 2) Tres entregables (un PR / una branch)

### A) Selector de cantidad en PDP

**Hoy:** `addLine(…, qty: 1)` hardcode; no hay UI de qty.

Hacer:

1. Estado `qty` (default 1) en PDP.
2. Control − / número / + (targets ≥48px), o `inputMode="numeric"`.
3. Límites: `1 … available` del variant seleccionado; al cambiar color/talle clamp qty.
4. Disabled + / − en bordes; si `available === 0` no suma.
5. CTA “Sumar al carrito” pasa `qty` real a `addLine`.
6. Feedback: si ya había línea del mismo variant, cart **suma** qty (comportamiento actual de `addLine`) — copy opcional “Agregado (xN)”.
7. No romper sticky/fixed bottom bar mobile: qty arriba del CTA o en la misma barra sin tapar safe-area.

Carrito `/carrito` ya puede `setQty` — no es el foco, pero smoke: qty 3 desde PDP → badge/count 3.

### B) Estimador de envío por CP (Magher-like, honesto)

Bloque bajo talle/qty (antes o después de CTA según layout Magher; mobile: no pelear con fixed CTA).

UI sugerida:

- Título: **Calcular envío** / **¿Cuánto sale el envío?**
- Input **Código postal** + botón **Calcular** (o debounce on blur/enter).
- Resultado:
  - CP inválido → error claro.
  - CP ok → lista:
    - Retiro en local: Gratis (+ ciudad si settings).
    - Andreani: `$ X` o **Gratis** si la estimación con (unitPrice×qty, transfer dto) ≥ threshold; si no alcanza, mostrar faltante opcional como checkout.
- Link texto a `/envios` para detalle.
- Reusar `formatArsCents`, settings query ya en PDP.

No copiar Photon address completa al PDP (overkill); solo CP.

### C) Acordeones estilo Magher debajo del bloque compra

Títulos visibles; click expande contenido (uno abierto a la vez **o** multi-open — Magher suele multi o single; preferí **single-open** KISS accesible).

Secciones pedidas:

| Título UI | Contenido fuente |
|-----------|------------------|
| Descripción | `product.description` (si vacío: “Sin descripción.” o ocultar sección) |
| Composición y cuidados | **Gap de datos:** no hay campos DB. Opciones en orden de preferencia: (1) **v1 copy estático genérico** deportivo + nota “consultá el rótulo de la prenda” + si description trae líneas se puede mostrar igual; (2) **opcional admin**: extender `description` con convención markdown simple `---` / headings (frágil); (3) **migration** `composition_text` + `care_text` + admin fields + catalog getProduct — **solo si** queda chico y el humano lo necesita sí o sí. Default del prompt: **(1) estático razonable ES-AR** + description no se duplica si ya está en primer acordeón. |
| Métodos de pago | Reusar lógica/copy de `/medios-de-pago` vía componentes de `info-page.tsx` (dto %, transfer, cash=pickup only, sin tarjetas v1) + link “Ver más” → `/medios-de-pago` |
| Métodos de envío | Reusar `ShippingFeesCopy` + retiro local + link `/envios` |
| Cambios y devoluciones | Copy de `/cambios-y-devoluciones` (WA/local, no online) + link |

Implementación UI:

- Componente nuevo p.ej. `src/components/store/pdp-accordion.tsx` (button + `aria-expanded` + panel).
- No depender de lib accordion pesada si un `<details>`/`button` KISS alcanza; animación altura suave opcional.
- Quitar o reducir la lista `metaChips` suelta si queda redundante con acordeones (evitar triple info). Preferí: chips cortos arriba **o** acordeones abajo, no ambos verbosos — default: **mantener 1 línea promo** arriba opcional y mover detalle a acordeones.

Desktop: acordeones full width bajo la columna de info o full-bleed bajo el grid 2 col (como muchas PLP: stack completo under). Preferí **debajo de toda la fila** (`md:col-span-2`) para no achicar la columna compra — mirar Magher y elegir; si sticky gallery, acordeones en col derecha también OK. KISS: col derecha bajo CTA en desktop + full width mobile.

---

## 3) Acceptance

### Cantidad
- [ ] Se ve control qty en PDP
- [ ] Respetá `available`; no deja pedir de más
- [ ] `addLine` con qty N; carrito refleja N
- [ ] Cambio de variant reclampa qty

### Envío CP
- [ ] Input CP + calcular
- [ ] Muestra retiro gratis + Andreani fee/threshold desde settings
- [ ] No inventa tarifas por zona
- [ ] Disclaimer checkout = total final
- [ ] Estimación free-shipping si aplica con precio×qty + dto (misma matemática dominio)

### Acordeones
- [ ] 5 títulos (u omitir descripción vacía)
- [ ] Expand/collapse teclado + click; `aria-expanded`
- [ ] Pago/envío/cambios alineados a páginas legales / settings vivos (no hardcode fee viejo)
- [ ] Mobile scrolleable; CTA fixed no tapa el primer acordeón entero de forma imposible

### General
- [ ] No romper size guide, zoom, sold-out, OOS combo
- [ ] No recalcular **total de cobro** inventado distinto del servidor en checkout
- [ ] Stage solo archivos del feature; no `git add -A` root dumps
- [ ] Smoke `:3000`

---

## 4) Pasos de trabajo

1. Branch `feat/pdp-qty-shipping-cp-accordions` desde base limpia de este scope.
2. Leer PDP + cart + `calculate-totals.ts` + `info-page.tsx` + legales.
3. Implementar qty → wire `addLine`.
4. Bloque shipping CP (settings + pure totals).
5. Acordeones + cleanup meta chips redundantes.
6. (Opcional corto) tests unit del parse CP + “free shipping reached?” helper.
7. Verify: scoped eslint/tsc; `pnpm exec vitest run` en helpers nuevos; build si tocás tipos product.
8. Commit(s) convencionales, ej.:

```text
feat(store): pdp quantity selector
feat(store): pdp shipping estimate by postal code
feat(store): pdp magher-style info accordions
```

o un solo commit si el peer prefiere atómico. GPG: `--no-gpg-sign` OK en esta máquina.

---

## 5) Out of scope

- Cotizador Andreani API / tarifas reales por CP o peso
- Payway / MP / cuotas
- Campos composition/care en DB **salvo** decisión explícita mínima
- Rediseño total gallery / hover cards (otro prompt)
- Admin money cents (otro track)
- Cambiar reglas cash⇒pickup o money domain

---

## 6) Constraints Activate

- `AGENTS.md`: server recomputa cobro; UI solo display/estimate labeled.
- Stock: `available` no `stock_on_hand` crudo.
- Photon: si lo tocás, **no** `lang=es`.
- SW/port: smoke solo `:3000`.

---

## 7) Reporte al humano

```text
Branch:
SHA:
Qty: cómo funciona + smoke
Envío CP: qué muestra (fee/threshold) + disclaimer
Acordeones: lista + fuente de copy
¿Composition/care estático o migration?
Smoke: http://localhost:3000/p/…
Límite v1 envío (no zona):
```
