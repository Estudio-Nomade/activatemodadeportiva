# Activate Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Activate Moda Deportiva **backend** inside a single Next.js app: Supabase schema, domain (pricing/stock/orders), tRPC API, Resend, Storage, Vercel cron, and contracts docs for the UI team.

**Architecture:** Domain core + tRPC + adapters (see `docs/superpowers/specs/2026-09-30-backend-architecture-design.md`). Money in integer cents; hybrid cart; service-role server writes; Supabase **local** for dev/test.

**Tech Stack:** Next.js (App Router), TypeScript, tRPC, Zod, Supabase (Postgres/Auth/Storage), Resend, Vitest, pnpm.

**Commits:** Prefer `git commit -S` (GPG). If the agent cannot sign, stage files and print the exact `git commit -S -m "..."` for the human to run.

**Docs freshness:** Before installing or wiring libraries, confirm current APIs with Context7 (`/vercel/next.js`, `/trpc/trpc`, `/supabase/cli`, `/websites/supabase_guides`, `/colinhacks/zod`).

**Spec:** `docs/superpowers/specs/2026-09-30-backend-architecture-design.md`  
**PRD:** `docs/superpowers/specs/2026-09-28-activate-moda-deportiva-prd.md`

---

## File map (create during this plan)

```text
package.json
pnpm-lock.yaml
tsconfig.json
next.config.ts
.env.example
vercel.json
vitest.config.ts
supabase/config.toml
supabase/migrations/20260930000000_init.sql
supabase/seed.sql
src/server/db/supabase.ts
src/server/db/types.ts
src/server/domain/errors.ts
src/server/domain/pricing/calculate-totals.ts
src/server/domain/pricing/calculate-totals.test.ts
src/server/domain/orders/status.ts
src/server/domain/orders/status.test.ts
src/server/domain/stock/availability.ts
src/server/domain/stock/availability.test.ts
src/server/domain/checkout/place-order.ts
src/server/domain/checkout/quote.ts
src/server/domain/orders/transitions.ts
src/server/domain/orders/expire-reservations.ts
src/server/domain/catalog/search.ts
src/server/email/port.ts
src/server/email/console.ts
src/server/email/resend.ts
src/server/storage/port.ts
src/server/storage/supabase-storage.ts
src/server/trpc/init.ts
src/server/trpc/context.ts
src/server/trpc/routers/catalog.ts
src/server/trpc/routers/checkout.ts
src/server/trpc/routers/orders.ts
src/server/trpc/routers/settings.ts
src/server/trpc/routers/admin/catalog.ts
src/server/trpc/routers/admin/orders.ts
src/server/trpc/routers/admin/settings.ts
src/server/trpc/routers/app.ts
src/server/jobs/expire-reservations.ts
src/app/api/trpc/[trpc]/route.ts
src/app/api/cron/expire-reservations/route.ts
src/app/layout.tsx
src/app/page.tsx
docs/contracts/backend-for-frontend.md
docs/contracts/domain-invariants.md
docs/contracts/procedure-map.md
README.md
```

UI pages beyond a minimal health/home stub are **out of scope** for this backend plan.

---

### Task 1: Scaffold Next.js + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `.gitignore`

- [ ] **Step 1: Create Next.js TypeScript app in repo root**

From `/home/imn0p/activatemodadeportiva` (keep existing `docs/`, `design/`, `demos/`):

```bash
pnpm create next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*" --turbopack --tailwind false --use-pnpm
```

If the CLI refuses a non-empty directory, scaffold in `/tmp/opencode/activate-app` and move `package.json`, `src`, `tsconfig.json`, `next.config.*` into the repo root manually without deleting `docs/`.

- [ ] **Step 2: Add backend dependencies**

```bash
pnpm add @trpc/server @trpc/client @supabase/supabase-js zod resend superjson
pnpm add -D vitest @vitest/coverage-v8 typescript
```

Pin versions from whatever `pnpm add` resolves; re-check tRPC Next App Router fetch adapter via Context7 if peer warnings appear.

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "jobs:expire": "tsx src/server/jobs/expire-reservations-cli.ts"
  }
}
```

Add `tsx` as devDependency when implementing the CLI in Task 12 (`pnpm add -D tsx`).

- [ ] **Step 4: Write `.env.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-from-supabase-status
SUPABASE_SERVICE_ROLE_KEY=replace-from-supabase-status
RESEND_API_KEY=
EMAIL_FROM="Activate <onboarding@resend.dev>"
CRON_SECRET=dev-cron-secret-change-me
```

- [ ] **Step 5: Minimal app page**

`src/app/page.tsx` can render plain text `Activate API` so `next build` works. No storefront UI.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts vitest.config.ts .env.example src/app .gitignore
git commit -S -m "chore: scaffold Next.js backend workspace"
```

---

### Task 2: Supabase local + initial migration

**Files:**
- Create: `supabase/migrations/20260930000000_init.sql`, `supabase/seed.sql`
- Modify: `supabase/config.toml` (via `supabase init`)

- [ ] **Step 1: Init and start Supabase**

```bash
supabase init
supabase start
supabase status -o env > .env.local.supabase
```

Copy URL and keys into `.env.local` (gitignored) from `supabase status`.

- [ ] **Step 2: Write migration `supabase/migrations/20260930000000_init.sql`**

```sql
-- Activate v1 schema
create extension if not exists "pgcrypto";

create table public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories (id) on delete restrict,
  sort_order int not null default 0
);

create table public.size_guides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  category_id uuid not null references public.categories (id) on delete restrict,
  list_price_cents int not null check (list_price_cents >= 0),
  promo_price_cents int check (promo_price_cents is null or promo_price_cents >= 0),
  size_guide_id uuid references public.size_guides (id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  alt text not null default ''
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color text not null,
  size text not null,
  stock_on_hand int not null default 0 check (stock_on_hand >= 0),
  unique (product_id, color, size)
);

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  transfer_cbu_alias_text text not null default '',
  payment_discount_bps int not null default 1000 check (payment_discount_bps >= 0),
  andreani_fee_cents int not null default 0 check (andreani_fee_cents >= 0),
  free_shipping_threshold_cents int not null default 0 check (free_shipping_threshold_cents >= 0),
  season_label text not null default 'Moda deportiva',
  whatsapp_url_or_phone text not null default '',
  instagram_url text not null default '',
  contact_email text not null default '',
  contact_address text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (1);

create type public.order_status as enum (
  'pendiente_pago',
  'pago_confirmado',
  'preparando',
  'listo_retiro',
  'enviado',
  'entregado',
  'cancelado'
);

create type public.shipping_method as enum ('pickup', 'andreani');
create type public.payment_method as enum ('transfer', 'cash');
create type public.cancel_reason as enum ('admin', 'expired');
create type public.reservation_status as enum ('active', 'consumed', 'released');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  access_token text not null unique,
  status public.order_status not null default 'pendiente_pago',
  customer_name text not null,
  phone text not null,
  email text not null,
  shipping_method public.shipping_method not null,
  payment_method public.payment_method not null,
  subtotal_cents int not null check (subtotal_cents >= 0),
  discount_cents int not null check (discount_cents >= 0),
  shipping_cents int not null check (shipping_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  shipping_address jsonb,
  reservation_expires_at timestamptz,
  cancel_reason public.cancel_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint cash_requires_pickup check (
    payment_method <> 'cash' or shipping_method = 'pickup'
  )
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  color text not null,
  size text not null,
  unit_price_cents int not null check (unit_price_cents >= 0),
  qty int not null check (qty > 0)
);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  qty int not null check (qty > 0),
  expires_at timestamptz not null,
  status public.reservation_status not null default 'active'
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index orders_code_idx on public.orders (code);
create index orders_access_token_idx on public.orders (access_token);
create index stock_reservations_active_expires_idx
  on public.stock_reservations (expires_at)
  where status = 'active';
create index products_name_idx on public.products using gin (to_tsvector('simple', name));
create index product_variants_product_id_idx on public.product_variants (product_id);

alter table public.admin_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.store_settings enable row level security;
alter table public.size_guides enable row level security;

-- No anon policies for writes. Server uses service role.
-- Optional read policies omitted: prefer server-only access path.
```

- [ ] **Step 3: Seed `supabase/seed.sql`**

Insert top categories Mujer/Hombre/Accesorios, PRD subcategories, one published product with two variants (stock 5 each), and ensure `store_settings` has sample CBU text `activate.moda.mp`, andreani fee `450000` ($4500.00), threshold `8000000` ($80000.00).

Example fragment:

```sql
insert into public.categories (id, slug, name, parent_id, sort_order) values
  ('11111111-1111-1111-1111-111111111101', 'mujer', 'Mujer', null, 1),
  ('11111111-1111-1111-1111-111111111102', 'hombre', 'Hombre', null, 2),
  ('11111111-1111-1111-1111-111111111103', 'accesorios', 'Accesorios', null, 3);

insert into public.categories (id, slug, name, parent_id, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'calzas-largas', 'Calzas largas', '11111111-1111-1111-1111-111111111101', 1);
-- continue remaining PRD leaves...

update public.store_settings set
  transfer_cbu_alias_text = 'activate.moda.mp',
  payment_discount_bps = 1000,
  andreani_fee_cents = 450000,
  free_shipping_threshold_cents = 8000000,
  season_label = 'Moda deportiva'
where id = 1;
```

Complete all PRD subcategory rows in the real seed file.

- [ ] **Step 4: Reset DB**

```bash
supabase db reset
```

Expected: migrations apply, seed runs, no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase
git commit -S -m "feat(db): initial Supabase schema and seed"
```

---

### Task 3: Domain errors + pricing (TDD)

**Files:**
- Create: `src/server/domain/errors.ts`
- Create: `src/server/domain/pricing/calculate-totals.ts`
- Create: `src/server/domain/pricing/calculate-totals.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/server/domain/pricing/calculate-totals.test.ts
import { describe, expect, it } from "vitest";
import { calculateTotals } from "./calculate-totals";

describe("calculateTotals", () => {
  // Convention: integer cents. $12.345,67 ARS → 1234567
  it("applies 10% discount only on products; andreani fee when under threshold", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 10_000_00, qty: 1 }], // $10.000,00
      paymentMethod: "transfer",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 4_500_00, // $4.500,00
      freeShippingThresholdCents: 80_000_00, // $80.000,00
    });
    expect(result.subtotalCents).toBe(1_000_000);
    expect(result.discountCents).toBe(100_000);
    expect(result.shippingCents).toBe(450_000);
    expect(result.totalCents).toBe(1_000_000 - 100_000 + 450_000);
  });

  it("grants free andreani shipping when post-discount base >= threshold", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 100_000_00, qty: 1 }], // $100.000,00
      paymentMethod: "transfer",
      shippingMethod: "andreani",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 4_500_00,
      freeShippingThresholdCents: 80_000_00,
    });
    expect(result.shippingCents).toBe(0);
    expect(result.totalCents).toBe(10_000_000 - 1_000_000);
  });

  it("pickup shipping is always zero", () => {
    const result = calculateTotals({
      lines: [{ unitPriceCents: 5_000_00, qty: 2 }],
      paymentMethod: "cash",
      shippingMethod: "pickup",
      paymentDiscountBps: 1000,
      andreaniFeeCents: 4_500_00,
      freeShippingThresholdCents: 80_000_00,
    });
    expect(result.shippingCents).toBe(0);
  });
});
```

**Cents convention (locked):** smallest currency unit as `int`. `$1,00` → `100`; `$12.345,67` → `1234567`. Numeric separators in tests are for readability only (`1_000_000` = one million cents = `$10.000,00`).

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm test src/server/domain/pricing/calculate-totals.test.ts
```

Expected: cannot find module / `calculateTotals` undefined.

- [ ] **Step 3: Implement**

```ts
// src/server/domain/errors.ts
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
  | "CONFLICT";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
```

```ts
// src/server/domain/pricing/calculate-totals.ts
export type PaymentMethod = "transfer" | "cash";
export type ShippingMethod = "pickup" | "andreani";

export type TotalsInput = {
  lines: { unitPriceCents: number; qty: number }[];
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  paymentDiscountBps: number;
  andreaniFeeCents: number;
  freeShippingThresholdCents: number;
};

export type TotalsResult = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

export function calculateTotals(input: TotalsInput): TotalsResult {
  if (input.paymentMethod === "cash" && input.shippingMethod !== "pickup") {
    throw new Error("INVALID_PAYMENT_SHIPPING_COMBO");
  }
  const subtotalCents = input.lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.qty,
    0,
  );
  const discountCents = Math.floor(
    (subtotalCents * input.paymentDiscountBps) / 10_000,
  );
  const shippingBase = subtotalCents - discountCents;
  let shippingCents = 0;
  if (input.shippingMethod === "andreani") {
    shippingCents =
      shippingBase >= input.freeShippingThresholdCents
        ? 0
        : input.andreaniFeeCents;
  }
  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
  };
}
```

Replace thrown generic Error with `DomainError` once wired:

```ts
import { DomainError } from "../errors";
// throw new DomainError("INVALID_PAYMENT_SHIPPING_COMBO", "Cash requires pickup");
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm test src/server/domain/pricing/calculate-totals.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/server/domain
git commit -S -m "feat(domain): pricing totals in cents"
```

---

### Task 4: Order status transitions (TDD)

**Files:**
- Create: `src/server/domain/orders/status.ts`
- Create: `src/server/domain/orders/status.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { assertTransition, type OrderStatus } from "./status";
import { DomainError } from "../errors";

describe("assertTransition", () => {
  it("allows pendiente_pago -> pago_confirmado", () => {
    expect(() =>
      assertTransition("pendiente_pago", "pago_confirmado"),
    ).not.toThrow();
  });

  it("forbids cancel from entregado", () => {
    expect(() => assertTransition("entregado", "cancelado")).toThrow(DomainError);
  });

  it("requires pickup for listo_retiro", () => {
    expect(() =>
      assertTransition("preparando", "listo_retiro", { shippingMethod: "andreani" }),
    ).toThrow(DomainError);
  });
});
```

- [ ] **Step 2: Run — FAIL**

```bash
pnpm test src/server/domain/orders/status.test.ts
```

- [ ] **Step 3: Implement `status.ts`**

Encode the transition table from the architecture spec §7. Export:

```ts
export type OrderStatus =
  | "pendiente_pago"
  | "pago_confirmado"
  | "preparando"
  | "listo_retiro"
  | "enviado"
  | "entregado"
  | "cancelado";

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  ctx?: { shippingMethod?: "pickup" | "andreani" },
): void
```

Throw `DomainError("INVALID_TRANSITION", ...)` when illegal.

- [ ] **Step 4: PASS + commit**

```bash
pnpm test src/server/domain/orders/status.test.ts
git add src/server/domain/orders
git commit -S -m "feat(domain): order status transitions"
```

---

### Task 5: Stock availability helper (TDD)

**Files:**
- Create: `src/server/domain/stock/availability.ts`
- Create: `src/server/domain/stock/availability.test.ts`

- [ ] **Step 1–4: TDD**

```ts
export function availableStock(onHand: number, activeReservedQty: number): number {
  return onHand - activeReservedQty;
}

export function assertLinesInStock(
  lines: { variantId: string; qty: number; available: number }[],
): void {
  for (const line of lines) {
    if (line.qty > line.available) {
      throw new DomainError("STOCK_INSUFFICIENT", `Variant ${line.variantId}`);
    }
  }
}
```

Tests for available math and insufficient stock.

```bash
pnpm test src/server/domain/stock/availability.test.ts
git commit -S -m "feat(domain): stock availability helpers"
```

---

### Task 6: Supabase service client + types

**Files:**
- Create: `src/server/db/supabase.ts`
- Create: `src/server/db/types.ts`

- [ ] **Step 1: Service role client**

```ts
// src/server/db/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

- [ ] **Step 2: Types**

Either hand-write minimal `Database` interface for tables used, or generate:

```bash
supabase gen types typescript --local > src/server/db/types.ts
```

Prefer generated types after migration is stable.

- [ ] **Step 3: Commit**

```bash
git add src/server/db
git commit -S -m "feat(db): supabase service client"
```

---

### Task 7: Quote + placeOrder domain (integration tests)

**Files:**
- Create: `src/server/domain/checkout/quote.ts`
- Create: `src/server/domain/checkout/place-order.ts`
- Create: `src/server/domain/checkout/place-order.test.ts`
- Create: `src/server/domain/checkout/code.ts` (order code + token generators)

- [ ] **Step 1: Helpers**

```ts
// src/server/domain/checkout/code.ts
import { randomBytes } from "node:crypto";

export function generateOrderCode(): string {
  const n = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return `ACT-${String(n).padStart(6, "0")}`;
}

export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}
```

- [ ] **Step 2: `quote.ts`**

Load settings + variants by ids; map unit prices (promo ?? list); call `calculateTotals`; compute availability via SQL sum of active reservations; return breakdown. No writes.

- [ ] **Step 3: `place-order.ts`**

Pseudocode (implement fully):

1. Validate cash⇒pickup.
2. Begin logical transaction: use Supabase RPC **or** raw SQL via `postgres` js if needed for `FOR UPDATE`.

**Preferred for correctness:** add migration function:

```sql
create or replace function public.place_order_tx(payload jsonb)
returns jsonb
language plpgsql
as $$
-- lock variants, check stock, insert order/items/reservations, return order row
$$;
```

Call with service client `rpc('place_order_tx', { payload })`.

If implementing in TS without RPC first is too weak on races, **do the RPC in this task**.

Payload fields: customer, lines `[{variantId, qty}]`, shippingMethod, paymentMethod, shippingAddress.

Set `reservation_expires_at = now() + interval '24 hours'`.

- [ ] **Step 4: Integration test**

```ts
// Requires supabase start + seed
import { beforeAll, describe, expect, it } from "vitest";
import { createServiceClient } from "@/server/db/supabase";
import { placeOrder } from "./place-order";

describe("placeOrder", () => {
  beforeAll(() => {
    // load .env.local
  });

  it("reserves stock and rejects oversell", async () => {
    const db = createServiceClient();
    // fetch a seeded variant id with stock 5
    // placeOrder qty 5 OK
    // placeOrder qty 1 -> DomainError STOCK_INSUFFICIENT
  });
});
```

Run:

```bash
pnpm test src/server/domain/checkout/place-order.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations src/server/domain/checkout
git commit -S -m "feat(checkout): quote and atomic placeOrder"
```

---

### Task 8: Order transitions + expire job domain

**Files:**
- Create: `src/server/domain/orders/transitions.ts`
- Create: `src/server/domain/orders/expire-reservations.ts`
- Create: `src/server/domain/orders/expire-reservations.test.ts`
- Create: `src/server/email/port.ts`
- Create: `src/server/email/console.ts`

- [ ] **Step 1: Email port**

```ts
// src/server/email/port.ts
export type EmailTemplate =
  | "order_created"
  | "payment_confirmed"
  | "ready_pickup"
  | "shipped"
  | "delivered"
  | "cancelled";

export type EmailPort = {
  send(input: {
    template: EmailTemplate;
    to: string;
    data: Record<string, unknown>;
  }): Promise<void>;
};
```

```ts
// src/server/email/console.ts
import type { EmailPort } from "./port";

export const consoleEmail: EmailPort = {
  async send(input) {
    console.info("[email]", input.template, input.to, input.data);
  },
};
```

- [ ] **Step 2: transitions**

Functions:

- `confirmPayment(orderId, deps)`
- `startPreparing` / `markReadyForPickup` / `markShipped` / `markDelivered`
- `cancelOrder(orderId, reason: 'admin' | 'expired', deps)`

Each: load order, `assertTransition`, update status, adjust reservations/stock per spec §6–7, call email port.

- [ ] **Step 3: expireReservations(now)**

Select pending orders with `reservation_expires_at < now`, cancel each with reason `expired` (idempotent).

- [ ] **Step 4: Tests with local DB + commit**

```bash
pnpm test src/server/domain/orders
git commit -S -m "feat(orders): transitions, cancel stock restore, expire job"
```

---

### Task 9: tRPC bootstrap

**Files:**
- Create: `src/server/trpc/init.ts`
- Create: `src/server/trpc/context.ts`
- Create: `src/server/trpc/routers/app.ts`
- Create: `src/app/api/trpc/[trpc]/route.ts`

- [ ] **Step 1: init + context** (pattern from tRPC App Router docs)

```ts
// src/server/trpc/context.ts
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createServiceClient } from "@/server/db/supabase";
import { consoleEmail } from "@/server/email/console";
import type { EmailPort } from "@/server/email/port";

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const db = createServiceClient();
  // Optional: create cookie-based supabase user client for admin JWT later
  return {
    db,
    headers: opts.req.headers,
    email: consoleEmail as EmailPort,
    adminUserId: null as string | null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
```

```ts
// src/server/trpc/init.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TRPCContext } from "./context";
import { DomainError } from "@/server/domain/errors";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    if (cause instanceof DomainError) {
      return {
        ...shape,
        data: {
          ...shape.data,
          domainCode: cause.code,
        },
      };
    }
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.adminUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const { data } = await ctx.db
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", ctx.adminUserId)
    .maybeSingle();
  if (!data) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, adminUserId: ctx.adminUserId } });
});
```

Wire admin session properly in context using `@supabase/ssr` or Authorization Bearer access token validation via `db.auth.getUser(jwt)` before Task 11.

```ts
// src/server/trpc/routers/app.ts
import { createTRPCRouter, publicProcedure } from "../init";
import { z } from "zod";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ ok: true as const })),
});

export type AppRouter = typeof appRouter;
```

```ts
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/routers/app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req, resHeaders: new Headers() }),
  });

export { handler as GET, handler as POST };
```

Adjust `createTRPCContext` args to match installed `@trpc/server` types (Context7).

- [ ] **Step 2: Smoke**

```bash
pnpm dev
# curl "http://localhost:3000/api/trpc/health"
```

Expected: JSON with `ok: true`.

- [ ] **Step 3: Commit**

```bash
git commit -S -m "feat(trpc): bootstrap App Router adapter and health"
```

---

### Task 10: Public catalog, settings, checkout, orders routers

**Files:**
- Create routers under `src/server/trpc/routers/`
- Modify `app.ts` to merge routers

- [ ] **Step 1: `catalog` router**

Procedures:

- `listCategories` → tree
- `listProducts` input `{ categorySlug?: string }` published only
- `getProduct` input `{ slug: string }`
- `search` input `{ q: string.min(1) }` name + category names

- [ ] **Step 2: `settings.getPublic`**

Return seasonLabel, whatsapp, instagram, transferCbuAliasText, discount bps, andreani fee, threshold (needed for UI transparency).

- [ ] **Step 3: `checkout.quote` / `checkout.placeOrder`**

Zod inputs; map DomainError → TRPCError with `cause` set so formatter exposes `domainCode`.

- [ ] **Step 4: `orders.getByCode` / `getByToken` / `uploadPaymentProof`**

Proof upload: accept storage path already uploaded **or** implement signed upload URL procedure + confirm. Minimum: `uploadPaymentProof` with `{ code or token, storagePath }` after client used signed URL from `orders.createProofUploadUrl`.

- [ ] **Step 5: Manual smoke against seed + commit**

```bash
git commit -S -m "feat(trpc): public catalog checkout and order tracking"
```

---

### Task 11: Admin auth context + admin routers

**Files:**
- Modify: `src/server/trpc/context.ts`
- Create: admin routers
- Create: script or seed note to add admin user

- [ ] **Step 1: Resolve admin user from `Authorization: Bearer <access_token>`**

```ts
const authHeader = opts.req.headers.get("authorization");
const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
let adminUserId: string | null = null;
if (jwt) {
  const { data, error } = await db.auth.getUser(jwt);
  if (!error && data.user) adminUserId = data.user.id;
}
```

- [ ] **Step 2: Admin catalog/orders/settings procedures**

CRUD products/variants/images; list orders; transition mutations; update settings.

- [ ] **Step 3: Document creating admin**

In contracts doc: create user via Supabase Studio local Auth, then:

```sql
insert into public.admin_profiles (user_id) values ('<uuid>');
```

- [ ] **Step 4: Commit**

```bash
git commit -S -m "feat(trpc): admin procedures and JWT gate"
```

---

### Task 12: Storage + Resend + cron

**Files:**
- Create: storage port + supabase implementation
- Create: `src/server/email/resend.ts`
- Create: `src/server/jobs/expire-reservations.ts`
- Create: `src/server/jobs/expire-reservations-cli.ts`
- Create: `src/app/api/cron/expire-reservations/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Buckets**

Via Studio or SQL/storage seed: `product-images` (public), `payment-proofs` (private).

- [ ] **Step 2: Resend adapter**

```ts
import { Resend } from "resend";
import type { EmailPort } from "./port";

export function createResendEmail(): EmailPort {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM!;
  return {
    async send({ template, to, data }) {
      await resend.emails.send({
        from,
        to,
        subject: subjectFor(template),
        html: htmlFor(template, data),
      });
    },
  };
}
```

Implement simple HTML strings including order code + magic link base URL from env `NEXT_PUBLIC_APP_URL`.

Context selects `createResendEmail()` when `RESEND_API_KEY` set, else console.

- [ ] **Step 3: Cron route**

```ts
// src/app/api/cron/expire-reservations/route.ts
import { NextResponse } from "next/server";
import { expireReservations } from "@/server/domain/orders/expire-reservations";
import { createServiceClient } from "@/server/db/supabase";
import { consoleEmail } from "@/server/email/console";

export async function POST(req: Request) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const result = await expireReservations({ db, email: consoleEmail, now: new Date() });
  return NextResponse.json(result);
}
```

```json
// vercel.json
{
  "crons": [{ "path": "/api/cron/expire-reservations", "schedule": "0 * * * *" }]
}
```

Note: Vercel cron often uses GET — implement **both** GET and POST calling the same handler if required by current Vercel docs (verify with Context7/Railway-free Vercel docs at implement time).

- [ ] **Step 4: CLI**

```ts
// src/server/jobs/expire-reservations-cli.ts
import "dotenv/config";
// call expireReservations and process.exit
```

- [ ] **Step 5: Commit**

```bash
git commit -S -m "feat: storage, resend adapter, expire cron"
```

---

### Task 13: Contracts docs for UI team / AI

**Files:**
- Create: `docs/contracts/backend-for-frontend.md`
- Create: `docs/contracts/domain-invariants.md`
- Create: `docs/contracts/procedure-map.md`
- Create/Modify: `README.md`

- [ ] **Step 1: `domain-invariants.md`**

Copy totals order, stock formula, status diagram, 24h rule, error codes from architecture spec (short, operational).

- [ ] **Step 2: `procedure-map.md`**

Table of every procedure with input fields and output fields matching **actual** router code (regenerate if routers change).

- [ ] **Step 3: `backend-for-frontend.md`**

- Install `@trpc/client` + same transformer
- `createTRPCProxyClient<AppRouter>` pointing at `/api/trpc`
- Admin: pass Supabase access token Bearer
- Examples: quote, placeOrder, getByCode
- Never trust client totals
- Error: read `data.domainCode`

- [ ] **Step 4: README**

```markdown
# Activate Moda Deportiva

## Backend dev
1. `supabase start`
2. Copy keys to `.env.local`
3. `supabase db reset`
4. `pnpm install && pnpm dev`
5. `pnpm test`
6. `pnpm jobs:expire`

UI team: see `docs/contracts/`.
Architecture: `docs/superpowers/specs/2026-09-30-backend-architecture-design.md`
```

- [ ] **Step 5: Commit**

```bash
git commit -S -m "docs: backend contracts for frontend team"
```

---

### Task 14: Final verification

- [ ] **Step 1: Full test suite**

```bash
supabase start
supabase db reset
pnpm test
pnpm lint
pnpm build
```

Expected: all green; build succeeds.

- [ ] **Step 2: Manual checklist**

1. `health` ok  
2. `catalog.listProducts` returns seed  
3. `checkout.placeOrder` creates order  
4. Second oversell fails `STOCK_INSUFFICIENT`  
5. `jobs:expire` cancels aged pending (set expires_at past in SQL for test)  
6. Admin JWT required for admin routes  

- [ ] **Step 3: Fix gaps; final commit if needed**

```bash
git commit -S -m "chore: backend verification fixes"
```

---

## Plan self-review

| Spec area | Tasks |
|-----------|--------|
| Monosystem Next + tRPC | 1, 9–11 |
| Supabase local + migrations | 2, 6 |
| Cents pricing | 3 |
| Stock + placeOrder atomic | 5, 7 |
| Status machine + cancel restore | 4, 8 |
| Email + cron | 8, 12 |
| Admin auth | 11 |
| Storage | 12 |
| Contracts docs | 13 |
| Hybrid cart (no carts table) | 7, 10 (quote/place only) |

No intentional TBD placeholders. Procedure names stay stable: `catalog.*`, `checkout.quote`, `checkout.placeOrder`, `orders.*`, `settings.getPublic`, `admin.*`.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-09-30-backend-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — same session with executing-plans and checkpoints  

**Which approach?**
