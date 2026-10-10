# Andreani branch (sucursal) shipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add checkout shipping method `andreani_sucursal` (Andreani to branch) with the same fee as home delivery, free-text branch address, and admin `enviado` flow.

**Architecture:** Extend the existing `shipping_method` enum and domain types. Pricing already treats non-`pickup` as Andreani fee — keep that. Address validation and status transitions get explicit branch rules. tRPC Zod + storefront checkout gain a third option; admin labels/detail show branch name.

**Tech Stack:** Next.js App Router, tRPC + Zod, Supabase (Postgres enum migration), Vitest, domain in `src/server/domain/**`

**Spec:** `docs/superpowers/specs/2026-10-09-andreani-branch-shipping-design.md`

**Commits:** Prefer GPG-signed. Agents without TTY: stage files and print `git commit -S -m "…"` for the human — do not run unsigned commits.

---

## File map

| File | Role |
|------|------|
| `supabase/migrations/20261010120000_andreani_sucursal_shipping.sql` | Add enum value |
| `src/server/db/types.ts` | Enum in generated types |
| `src/server/domain/pricing/calculate-totals.ts` | `ShippingMethod` union |
| `src/server/domain/pricing/calculate-totals.test.ts` | Branch fee + cash reject |
| `src/server/domain/checkout/address.ts` | Branch address validation |
| `src/server/domain/checkout/address.test.ts` | **Create** unit tests |
| `src/server/domain/orders/status.ts` | `enviado` for branch |
| `src/server/domain/orders/status.test.ts` | Branch transitions |
| `src/server/domain/orders/transitions.ts` | `OrderRow.shipping_method` type |
| `src/server/trpc/routers/checkout.ts` | Zod enum + refine + address schema |
| `src/server/domain/checkout/place-order.test.ts` | Integration: branch address required |
| `src/lib/admin/auth.ts` + `auth-labels.test.ts` | Labels |
| `src/components/store/order-timeline.tsx` + test | Type union only (fulfillment already non-pickup → Enviado) |
| `src/app/checkout/page.tsx` | Third radio + branch form |
| `src/app/admin/pedidos/[id]/page.tsx` | Branch in ctx, address display, flow hint |
| `docs/contracts/domain-invariants.md` | Totals, address, status |
| `docs/contracts/procedure-map.md` | quote/placeOrder |
| `docs/contracts/backend-for-frontend.md` | Branch example |

No change needed to `estimate-shipping.ts` (same fee via `andreani`); PDP estimate stays one Andreani line.

---

### Task 1: DB enum + TypeScript types

**Files:**
- Create: `supabase/migrations/20261010120000_andreani_sucursal_shipping.sql`
- Modify: `src/server/db/types.ts` (two `shipping_method` occurrences)

- [ ] **Step 1: Add migration**

```sql
-- Andreani to branch/sucursal (same fee rules as home; distinct method for admin/UI)
alter type public.shipping_method add value if not exists 'andreani_sucursal';
```

- [ ] **Step 2: Update `src/server/db/types.ts`**

In `Enums` (around line 271) change:

```ts
"shipping_method": "pickup"|"andreani"|"andreani_sucursal"
```

In `Constants` public Enums array (around line 391):

```ts
"shipping_method": ["pickup", "andreani", "andreani_sucursal"]
```

- [ ] **Step 3: Apply migration locally (if Supabase is running)**

Run: `pnpm exec supabase db reset`  
(or `pnpm exec supabase migration up` if you prefer not to wipe data)

Expected: migration applies; enum accepts `andreani_sucursal`.

If Docker/Supabase is not available in this session, still land the migration file + types; integration tests that hit DB will need reset before run.

- [ ] **Step 4: Commit (human signs)**

```bash
git add supabase/migrations/20261010120000_andreani_sucursal_shipping.sql src/server/db/types.ts
git commit -S -m "feat(db): add andreani_sucursal shipping_method enum value"
```

---

### Task 2: Pricing type + tests (TDD)

**Files:**
- Modify: `src/server/domain/pricing/calculate-totals.test.ts`
- Modify: `src/server/domain/pricing/calculate-totals.ts`

- [ ] **Step 1: Write failing tests**

Append to `calculate-totals.test.ts`:

```ts
  it("andreani_sucursal: same fee as andreani under threshold", () => {
    const home = calculateTotals({
      lines: [{ unitPriceCents: 1_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    const branch = calculateTotals({
      lines: [{ unitPriceCents: 1_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani_sucursal",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(branch.shippingCents).toBe(home.shippingCents);
    expect(branch.shippingCents).toBe(450_000);
    expect(branch.totalCents).toBe(home.totalCents);
  });

  it("andreani_sucursal: free shipping when post-discount base >= threshold", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 10_000_000, qty: 1 }],
      paymentMethod: "transfer",
      shippingMethod: "andreani_sucursal",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.shippingCents).toBe(0);
  });

  it("rejects cash + andreani_sucursal", () => {
    expect(() =>
      calculateTotals({
        lines: [{ unitPriceCents: 100, qty: 1 }],
        paymentMethod: "cash",
        shippingMethod: "andreani_sucursal",
        paymentDiscountBps: 1000,
        andreaniFeeCents: 450_000,
        freeShippingThresholdCents: 8_000_000,
      }),
    ).toThrow(DomainError);
  });
```

- [ ] **Step 2: Run tests — expect type/compile failure or fail if union not updated**

Run: `pnpm test src/server/domain/pricing/calculate-totals.test.ts`

Expected: FAIL (TypeScript: `"andreani_sucursal"` not in `ShippingMethod`) until Step 3.

- [ ] **Step 3: Extend type only**

In `calculate-totals.ts`:

```ts
export type ShippingMethod = "pickup" | "andreani" | "andreani_sucursal";
```

No logic change required: existing `shippingMethod !== "pickup"` already applies fee; cash check already requires pickup.

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test src/server/domain/pricing/calculate-totals.test.ts`

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/pricing/calculate-totals.ts src/server/domain/pricing/calculate-totals.test.ts
git commit -S -m "feat(pricing): support andreani_sucursal shipping method"
```

---

### Task 3: Address validation (TDD)

**Files:**
- Create: `src/server/domain/checkout/address.test.ts`
- Modify: `src/server/domain/checkout/address.ts`

- [ ] **Step 1: Write failing tests**

Create `src/server/domain/checkout/address.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { assertShippingAddress } from "./address";
import { DomainError } from "@/server/domain/errors";

describe("assertShippingAddress", () => {
  it("skips pickup", () => {
    expect(() => assertShippingAddress("pickup", null)).not.toThrow();
  });

  it("requires home fields for andreani", () => {
    expect(() => assertShippingAddress("andreani", null)).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani", { line1: "x", city: "y", postalCode: "" }),
    ).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani", {
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).not.toThrow();
  });

  it("requires branchName + home fields for andreani_sucursal", () => {
    expect(() => assertShippingAddress("andreani_sucursal", null)).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani_sucursal", {
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).toThrow(DomainError);
    expect(() =>
      assertShippingAddress("andreani_sucursal", {
        branchName: "Andreani Centro",
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).not.toThrow();
  });

  it("does not require branchName for home andreani", () => {
    expect(() =>
      assertShippingAddress("andreani", {
        line1: "Calle 1",
        city: "La Plata",
        postalCode: "1900",
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL on branch cases**

Run: `pnpm test src/server/domain/checkout/address.test.ts`

Expected: FAIL (branch currently skipped because only `andreani` is checked).

- [ ] **Step 3: Implement**

Replace `address.ts` with:

```ts
import { DomainError } from "@/server/domain/errors";
import type { ShippingMethod } from "@/server/domain/pricing/calculate-totals";

const REQUIRED_BASE_KEYS = ["line1", "city", "postalCode"] as const;
const REQUIRED_BRANCH_KEYS = ["branchName", ...REQUIRED_BASE_KEYS] as const;

function assertRequiredStringFields(
  shippingAddress: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  for (const key of keys) {
    const value = shippingAddress[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new DomainError(
        "VALIDATION_ERROR",
        `Shipping address field "${key}" is required for ${label}`,
      );
    }
  }
}

export function assertShippingAddress(
  shippingMethod: ShippingMethod,
  shippingAddress: Record<string, unknown> | null | undefined,
): void {
  if (shippingMethod === "pickup") return;

  if (shippingMethod !== "andreani" && shippingMethod !== "andreani_sucursal") {
    return;
  }

  const label =
    shippingMethod === "andreani_sucursal" ? "Andreani sucursal" : "Andreani";

  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw new DomainError(
      "VALIDATION_ERROR",
      `Shipping address is required for ${label}`,
    );
  }

  if (shippingMethod === "andreani_sucursal") {
    assertRequiredStringFields(shippingAddress, REQUIRED_BRANCH_KEYS, label);
    return;
  }

  assertRequiredStringFields(shippingAddress, REQUIRED_BASE_KEYS, label);
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test src/server/domain/checkout/address.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/checkout/address.ts src/server/domain/checkout/address.test.ts
git commit -S -m "feat(checkout): validate andreani_sucursal branch address"
```

---

### Task 4: Status transitions (TDD)

**Files:**
- Modify: `src/server/domain/orders/status.test.ts`
- Modify: `src/server/domain/orders/status.ts`
- Modify: `src/server/domain/orders/transitions.ts` (type only)

- [ ] **Step 1: Write failing tests**

Append to `status.test.ts` inside `describe("assertTransition")`:

```ts
  it("enviado allows andreani_sucursal", () => {
    expect(() =>
      assertTransition("preparando", "enviado", { shippingMethod: "andreani_sucursal" }),
    ).not.toThrow();
  });

  it("listo_retiro rejects andreani_sucursal", () => {
    expect(() =>
      assertTransition("preparando", "listo_retiro", {
        shippingMethod: "andreani_sucursal",
      }),
    ).toThrow(DomainError);
  });
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test src/server/domain/orders/status.test.ts`

Expected: FAIL (`enviado` only allows exact `"andreani"`).

- [ ] **Step 3: Implement status.ts**

```ts
export type TransitionCtx = {
  shippingMethod?: "pickup" | "andreani" | "andreani_sucursal";
};

// inside case "preparando":
if (to === "listo_retiro") return ctx?.shippingMethod === "pickup";
if (to === "enviado")
  return (
    ctx?.shippingMethod === "andreani" ||
    ctx?.shippingMethod === "andreani_sucursal"
  );
```

- [ ] **Step 4: Update transitions.ts OrderRow type**

```ts
shipping_method: "pickup" | "andreani" | "andreani_sucursal";
```

(Or import `ShippingMethod` from calculate-totals if preferred — keep consistent with file style.)

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm test src/server/domain/orders/status.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/server/domain/orders/status.ts src/server/domain/orders/status.test.ts src/server/domain/orders/transitions.ts
git commit -S -m "feat(orders): allow enviado transition for andreani_sucursal"
```

---

### Task 5: tRPC checkout schema

**Files:**
- Modify: `src/server/trpc/routers/checkout.ts`
- Modify: `src/server/domain/checkout/place-order.test.ts` (optional extra case)

- [ ] **Step 1: Update Zod schemas and refine**

```ts
const shippingMethodSchema = z.enum(["pickup", "andreani", "andreani_sucursal"]);

const shippingAddressSchema = z
  .object({
    line1: z.string().min(1),
    city: z.string().min(1),
    postalCode: z.string().min(1),
    branchName: z.string().min(1).optional(),
    line2: z.string().optional(),
    province: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

function refineCheckoutCombo(
  val: {
    shippingMethod: "pickup" | "andreani" | "andreani_sucursal";
    paymentMethod: "payway" | "transfer" | "cash";
    shippingAddress?: { branchName?: string } | null | unknown;
  },
  ctx: z.RefinementCtx,
) {
  const needsAddress =
    val.shippingMethod === "andreani" || val.shippingMethod === "andreani_sucursal";

  if (needsAddress && !val.shippingAddress) {
    ctx.addIssue({
      code: "custom",
      message: `shippingAddress is required for ${val.shippingMethod}`,
      path: ["shippingAddress"],
    });
  }

  if (val.shippingMethod === "andreani_sucursal" && val.shippingAddress) {
    const addr = val.shippingAddress as { branchName?: unknown };
    if (typeof addr.branchName !== "string" || !addr.branchName.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "branchName is required for andreani_sucursal",
        path: ["shippingAddress", "branchName"],
      });
    }
  }

  if (val.paymentMethod === "cash" && val.shippingMethod !== "pickup") {
    ctx.addIssue({
      code: "custom",
      message: "Cash payment requires pickup shipping",
      path: ["paymentMethod"],
    });
  }
}
```

Domain `assertShippingAddress` remains the source of truth after Zod; router refine is defense-in-depth.

- [ ] **Step 2: Add place-order integration test**

In `place-order.test.ts`, after the existing andreani address test:

```ts
  it("requires branch address for andreani_sucursal", async () => {
    const db = createServiceClient();
    await expect(
      placeOrder(
        {
          customerName: "Branch",
          phone: "+54933333334",
          email: "branch@example.com",
          shippingMethod: "andreani_sucursal",
          paymentMethod: "payway",
          installments: 1,
          shippingAddress: {
            line1: "Calle 1",
            city: "La Plata",
            postalCode: "1900",
          },
          lines: [{ variantId: VARIANT_M, qty: 1 }],
        },
        { db, ...depsBase },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
```

Optional happy-path (if DB migrated): place with full branch address and assert `order.shipping_method === "andreani_sucursal"`. Skip if local DB not reset yet; Task 1 migration must be applied before this passes against Supabase.

- [ ] **Step 3: Run unit tests (no DB)**

Run: `pnpm test src/server/domain/checkout/address.test.ts src/server/domain/pricing/calculate-totals.test.ts src/server/domain/orders/status.test.ts`

- [ ] **Step 4: Run place-order tests if Supabase up**

Run: `pnpm test src/server/domain/checkout/place-order.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc/routers/checkout.ts src/server/domain/checkout/place-order.test.ts
git commit -S -m "feat(api): accept andreani_sucursal on checkout quote and placeOrder"
```

---

### Task 6: Labels + order timeline types

**Files:**
- Modify: `src/lib/admin/auth.ts`
- Modify: `src/lib/admin/auth-labels.test.ts`
- Modify: `src/components/store/order-timeline.tsx`
- Modify: `src/components/store/order-timeline.test.ts`

- [ ] **Step 1: Labels**

In `auth.ts`:

```ts
export const SHIPPING_METHOD_LABEL: Record<string, string> = {
  pickup: "Retiro en local",
  andreani: "Andreani domicilio",
  andreani_sucursal: "Andreani sucursal",
};
```

(Updating `andreani` label from `"Andreani"` → `"Andreani domicilio"` is intentional for clarity.)

In `auth-labels.test.ts`:

```ts
expect(shippingMethodLabel("pickup")).toBe("Retiro en local");
expect(shippingMethodLabel("andreani")).toBe("Andreani domicilio");
expect(shippingMethodLabel("andreani_sucursal")).toBe("Andreani sucursal");
```

- [ ] **Step 2: Timeline type + test**

In `order-timeline.tsx`:

```ts
export type OrderTimelineShipping = "pickup" | "andreani" | "andreani_sucursal" | string;
```

`fulfillmentLabel` already returns `"Enviado"` for non-pickup — no logic change.

In `order-timeline.test.ts` add:

```ts
  it("uses enviado label for andreani_sucursal fulfillment", () => {
    const steps = buildOrderTimelineSteps("enviado", "andreani_sucursal");
    expect(steps[3]?.label).toBe("Enviado");
    expect(steps[3]?.state).toBe("current");
  });
```

- [ ] **Step 3: Run**

Run: `pnpm test src/lib/admin/auth-labels.test.ts src/components/store/order-timeline.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/auth.ts src/lib/admin/auth-labels.test.ts src/components/store/order-timeline.tsx src/components/store/order-timeline.test.ts
git commit -S -m "feat(ui): labels for Andreani sucursal shipping"
```

---

### Task 7: Storefront checkout UI

**Files:**
- Modify: `src/app/checkout/page.tsx`

- [ ] **Step 1: Extend types and state**

```ts
type Ship = "pickup" | "andreani" | "andreani_sucursal";

type FieldErrors = Partial<
  Record<
    | "customerName"
    | "phone"
    | "email"
    | "line1"
    | "city"
    | "postalCode"
    | "branchName"
    | "photon",
    string
  >
>;
```

Add state:

```ts
const [branchName, setBranchName] = useState("");
```

- [ ] **Step 2: shippingAddress + readiness**

```ts
const shippingAddress =
  shippingMethod === "andreani"
    ? {
        line1,
        city,
        postalCode,
        line2: line2 || undefined,
        province: province || undefined,
      }
    : shippingMethod === "andreani_sucursal"
      ? {
          branchName,
          line1,
          city,
          postalCode,
          line2: line2 || undefined,
          province: province || undefined,
        }
      : null;

const addressReady =
  shippingMethod === "pickup" ||
  (shippingMethod === "andreani" &&
    line1.trim().length > 0 &&
    city.trim().length > 0 &&
    postalCode.trim().length > 0) ||
  (shippingMethod === "andreani_sucursal" &&
    branchName.trim().length > 0 &&
    line1.trim().length > 0 &&
    city.trim().length > 0 &&
    postalCode.trim().length > 0);
```

Rename usages of `andreaniReady` → `addressReady` (quote effect deps, button disabled, summary copy).

Include `branchName` in the quote `useEffect` dependency list.

- [ ] **Step 3: Free-shipping banner**

Treat both paid ship methods:

```ts
const isAndreaniShip =
  shippingMethod === "andreani" || shippingMethod === "andreani_sucursal";

const needsMoreForFree =
  isAndreaniShip &&
  freeThreshold > 0 &&
  quoteBaseAfterDiscount != null &&
  quoteBaseAfterDiscount < freeThreshold &&
  (quote?.shippingCents ?? 0) > 0
    ? freeThreshold - quoteBaseAfterDiscount
    : 0;
```

Same for the “llegaste al umbral” banner: `isAndreaniShip && quote && quote.shippingCents === 0 && …`

- [ ] **Step 4: validate()**

```ts
if (shippingMethod === "andreani") {
  // existing photon + line1/city/postalCode checks
}
if (shippingMethod === "andreani_sucursal") {
  if (!branchName.trim()) next.branchName = "Nombre de sucursal requerido";
  if (!line1.trim()) next.line1 = "Dirección de sucursal requerida";
  if (!city.trim()) next.city = "Ciudad requerida";
  if (!postalCode.trim()) next.postalCode = "Código postal requerido";
}
```

- [ ] **Step 5: Envío section UI**

After the domicilio radio, add:

```tsx
<label className="flex min-h-12 items-center gap-3">
  <input
    type="radio"
    name="ship"
    checked={shippingMethod === "andreani_sucursal"}
    onChange={() => selectShipping("andreani_sucursal")}
  />
  Andreani a sucursal
</label>
```

Keep domicilio form when `shippingMethod === "andreani"` (Photon + fields).

When `shippingMethod === "andreani_sucursal"`, show free-text block (no Photon):

```tsx
{shippingMethod === "andreani_sucursal" ? (
  <div className="mt-2 space-y-3 border-t border-border pt-3">
    <Field
      id="branchName"
      label="Nombre de la sucursal Andreani"
      value={branchName}
      error={fieldErrors.branchName}
      onChange={setBranchName}
    />
    <Field
      id="line1"
      label="Dirección de la sucursal"
      value={line1}
      error={fieldErrors.line1}
      onChange={setLine1}
    />
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id="city" label="Ciudad" value={city} error={fieldErrors.city} onChange={setCity} />
      <Field
        id="cp"
        label="Código postal"
        value={postalCode}
        error={fieldErrors.postalCode}
        onChange={setPostalCode}
      />
    </div>
    <Field id="province" label="Provincia (opcional)" value={province} onChange={setProvince} />
    <p className="text-xs text-muted">
      Ingresá los datos de la sucursal Andreani donde querés retirar. El costo es el mismo que
      envío a domicilio.
    </p>
  </div>
) : null}
```

- [ ] **Step 6: Payment helper copy + summary**

Update cash helper text so it is not domicilio-only:

```tsx
Efectivo solo con retiro en local. Con Andreani (domicilio o sucursal) podés pagar por
transferencia o tarjeta.
```

Summary shipping line:

```tsx
<span>
  Envío{" "}
  {shippingMethod === "pickup"
    ? "(retiro)"
    : shippingMethod === "andreani_sucursal"
      ? "(Andreani sucursal)"
      : "(Andreani)"}
</span>
```

Waiting copy when branch incomplete: `"Completá sucursal, dirección, ciudad y CP para cotizar el envío."`

- [ ] **Step 7: Manual smoke (optional)**

`pnpm dev` → checkout → select sucursal → fill fields → quote shows same fee as domicilio.

- [ ] **Step 8: Commit**

```bash
git add src/app/checkout/page.tsx
git commit -S -m "feat(checkout): Andreani sucursal option with free-text branch form"
```

---

### Task 8: Admin order detail

**Files:**
- Modify: `src/app/admin/pedidos/[id]/page.tsx`

- [ ] **Step 1: shipping method ctx**

```ts
const rawShip = order?.shipping_method;
const shippingMethod =
  rawShip === "andreani" ||
  rawShip === "andreani_sucursal" ||
  rawShip === "pickup"
    ? rawShip
    : undefined;

const ctx =
  shippingMethod === "pickup" ||
  shippingMethod === "andreani" ||
  shippingMethod === "andreani_sucursal"
    ? ({ shippingMethod } as const)
    : undefined;
```

- [ ] **Step 2: Address display include branchName**

```ts
const address = useMemo(() => {
  const a = order?.shipping_address as
    | {
        branchName?: string;
        line1?: string;
        line2?: string;
        city?: string;
        postalCode?: string;
        province?: string;
      }
    | null
    | undefined;
  if (!a) return null;
  return [a.branchName, a.line1, a.line2, a.city, a.postalCode, a.province]
    .filter(Boolean)
    .join(", ");
}, [order?.shipping_address]);
```

- [ ] **Step 3: flowHint**

```ts
const flowHint =
  shippingMethod === "pickup"
    ? "Flujo retiro: pago → preparando → listo retiro → entregado"
    : shippingMethod === "andreani" || shippingMethod === "andreani_sucursal"
      ? "Flujo envío: pago → preparando → enviado → entregado"
      : null;
```

`shippingMethodLabel` already covers the new enum after Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/pedidos/[id]/page.tsx
git commit -S -m "feat(admin): show andreani_sucursal on order detail and transitions"
```

---

### Task 9: Contracts docs

**Files:**
- Modify: `docs/contracts/domain-invariants.md`
- Modify: `docs/contracts/procedure-map.md`
- Modify: `docs/contracts/backend-for-frontend.md`

- [ ] **Step 1: domain-invariants.md**

Totals shipping:

```markdown
3. **shippingCents**:
   - `pickup` → `0`
   - `andreani` | `andreani_sucursal` → `0` if `(subtotalCents - discountCents) >= free_shipping_threshold_cents`, else `andreani_fee_cents`
```

Payment combos: transfer/payway work with **pickup**, **andreani**, or **andreani_sucursal**.

Shipping address:

```markdown
- `andreani` requires `shippingAddress` with at least `line1`, `city`, `postalCode`.
- `andreani_sucursal` requires `shippingAddress` with at least `branchName`, `line1`, `city`, `postalCode`.
- `pickup` does not require address.
```

Status table:

```markdown
| `preparando` | `enviado` | only if `shipping_method` is `andreani` or `andreani_sucursal` |
```

- [ ] **Step 2: procedure-map.md**

Update quote/placeOrder Input lines to include `"andreani_sucursal"` and note branch address fields + cash requires pickup.

- [ ] **Step 3: backend-for-frontend.md**

Add example:

```ts
const order = await client.checkout.placeOrder.mutate({
  lines: [{ variantId: "...", qty: 1 }],
  shippingMethod: "andreani_sucursal",
  paymentMethod: "transfer",
  customerName: "Ana",
  phone: "+54...",
  email: "ana@example.com",
  shippingAddress: {
    branchName: "Andreani La Plata Centro",
    line1: "Calle 7 1234",
    city: "La Plata",
    postalCode: "1900",
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add docs/contracts/domain-invariants.md docs/contracts/procedure-map.md docs/contracts/backend-for-frontend.md
git commit -S -m "docs(contracts): andreani_sucursal shipping method"
```

---

### Task 10: Full verification

- [ ] **Step 1: Lint**

Run: `pnpm lint`

Expected: no new errors in touched files.

- [ ] **Step 2: Unit tests**

Run: `pnpm test`

Expected: PASS (integration tests need local Supabase + migration applied).

- [ ] **Step 3: Typecheck / build if time allows**

Run: `pnpm build`

Expected: PASS.

- [ ] **Step 4: If anything failed, fix in place — do not claim done without green tests**

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Enum `andreani_sucursal` | 1 |
| Same fee / free threshold | 2 (logic already non-pickup) |
| Free-text branch address + `branchName` | 3, 5, 7 |
| Cash pickup-only | 2, 5 |
| Status `enviado` not `listo_retiro` | 4, 8 |
| tRPC quote/placeOrder | 5 |
| Checkout 3 options | 7 |
| Admin labels + detail | 6, 8 |
| Contracts | 9 |
| Tests | 2–6, 10 |
| No Andreani API / separate fee | out of scope (not in plan) |

## Placeholder / consistency self-review

- Method string is always `andreani_sucursal` (Spanish product term, matches design).
- Address field always `branchName` (camelCase JSON).
- Commit steps use `git commit -S`; agents print command if no TTY.
