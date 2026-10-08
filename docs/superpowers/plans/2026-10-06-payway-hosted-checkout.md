# Payway Hosted Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace transfer/cash checkout with Payway AR hosted payment links, auto-confirm via webhook, configurable installments, env-based credentials.

**Architecture:** Thin tRPC + domain rules; new `PaywayPort` adapter for HTTP; `placeOrder` commits order then creates link; `POST /api/payway/notifications` verifies payment via Payway API then reuses `confirmPayment` / `confirm_payment_tx`. UI checkout redirects to `payment_link`.

**Tech Stack:** Next.js App Router, tRPC, Supabase (migrations + RPCs), Vitest, Payway REST (fetch adapter; optional `sdk-node-payway` only if it fits Node 18+ without friction — prefer thin `fetch` adapter to avoid legacy SDK).

**Spec:** `docs/superpowers/specs/2026-10-06-payway-hosted-checkout-design.md`

---

## File map

| Path | Role |
|------|------|
| `supabase/migrations/20261006120000_payway_checkout.sql` | enum `payway`, order columns, settings installments, `place_order_tx` write installments + payway fields |
| `src/server/payments/payway/port.ts` | `PaywayPort` types |
| `src/server/payments/payway/config.ts` | read/validate env |
| `src/server/payments/payway/amount.ts` | cents ↔ Payway amount unit |
| `src/server/payments/payway/http-adapter.ts` | createCheckoutLink + getPayment |
| `src/server/payments/payway/parse-notification.ts` | webhook body → siteTransactionId / paymentId / status |
| `src/server/domain/payments/handle-payway-notification.ts` | idempotent confirm |
| `src/server/domain/checkout/create-payment-link.ts` | retry link for pending payway order |
| `src/server/domain/checkout/place-order.ts` | payway + installments + link after commit |
| `src/server/domain/pricing/calculate-totals.ts` | `payway`, discount 0 |
| `src/server/domain/errors.ts` | new codes |
| `src/server/trpc/context.ts` | inject `payway: PaywayPort` |
| `src/server/trpc/routers/checkout.ts` | schemas + createPaymentLink |
| `src/server/trpc/routers/settings.ts` | expose `payway_installments` |
| `src/server/trpc/routers/orders.ts` | select new order fields |
| `src/app/api/payway/notifications/route.ts` | webhook |
| `src/app/checkout/page.tsx` | payway-only UI |
| `src/app/pedido/page.tsx` | pay CTA, hide transfer proofs for payway |
| copy pages / promo | remove 10% transfer messaging |
| contracts + AGENTS + `.env.example` | docs |

---

### Task 1: Domain errors + totals for payway

**Files:**
- Modify: `src/server/domain/errors.ts`
- Modify: `src/server/domain/pricing/calculate-totals.ts`
- Modify: `src/server/domain/pricing/calculate-totals.test.ts`

- [ ] **Step 1: Write failing totals tests for payway**

Replace/extend `calculate-totals.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateTotals } from "./calculate-totals";
import { DomainError } from "../errors";

describe("calculateTotals", () => {
  it("payway: no payment discount; andreani fee under threshold", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 1_000_000, qty: 1 }],
      paymentMethod: "payway",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000, // ignored for payway
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.subtotalCents).toBe(1_000_000);
    expect(result.discountCents).toBe(0);
    expect(result.shippingCents).toBe(450_000);
    expect(result.totalCents).toBe(1_450_000);
  });

  it("payway: free andreani when subtotal >= threshold (no discount)", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 8_000_000, qty: 1 }],
      paymentMethod: "payway",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.discountCents).toBe(0);
    expect(result.shippingCents).toBe(0);
    expect(result.totalCents).toBe(8_000_000);
  });

  it("payway + pickup: shipping 0", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 500_000, qty: 2 }],
      paymentMethod: "payway",
      shippingMethod: "pickup",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 450_000,
      freeShippingThresholdCents: 8_000_000,
    });
    expect(result.shippingCents).toBe(0);
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(1_000_000);
  });

  // Keep legacy transfer/cash tests if types still allow them for historical code paths,
  // OR delete cash/transfer tests once PaymentMethod is payway-only.
});
```

- [ ] **Step 2: Run test — expect fail**

```bash
pnpm exec vitest run src/server/domain/pricing/calculate-totals.test.ts
```

Expected: FAIL (`payway` not in type / discount still applied).

- [ ] **Step 3: Implement errors + totals**

`errors.ts` — extend `DomainErrorCode`:

```ts
export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "STOCK_INSUFFICIENT"
  | "INVALID_PAYMENT_SHIPPING_COMBO"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PENDING"
  | "RESERVATION_EXPIRED"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "PAYWAY_CONFIG_MISSING"
  | "PAYWAY_LINK_FAILED"
  | "PAYWAY_NOTIFICATION_INVALID"
  | "INSTALLMENTS_NOT_ALLOWED";
```

`calculate-totals.ts`:

```ts
export type PaymentMethod = "payway" | "transfer" | "cash";
// transfer|cash remain only for reading legacy rows / optional internal; new checkout uses payway.

export function calculateTotals(input: CalculateTotalsInput): CalculateTotalsResult {
  if (input.paymentMethod === "cash" && input.shippingMethod !== "pickup") {
    throw new DomainError(
      "INVALID_PAYMENT_SHIPPING_COMBO",
      "Cash payment requires pickup shipping",
    );
  }

  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.qty,
    0,
  );

  const discountCents =
    input.paymentMethod === "payway"
      ? 0
      : Math.floor((subtotalCents * input.paymentDiscountBps) / 10_000);

  let shippingCents = 0;
  if (input.shippingMethod !== "pickup") {
    const baseAfterDiscount = subtotalCents - discountCents;
    shippingCents =
      baseAfterDiscount >= input.freeShippingThresholdCents ? 0 : input.andreaniFeeCents;
  }

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm exec vitest run src/server/domain/pricing/calculate-totals.test.ts
```

- [ ] **Step 5: Commit** (human GPG)

```bash
git add src/server/domain/errors.ts src/server/domain/pricing/calculate-totals.ts src/server/domain/pricing/calculate-totals.test.ts
git commit -S -m "feat(pricing): payway totals without payment discount"
```

---

### Task 2: Installments helper

**Files:**
- Create: `src/server/domain/checkout/installments.ts`
- Create: `src/server/domain/checkout/installments.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import { assertInstallmentsAllowed, parseInstallmentsAllowList } from "./installments";
import { DomainError } from "../errors";

describe("installments", () => {
  it("parses csv and array", () => {
    expect(parseInstallmentsAllowList("1,3,6")).toEqual([1, 3, 6]);
    expect(parseInstallmentsAllowList([1, 3])).toEqual([1, 3]);
  });

  it("defaults to [1] when empty", () => {
    expect(parseInstallmentsAllowList(null)).toEqual([1]);
    expect(parseInstallmentsAllowList("")).toEqual([1]);
  });

  it("allows listed installments", () => {
    expect(() => assertInstallmentsAllowed(3, [1, 3, 6])).not.toThrow();
  });

  it("rejects unlisted", () => {
    expect(() => assertInstallmentsAllowed(12, [1, 3, 6])).toThrow(DomainError);
    try {
      assertInstallmentsAllowed(12, [1, 3, 6]);
    } catch (e) {
      expect((e as DomainError).code).toBe("INSTALLMENTS_NOT_ALLOWED");
    }
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
pnpm exec vitest run src/server/domain/checkout/installments.test.ts
```

- [ ] **Step 3: Implement**

```ts
import { DomainError } from "../errors";

export function parseInstallmentsAllowList(
  raw: string | number[] | null | undefined,
): number[] {
  if (Array.isArray(raw)) {
    const nums = raw.map(Number).filter((n) => Number.isInteger(n) && n >= 1);
    return nums.length ? [...new Set(nums)].sort((a, b) => a - b) : [1];
  }
  if (typeof raw === "string" && raw.trim()) {
    const nums = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1);
    return nums.length ? [...new Set(nums)].sort((a, b) => a - b) : [1];
  }
  return [1];
}

export function assertInstallmentsAllowed(
  installments: number,
  allowList: number[],
): void {
  if (!Number.isInteger(installments) || installments < 1) {
    throw new DomainError("INSTALLMENTS_NOT_ALLOWED", "Invalid installments");
  }
  if (!allowList.includes(installments)) {
    throw new DomainError(
      "INSTALLMENTS_NOT_ALLOWED",
      `Installments ${installments} not allowed`,
    );
  }
}
```

- [ ] **Step 4: Pass + commit**

```bash
pnpm exec vitest run src/server/domain/checkout/installments.test.ts
git add src/server/domain/checkout/installments.ts src/server/domain/checkout/installments.test.ts
git commit -S -m "feat(checkout): installments allow-list helper"
```

---

### Task 3: DB migration (payway enum + columns + place_order_tx)

**Files:**
- Create: `supabase/migrations/20261006120000_payway_checkout.sql`
- Modify: `src/server/db/types.ts` (hand-update Database types for new columns/enum — match existing style)
- Modify: `supabase/seed.sql` if settings defaults needed

- [ ] **Step 1: Write migration**

```sql
-- Payway hosted checkout

alter type public.payment_method add value if not exists 'payway';

alter table public.orders
  add column if not exists installments int not null default 1
    check (installments >= 1),
  add column if not exists payway_site_transaction_id text null,
  add column if not exists payway_payment_id text null,
  add column if not exists payway_link_attempt int not null default 0;

alter table public.store_settings
  add column if not exists payway_installments int[] not null default '{1}';

create table if not exists public.payway_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  payload jsonb not null,
  order_id uuid null references public.orders(id),
  processed_at timestamptz null,
  error text null
);

alter table public.payway_webhook_events enable row level security;

-- Recreate place_order_tx from latest (20261005120000) plus:
-- insert installments from p->>'installments' (default 1)
-- insert payway_site_transaction_id from p->>'payway_site_transaction_id' if present
--
-- Copy full function body from supabase/migrations/20261005120000_variant_sku.sql
-- and extend INSERT column list:
--   installments,
--   payway_site_transaction_id
-- values:
--   coalesce((p->>'installments')::int, 1),
--   nullif(p->>'payway_site_transaction_id', '')
--
-- Return to_jsonb(order row) already returns new columns via select *.
```

**Important:** Paste the complete `create or replace function public.place_order_tx` from `20261005120000_variant_sku.sql` and only add the new columns — do not leave a stub. Grant execute to `service_role` as before.

- [ ] **Step 2: Apply locally**

```bash
pnpm exec supabase db reset
```

Expected: migrations + seed OK.

- [ ] **Step 3: Update `src/server/db/types.ts`**

Add to `orders` Row/Insert/Update: `installments`, `payway_site_transaction_id`, `payway_payment_id`, `payway_link_attempt`.  
Add `payment_method` enum value `"payway"`.  
Add `store_settings.payway_installments: number[]`.  
Add `payway_webhook_events` table types if other tables are fully typed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261006120000_payway_checkout.sql src/server/db/types.ts supabase/seed.sql
git commit -S -m "feat(db): payway payment method, order fields, webhook events"
```

---

### Task 4: Payway config + amount + port + HTTP adapter (mocked)

**Files:**
- Create: `src/server/payments/payway/port.ts`
- Create: `src/server/payments/payway/config.ts`
- Create: `src/server/payments/payway/amount.ts`
- Create: `src/server/payments/payway/amount.test.ts`
- Create: `src/server/payments/payway/http-adapter.ts`
- Create: `src/server/payments/payway/http-adapter.test.ts`
- Create: `src/server/payments/payway/parse-notification.ts`
- Create: `src/server/payments/payway/parse-notification.test.ts`

- [ ] **Step 1: amount + parse tests (TDD)**

`amount.ts` — start with **cents as integer sent to Payway** (modern SDK style). Keep a single conversion function so sandbox can flip to pesos if needed:

```ts
/** Convert store integer cents → Payway API amount number. */
export function centsToPaywayAmount(cents: number): number {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("amount must be non-negative integer cents");
  }
  return cents; // validate in sandbox; if Payway expects pesos: return cents / 100
}

export function paywayAmountToCents(amount: number): number {
  // inverse of centsToPaywayAmount
  return Math.round(amount); // or Math.round(amount * 100)
}
```

`parse-notification.ts` — accept flexible JSON:

```ts
export type ParsedPaywayNotification = {
  siteTransactionId: string | null;
  paywayPaymentId: string | null;
  status: string | null;
  amountRaw: number | null;
};

export function parsePaywayNotification(body: unknown): ParsedPaywayNotification {
  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : o;
  const siteTransactionId = stringOrNull(
    nested.site_transaction_id ?? nested.siteTransactionId ?? o.site_transaction_id,
  );
  const paywayPaymentId = stringOrNull(
    nested.id ?? nested.payment_id ?? nested.paymentId ?? o.id,
  );
  const status = stringOrNull(nested.status ?? o.status);
  const amountRaw = numberOrNull(nested.amount ?? o.amount);
  return { siteTransactionId, paywayPaymentId, status, amountRaw };
}
```

Tests: sample payloads with nested/flat shapes; missing fields → nulls.

- [ ] **Step 2: Implement port + config + http-adapter**

`port.ts`:

```ts
export type CreateCheckoutLinkInput = {
  siteTransactionId: string;
  amountCents: number;
  currency: "ARS";
  installments: number;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  notificationsUrl: string;
  products: {
    id: string;
    quantity: number;
    valueCents: number;
    description: string;
  }[];
};

export type CreateCheckoutLinkResult = {
  paymentLink: string;
  paywayPaymentId?: string;
};

export type PaywayPaymentInfo = {
  status: string;
  amountCents: number;
  siteTransactionId: string;
};

export type PaywayPort = {
  createCheckoutLink(input: CreateCheckoutLinkInput): Promise<CreateCheckoutLinkResult>;
  getPayment(paywayPaymentId: string): Promise<PaywayPaymentInfo>;
};
```

`config.ts`:

```ts
import { DomainError } from "@/server/domain/errors";

export type PaywayConfig = {
  publicKey: string;
  privateKey: string;
  siteId: string;
  templateId: number;
  env: "developer" | "production";
  apiBaseUrl: string;
  installmentsFallback: number[];
};

export function loadPaywayConfig(env: NodeJS.ProcessEnv = process.env): PaywayConfig {
  const publicKey = env.PAYWAY_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.PAYWAY_PRIVATE_KEY?.trim() ?? "";
  const siteId = env.PAYWAY_SITE_ID?.trim() ?? "";
  const templateId = Number(env.PAYWAY_TEMPLATE_ID ?? "1");
  const ambient = (env.PAYWAY_ENV ?? "developer").trim();
  if (!publicKey || !privateKey || !siteId) {
    throw new DomainError("PAYWAY_CONFIG_MISSING", "Payway env keys are not configured");
  }
  if (ambient !== "developer" && ambient !== "production") {
    throw new DomainError("PAYWAY_CONFIG_MISSING", "PAYWAY_ENV must be developer|production");
  }
  const apiBaseUrl =
    ambient === "production"
      ? "https://ventasonline.payway.com.ar/api/v2"
      : "https://developers.decidir.com/api/v2";
  // Also support checkout link endpoints per Payway docs if different host — document in adapter.
  return {
    publicKey,
    privateKey,
    siteId,
    templateId: Number.isInteger(templateId) ? templateId : 1,
    env: ambient,
    apiBaseUrl,
    installmentsFallback: (env.PAYWAY_INSTALLMENTS ?? "1")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1),
  };
}
```

`http-adapter.ts` — use `fetch`:

1. `POST` checkout/hash or payments/link per official SDK flow (`checkoutHash` then link).  
   Mirror fields from design: `site`, `template_id`, `public_apikey`, `notifications_url`, `success_url`, `cancel_url`, `total_price` via `centsToPaywayAmount`, `installments` array, `products`.  
2. Headers: `apikey: privateKey` (and public where required) — match SDK Node README.  
3. On non-2xx → throw `DomainError("PAYWAY_LINK_FAILED", ...)`.  
4. `getPayment(id)`: `GET {apiBaseUrl}/payments/{id}` with private key; map status + amount via `paywayAmountToCents`.

**Mock in unit tests:** inject `fetch` dependency:

```ts
export function createPaywayHttpAdapter(
  config: PaywayConfig,
  deps?: { fetch?: typeof fetch },
): PaywayPort
```

- [ ] **Step 3: Unit tests with mock fetch** — assert URL, headers, body shape; happy path returns `paymentLink`.

- [ ] **Step 4: Commit**

```bash
git add src/server/payments/payway
git commit -S -m "feat(payway): config, amount helpers, HTTP adapter"
```

---

### Task 5: placeOrder payway + createPaymentLink domain

**Files:**
- Modify: `src/server/domain/checkout/place-order.ts`
- Modify: `src/server/domain/checkout/place-order.test.ts`
- Create: `src/server/domain/checkout/create-payment-link.ts`
- Create: `src/server/domain/checkout/create-payment-link.test.ts` (mock db + payway)

- [ ] **Step 1: Extend PlaceOrderInput / Result / Deps**

```ts
export type PlaceOrderInput = {
  // ...existing
  paymentMethod: PaymentMethod; // expect "payway" from router
  installments: number;
};

export type PlaceOrderResult = {
  // ...existing order fields
  installments?: number;
  payment_link: string | null;
  link_error: "PAYWAY_LINK_FAILED" | "PAYWAY_CONFIG_MISSING" | null;
};

export type PlaceOrderDeps = {
  db: ServiceClient;
  email: EmailPort;
  payway: PaywayPort;
  appBaseUrl: string; // from NEXT_PUBLIC_APP_URL
  now?: Date;
};
```

Flow after successful `place_order_tx`:

1. Load allow-list from `store_settings.payway_installments` (already used in quote path — also validate installments **before** RPC via `assertInstallmentsAllowed`).  
2. Payload includes `installments`, `payment_method: "payway"`, `payway_site_transaction_id: null` initially.  
3. After insert, set `siteTransactionId = order.id` (UUID string). Update order row: `payway_site_transaction_id`, bump `payway_link_attempt`.  
4. Call `payway.createCheckoutLink({ siteTransactionId: order.id, amountCents: order.total_cents, installments, successUrl: `${appBaseUrl}/pedido?token=${order.access_token}`, cancelUrl: same, notificationsUrl: `${appBaseUrl}/api/payway/notifications`, ...})`.  
5. On success: store `payway_payment_id` if returned; set `payment_link`.  
6. On failure: catch → `payment_link: null`, `link_error: code`.  
7. Email `order_created` without CBU; mention complete payment via tracking link.

- [ ] **Step 2: Update place-order tests**

Integration tests currently use `transfer`/`cash`. Change to `payway` + mock payway port:

```ts
const payway: PaywayPort = {
  async createCheckoutLink() {
    return { paymentLink: "https://developers.decidir.com/web/checkout/test", paywayPaymentId: "pw-1" };
  },
  async getPayment() {
    return { status: "approved", amountCents: 0, siteTransactionId: "" };
  },
};

await placeOrder({ ..., paymentMethod: "payway", installments: 1 }, {
  db, email: consoleEmail, payway, appBaseUrl: "http://localhost:3000",
});
expect(order.payment_link).toContain("checkout");
expect(order.discount_cents).toBe(0);
```

Also test link failure still returns order with `payment_link: null`.

- [ ] **Step 3: `createPaymentLink({ token }, deps)`**

```ts
// load order by access_token
// status must be pendiente_pago, payment_method payway
// reservation_expires_at >= now else RESERVATION_EXPIRED / ORDER_NOT_PENDING
// reuse payway_site_transaction_id or set to order.id
// create link, update payway_payment_id / attempt
// return { payment_link }
```

- [ ] **Step 4: Run tests**

```bash
pnpm exec vitest run src/server/domain/checkout/place-order.test.ts src/server/domain/checkout/create-payment-link.test.ts
```

- [ ] **Step 5: Commit**

```bash
git commit -S -m "feat(checkout): placeOrder payway payment link + retry"
```

---

### Task 6: Webhook handler domain + route

**Files:**
- Create: `src/server/domain/payments/handle-payway-notification.ts`
- Create: `src/server/domain/payments/handle-payway-notification.test.ts`
- Create: `src/app/api/payway/notifications/route.ts`

- [ ] **Step 1: Domain handler tests (mock db + payway + confirm)**

```ts
// cases:
// 1. approved + amount match + pendiente_pago → confirmPayment called once
// 2. already pago_confirmado → no-op success
// 3. amount mismatch → PAYWAY_NOTIFICATION_INVALID, no confirm
// 4. unknown site_transaction_id → invalid
// 5. status not approved/accredited → 200 no confirm (log only)
```

Logic:

```ts
export async function handlePaywayNotification(
  body: unknown,
  deps: {
    db: ServiceClient;
    email: EmailPort;
    payway: PaywayPort;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  // insert payway_webhook_events raw
  const parsed = parsePaywayNotification(body);
  // resolve order by payway_site_transaction_id or id
  // if !order → mark event error, throw DomainError PAYWAY_NOTIFICATION_INVALID
  // if status already pago_confirmado or later → processed, return ok
  // require paywayPaymentId; getPayment(id)
  // if payment.status not in APPROVED_SET → return ok without confirm
  // if payment.amountCents !== order.total_cents → invalid
  // if payment.siteTransactionId mismatch → invalid
  // confirmPayment(order.id, deps)
  // update order.payway_payment_id
  // mark event processed
  return { ok: true };
}
```

Approved statuses: start with `approved`, `accredited` (adjust after sandbox).

- [ ] **Step 2: Route**

```ts
// src/app/api/payway/notifications/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/db/supabase";
import { resolveEmail } from "..."; // same as context
import { createPaywayHttpAdapter, loadPaywayConfig } from "@/server/payments/payway/...";
import { handlePaywayNotification } from "@/server/domain/payments/handle-payway-notification";
import { DomainError } from "@/server/domain/errors";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  try {
    const db = createServiceClient();
    const payway = createPaywayHttpAdapter(loadPaywayConfig());
    await handlePaywayNotification(body, { db, email: resolveEmail(), payway });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DomainError && e.code === "PAYWAY_CONFIG_MISSING") {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    if (e instanceof DomainError && e.code === "PAYWAY_NOTIFICATION_INVALID") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("payway notification", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git commit -S -m "feat(payway): webhook notification confirms payment"
```

---

### Task 7: tRPC context + checkout/settings/orders routers

**Files:**
- Modify: `src/server/trpc/context.ts`
- Modify: `src/server/trpc/routers/checkout.ts`
- Modify: `src/server/trpc/routers/settings.ts`
- Modify: `src/server/trpc/routers/orders.ts`
- Modify: `src/server/trpc/routers/admin/settings.ts` if admin edits settings (add payway_installments optional)
- Modify: `src/server/domain/orders/public-order.ts` if strips fields — expose `installments` on public order

- [ ] **Step 1: Context**

```ts
import { createPaywayHttpAdapter } from "@/server/payments/payway/http-adapter";
import { loadPaywayConfig } from "@/server/payments/payway/config";
import type { PaywayPort } from "@/server/payments/payway/port";

function resolvePayway(): PaywayPort {
  // Lazy: adapter that calls loadPaywayConfig on each use OR load once and catch missing at call site
  return createPaywayHttpAdapter(loadPaywayConfig());
}

// In createTRPCContext:
payway: {
  createCheckoutLink: async (input) => {
    try {
      return await createPaywayHttpAdapter(loadPaywayConfig()).createCheckoutLink(input);
    } catch (e) {
      throw e;
    }
  },
  getPayment: async (id) => createPaywayHttpAdapter(loadPaywayConfig()).getPayment(id),
},
appBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
```

Prefer single `createPaywayFromEnv(): PaywayPort` helper used by context and webhook.

- [ ] **Step 2: checkout router**

```ts
const paymentMethodSchema = z.enum(["payway"]);
// quote + placeOrder: add installments: z.number().int().positive().default(1)
// placeOrder deps: payway + appBaseUrl

createPaymentLink: publicProcedure
  .input(z.object({ token: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    try {
      return await createPaymentLink(
        { token: input.token },
        { db: ctx.db, payway: ctx.payway, appBaseUrl: ctx.appBaseUrl, now: new Date() },
      );
    } catch (e) {
      rethrowDomain(e);
    }
  }),
```

- [ ] **Step 3: settings.getPublic**

Select + return `payway_installments: number[]` (from column or fallback `PAYWAY_INSTALLMENTS` / `[1]`).

- [ ] **Step 4: orders select** add `installments, payway_payment_id, payway_site_transaction_id`.

- [ ] **Step 5: Smoke / typecheck**

```bash
pnpm exec tsc --noEmit
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git commit -S -m "feat(api): tRPC payway checkout and public installments"
```

---

### Task 8: Storefront checkout + pedido UI

**Files:**
- Modify: `src/app/checkout/page.tsx`
- Modify: `src/app/pedido/page.tsx`
- Modify: `src/app/pedido/exito/page.tsx` if assumes transfer
- Modify: `src/app/medios-de-pago/page.tsx`
- Modify: `src/components/store/info-page.tsx`
- Modify: `src/lib/format/promo.ts` + tests
- Modify: `src/components/store/pdp-shipping-estimate.tsx` / `src/lib/shipping/estimate-shipping.ts` — stop applying payment discount for estimates (use 0 bps or payway path)
- Modify: admin order detail if shows payment method labels

- [ ] **Step 1: Checkout**

- `type Pay = "payway"` only (or remove type and hardcode).  
- State: `installments` from settings allow-list (default first).  
- Remove transfer CBU block and cash radio.  
- Quote/placeOrder send `paymentMethod: "payway", installments`.  
- On placeOrder success: if `payment_link` → `window.location.assign(payment_link)`; else navigate to `/pedido?token=` + show error toast “No pudimos abrir Payway; reintentá desde el pedido”.  
- Show discount line only if `discountCents > 0` (won’t for payway).

- [ ] **Step 2: Pedido tracking**

- Label payment method Payway.  
- If `pendiente_pago` && payway: button “Pagar ahora” → `createPaymentLink` → redirect.  
- Keep proof upload **only if** `payment_method === "transfer"` (legacy).  
- Banner copy: for payway, don’t say “subí el comprobante”; say “completá el pago en Payway antes de que venza la reserva”.

- [ ] **Step 3: Promo / medios de pago**

- `formatPromoBarCopy`: change to generic promo or hide bar when bps unused; simplest: if always 0 discount, return empty string and hide promo bar when empty.  
- Medios de pago page: card via Payway, no transfer/cash as primary.

- [ ] **Step 4: Manual UI pass** — `pnpm dev`, place order with mock payway if keys missing (expect config error) or sandbox keys.

- [ ] **Step 5: Commit**

```bash
git commit -S -m "feat(store): payway-only checkout and order pay CTA"
```

---

### Task 9: Email templates + admin polish

**Files:**
- Modify: `src/server/email/templates.ts`
- Modify: `src/server/email/templates.test.ts`
- Modify: `src/app/admin/pedidos/[id]/page.tsx` — show installments + payway ids; hide confirm payment for `payment_method === 'payway'` (webhook-only per spec) OR leave confirm as emergency (spec: hide for payway)

- [ ] **Step 1: order_created body** — if payway, instruct to complete payment via magic link; no CBU.  
- [ ] **Step 2: Admin** — display fields; gate confirm button.  
- [ ] **Step 3: Tests + commit**

```bash
pnpm exec vitest run src/server/email/templates.test.ts
git commit -S -m "feat: payway email copy and admin order fields"
```

---

### Task 10: Contracts, AGENTS, env example

**Files:**
- Modify: `docs/contracts/domain-invariants.md`
- Modify: `docs/contracts/procedure-map.md`
- Modify: `docs/contracts/backend-for-frontend.md`
- Modify: `AGENTS.md` (remove “Do not add Payway…”)
- Modify: `.env.example`
- Optional: short note in `docs/OPS-DEPLOY.md` (notification URL HTTPS)

- [ ] **Step 1: Update invariants** — payway-only new orders; discount 0; new error codes; webhook confirms.  
- [ ] **Step 2: procedure-map** — quote/placeOrder I/O; `checkout.createPaymentLink`; note HTTP webhook.  
- [ ] **Step 3: BFF examples** with payway.  
- [ ] **Step 4: `.env.example`**

```bash
PAYWAY_PUBLIC_KEY=
PAYWAY_PRIVATE_KEY=
PAYWAY_SITE_ID=
PAYWAY_TEMPLATE_ID=1
PAYWAY_ENV=developer
PAYWAY_INSTALLMENTS=1
```

- [ ] **Step 5: Commit**

```bash
git commit -S -m "docs: payway contracts and env template"
```

---

### Task 11: Full verification

- [ ] **Step 1: Reset DB + tests + build**

```bash
pnpm exec supabase db reset
pnpm test
pnpm lint
pnpm build
```

Expected: all green.

- [ ] **Step 2: Sandbox checklist (human)**

1. Fill `.env.local` with Payway sandbox keys.  
2. `pnpm dev`, place order, complete payment on Payway.  
3. Confirm webhook hits local via tunnel (ngrok/cloudflared) → status `pago_confirmado`.  
4. Cancel path + expire unpaid still works.  
5. If amount unit wrong, fix `amount.ts` only and retest.

- [ ] **Step 3: Final commit if amount fix needed**

```bash
git commit -S -m "fix(payway): amount unit after sandbox validation"
```

---

## Implementation notes for agents

1. **Never commit secrets.**  
2. **GPG:** stage files and print `git commit -S -m "..."` for the human.  
3. **RPC:** always full `create or replace function place_order_tx` in new migration (project convention).  
4. **Legacy transfer/cash:** DB enum keeps values; app checkout only `payway`. Proofs UI gated.  
5. **sdk-node-payway:** optional; prefer `fetch` adapter for TypeScript control.  
6. **Idempotency:** webhook must be safe to retry.  
7. **Amount unit:** single module `amount.ts` — only place to change after sandbox.

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Hosted link only | 4, 5, 8 |
| Payway-only UI | 8 |
| No payment discount | 1 |
| Configurable installments | 2, 3, 7, 8 |
| Webhook auto-confirm | 6 |
| Env credentials | 4, 10 |
| Retry payment link | 5, 7, 8 |
| 24h expire unchanged | (existing job) |
| Contracts / AGENTS | 10 |
| Tests | 1–6, 11 |
