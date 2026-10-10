# Admin Web Push + Admin-only PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins receive Web Push on new order, payment confirmed, and low stock (`available ≤ 2`, edge-triggered), and can install a dedicated **Activate Admin** PWA (`scope: /admin`).

**Architecture:** Domain `PushPort` (mirror `EmailPort`) + `web-push` VAPID adapter; table `push_subscriptions`; tRPC `admin.push.*`; SW `push`/`notificationclick`; separate admin manifest. Best-effort only — never fail checkout/transitions.

**Tech Stack:** Next.js App Router, tRPC, Supabase, `web-push`, existing PWA SW, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-admin-web-push-design.md`

**Workspace:** Implement in a **git worktree** on branch `feat/admin-web-push` (not only the primary checkout). Commits must be GPG-signed: agents stage + print `git commit -S -m "…"` for the human; do not run unsigned commits.

---

## File map

| Path | Role |
|------|------|
| `supabase/migrations/20261009120000_push_subscriptions.sql` | Table + RLS deny-all (service role via tRPC) |
| `src/server/db/types.ts` | Add `push_subscriptions` |
| `src/server/push/port.ts` | `AdminPushPayload`, `PushPort` |
| `src/server/push/console.ts` | No-op / log adapter |
| `src/server/push/web-push-adapter.ts` | `web-push` send + prune 404/410 |
| `src/server/push/resolve.ts` | Pick adapter from env |
| `src/server/domain/push/payloads.ts` | Build ES titles/bodies + tags |
| `src/server/domain/push/payloads.test.ts` | Unit tests |
| `src/server/domain/push/low-stock.ts` | `crossedLowStockThreshold(before, after)` |
| `src/server/domain/push/low-stock.test.ts` | Unit tests |
| `src/server/domain/push/send-best-effort.ts` | Swallow errors |
| `src/server/domain/push/admin-url.ts` | Allowlist `/admin…` paths |
| `src/server/domain/push/admin-url.test.ts` | Unit tests |
| `src/server/domain/checkout/place-order.ts` | `push` dep; order.created + stock.low |
| `src/server/domain/orders/transitions.ts` | `push` on `confirmPayment` |
| `src/server/domain/payments/handle-payway-notification.ts` | Pass `push` through |
| `src/server/trpc/context.ts` | `push: resolvePush(db)` |
| `src/server/trpc/routers/admin/push.ts` | subscribe / unsubscribe / status / vapid |
| `src/server/trpc/routers/app.ts` | Mount `admin.push` |
| `src/app/api/payway/notifications/route.ts` | Pass `push` |
| `src/server/trpc/routers/checkout.ts` | Pass `push` into `placeOrder` |
| `src/server/trpc/routers/admin/orders.ts` | Pass `push` into transitions |
| `public/sw.js` | `push` + `notificationclick` |
| `src/app/admin/manifest.ts` | Admin-only PWA manifest |
| `src/app/admin/layout.tsx` | `manifest: "/admin/manifest.webmanifest"` |
| `src/components/admin/push-opt-in.tsx` | Opt-in UI |
| `src/app/admin/config/page.tsx` | Render opt-in card |
| `.env.example` | VAPID vars |
| `docs/contracts/procedure-map.md` | `admin.push.*` |
| `docs/contracts/domain-invariants.md` | Push + low-stock note |
| `package.json` | `web-push`, `@types/web-push` |

---

### Task 0: Git worktree

**Files:** none (git only)

- [ ] **Step 1: Create worktree from latest main**

```bash
git fetch origin
git worktree add -b feat/admin-web-push .worktrees/admin-web-push main
cd .worktrees/admin-web-push
pnpm install
```

Expected: clean worktree on `feat/admin-web-push`. All later tasks run **inside** this worktree.

- [ ] **Step 2: Confirm `.worktrees/` is gitignored** (do not commit worktree dir). If not ignored, add `.worktrees/` to `.gitignore` in a separate tiny commit on main first — or ensure worktree path is outside the repo per team convention. This repo’s AGENTS.md says do not commit `.worktrees/`.

---

### Task 1: Low-stock edge + admin URL helpers (TDD)

**Files:**
- Create: `src/server/domain/push/low-stock.ts`
- Create: `src/server/domain/push/low-stock.test.ts`
- Create: `src/server/domain/push/admin-url.ts`
- Create: `src/server/domain/push/admin-url.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/server/domain/push/low-stock.test.ts
import { describe, expect, it } from "vitest";
import { crossedLowStockThreshold } from "./low-stock";

describe("crossedLowStockThreshold", () => {
  it("notifies when crossing from above 2 into <= 2", () => {
    expect(crossedLowStockThreshold(3, 2)).toBe(true);
    expect(crossedLowStockThreshold(5, 0)).toBe(true);
    expect(crossedLowStockThreshold(3, 1)).toBe(true);
  });

  it("does not notify when already low", () => {
    expect(crossedLowStockThreshold(2, 1)).toBe(false);
    expect(crossedLowStockThreshold(1, 0)).toBe(false);
    expect(crossedLowStockThreshold(0, 0)).toBe(false);
  });

  it("does not notify when still above threshold", () => {
    expect(crossedLowStockThreshold(10, 5)).toBe(false);
    expect(crossedLowStockThreshold(4, 3)).toBe(false);
  });
});
```

```ts
// src/server/domain/push/admin-url.test.ts
import { describe, expect, it } from "vitest";
import { assertAdminDeepLink } from "./admin-url";

describe("assertAdminDeepLink", () => {
  it("allows order and catalog paths", () => {
    expect(assertAdminDeepLink("/admin/pedidos/abc")).toBe("/admin/pedidos/abc");
    expect(assertAdminDeepLink("/admin/catalogo/abc")).toBe("/admin/catalogo/abc");
  });

  it("rejects open redirects and non-admin paths", () => {
    expect(() => assertAdminDeepLink("https://evil.com")).toThrow();
    expect(() => assertAdminDeepLink("//evil.com")).toThrow();
    expect(() => assertAdminDeepLink("/productos")).toThrow();
    expect(() => assertAdminDeepLink("/admin/../api/secret")).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm exec vitest run src/server/domain/push/low-stock.test.ts src/server/domain/push/admin-url.test.ts
```

Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

```ts
// src/server/domain/push/low-stock.ts
const LOW_STOCK_MAX = 2;

/** True only on the edge into the low band (before > 2 and after <= 2). */
export function crossedLowStockThreshold(beforeAvailable: number, afterAvailable: number): boolean {
  return beforeAvailable > LOW_STOCK_MAX && afterAvailable <= LOW_STOCK_MAX;
}

export const LOW_STOCK_THRESHOLD = LOW_STOCK_MAX;
```

```ts
// src/server/domain/push/admin-url.ts
import { DomainError } from "@/server/domain/errors";

/** Same-origin admin path only. No scheme, no //, no .. */
export function assertAdminDeepLink(path: string): string {
  if (!path.startsWith("/admin")) {
    throw new DomainError("VALIDATION_ERROR", "Push URL must be an /admin path");
  }
  if (path.includes("://") || path.startsWith("//") || path.includes("..")) {
    throw new DomainError("VALIDATION_ERROR", "Invalid admin push URL");
  }
  return path;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
pnpm exec vitest run src/server/domain/push/low-stock.test.ts src/server/domain/push/admin-url.test.ts
```

- [ ] **Step 5: Commit (human signs)**

```bash
git add src/server/domain/push/low-stock.ts src/server/domain/push/low-stock.test.ts \
  src/server/domain/push/admin-url.ts src/server/domain/push/admin-url.test.ts
git commit -S -m "$(cat <<'EOF'
feat(push): low-stock edge and admin deep-link helpers

EOF
)"
```

---

### Task 2: Push payloads (TDD)

**Files:**
- Create: `src/server/domain/push/payloads.ts`
- Create: `src/server/domain/push/payloads.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  orderCreatedPayload,
  paymentConfirmedPayload,
  stockLowPayload,
} from "./payloads";

describe("push payloads", () => {
  it("orderCreatedPayload", () => {
    const p = orderCreatedPayload({
      orderId: "oid-1",
      code: "ACT-ABCDEFGHIJ",
      totalCents: 150050,
    });
    expect(p.event).toBe("order.created");
    expect(p.title).toContain("pedido");
    expect(p.body).toContain("ACT-ABCDEFGHIJ");
    expect(p.url).toBe("/admin/pedidos/oid-1");
    expect(p.tag).toBe("order-oid-1-created");
  });

  it("paymentConfirmedPayload", () => {
    const p = paymentConfirmedPayload({ orderId: "oid-1", code: "ACT-X" });
    expect(p.event).toBe("order.payment_confirmed");
    expect(p.url).toBe("/admin/pedidos/oid-1");
    expect(p.tag).toBe("order-oid-1-paid");
  });

  it("stockLowPayload", () => {
    const p = stockLowPayload({
      productId: "pid",
      variantId: "vid",
      productName: "Top Run",
      color: "Negro",
      size: "M",
      available: 2,
    });
    expect(p.event).toBe("stock.low");
    expect(p.url).toBe("/admin/catalogo/pid");
    expect(p.tag).toBe("stock-vid");
    expect(p.body).toMatch(/Top Run/);
    expect(p.body).toMatch(/2/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm exec vitest run src/server/domain/push/payloads.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/server/domain/push/payloads.ts
import { assertAdminDeepLink } from "./admin-url";
import type { AdminPushPayload } from "@/server/push/port";

function formatArsFromCents(cents: number): string {
  const pesos = (cents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  return pesos;
}

export function orderCreatedPayload(input: {
  orderId: string;
  code: string;
  totalCents: number;
}): AdminPushPayload {
  return {
    event: "order.created",
    title: "Nuevo pedido",
    body: `${input.code} · ${formatArsFromCents(input.totalCents)}`,
    url: assertAdminDeepLink(`/admin/pedidos/${input.orderId}`),
    tag: `order-${input.orderId}-created`,
  };
}

export function paymentConfirmedPayload(input: {
  orderId: string;
  code: string;
}): AdminPushPayload {
  return {
    event: "order.payment_confirmed",
    title: "Pago confirmado",
    body: input.code,
    url: assertAdminDeepLink(`/admin/pedidos/${input.orderId}`),
    tag: `order-${input.orderId}-paid`,
  };
}

export function stockLowPayload(input: {
  productId: string;
  variantId: string;
  productName: string;
  color: string;
  size: string;
  available: number;
}): AdminPushPayload {
  const label = [input.productName, input.color, input.size].filter(Boolean).join(" · ");
  return {
    event: "stock.low",
    title: "Stock bajo",
    body: `${label} · quedan ${input.available}`,
    url: assertAdminDeepLink(`/admin/catalogo/${input.productId}`),
    tag: `stock-${input.variantId}`,
  };
}
```

Note: `AdminPushPayload` is defined in Task 3 — if compile order hurts, define a local duplicate type in `payloads.ts` and re-export from port, **or** do Task 3 port file first without adapter. Prefer creating `port.ts` in the same commit as payloads if TS fails.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/push/payloads.ts src/server/domain/push/payloads.test.ts src/server/push/port.ts
git commit -S -m "$(cat <<'EOF'
feat(push): admin notification payload builders

EOF
)"
```

---

### Task 3: PushPort + console adapter + sendBestEffort

**Files:**
- Create: `src/server/push/port.ts`
- Create: `src/server/push/console.ts`
- Create: `src/server/domain/push/send-best-effort.ts`
- Create: `src/server/domain/push/send-best-effort.test.ts`

- [ ] **Step 1: port + console**

```ts
// src/server/push/port.ts
export type AdminPushEvent =
  | "order.created"
  | "order.payment_confirmed"
  | "stock.low";

export type AdminPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  event: AdminPushEvent;
};

export type PushPort = {
  sendToAdmins(payload: AdminPushPayload): Promise<void>;
};
```

```ts
// src/server/push/console.ts
import type { PushPort } from "./port";

export const consolePush: PushPort = {
  async sendToAdmins(payload) {
    console.info("[push:console]", payload.event, payload.title, payload.body, payload.url);
  },
};
```

```ts
// src/server/domain/push/send-best-effort.ts
import type { AdminPushPayload, PushPort } from "@/server/push/port";

export async function sendAdminPushBestEffort(
  push: PushPort,
  payload: AdminPushPayload,
): Promise<void> {
  try {
    await push.sendToAdmins(payload);
  } catch {
    // best-effort
  }
}
```

- [ ] **Step 2: Test best-effort swallows errors**

```ts
import { describe, expect, it, vi } from "vitest";
import { sendAdminPushBestEffort } from "./send-best-effort";

describe("sendAdminPushBestEffort", () => {
  it("does not throw when push fails", async () => {
    const push = {
      sendToAdmins: vi.fn().mockRejectedValue(new Error("boom")),
    };
    await expect(
      sendAdminPushBestEffort(push, {
        title: "t",
        body: "b",
        url: "/admin",
        tag: "t1",
        event: "order.created",
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run PASS + commit**

```bash
pnpm exec vitest run src/server/domain/push/
git add src/server/push src/server/domain/push
git commit -S -m "$(cat <<'EOF'
feat(push): PushPort, console adapter, best-effort helper

EOF
)"
```

---

### Task 4: Migration + DB types

**Files:**
- Create: `supabase/migrations/20261009120000_push_subscriptions.sql`
- Modify: `src/server/db/types.ts` (add table under `public.Tables`)

- [ ] **Step 1: Migration SQL**

```sql
-- Admin Web Push subscriptions (service role via tRPC only)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);

create index push_subscriptions_admin_user_id_idx
  on public.push_subscriptions (admin_user_id);

alter table public.push_subscriptions enable row level security;

-- No direct client access; server uses service role after adminProcedure
create policy push_subscriptions_deny_all on public.push_subscriptions
  for all using (false) with check (false);
```

- [ ] **Step 2: Add types** — mirror other tables in `types.ts`. Minimal `Row` / `Insert` / `Update` / `Relationships: []`.

Example shape:

```ts
"push_subscriptions": {
  Row: {
    id: string;
    admin_user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    admin_user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    admin_user_id?: string;
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    user_agent?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
};
```

- [ ] **Step 3: Apply locally**

```bash
pnpm exec supabase db reset
```

Expected: migrations + seed OK.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261009120000_push_subscriptions.sql src/server/db/types.ts
git commit -S -m "$(cat <<'EOF'
feat(db): push_subscriptions table for admin Web Push

EOF
)"
```

---

### Task 5: web-push dependency + adapter (TDD prune logic)

**Files:**
- Modify: `package.json` / lockfile via pnpm
- Create: `src/server/push/web-push-adapter.ts`
- Create: `src/server/push/web-push-adapter.test.ts`
- Create: `src/server/push/resolve.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install**

```bash
pnpm add web-push
pnpm add -D @types/web-push
```

- [ ] **Step 2: Adapter with injectable sender for tests**

Implement `createWebPushAdapter(db, opts?)` where `opts.sendNotification` defaults to `webpush.sendNotification`.

On statusCode **404** or **410**: `db.from("push_subscriptions").delete().eq("endpoint", endpoint)`.

Load all rows, `Promise.allSettled` sends.

```ts
// src/server/push/resolve.ts
import type { ServiceClient } from "@/server/db/supabase";
import { consolePush } from "./console";
import type { PushPort } from "./port";
import { createWebPushAdapter } from "./web-push-adapter";

export function resolvePush(db: ServiceClient): PushPort {
  if (
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  ) {
    return createWebPushAdapter(db, {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT,
    });
  }
  return consolePush;
}
```

- [ ] **Step 3: Unit test prune on 410**

Mock `db.from().select` returning one sub; mock send throwing `{ statusCode: 410 }`; expect delete called with that endpoint.

- [ ] **Step 4: `.env.example` append**

```env
# Admin Web Push (VAPID) — generate: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:ops@activatemodadeportiva.com
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/server/push .env.example
git commit -S -m "$(cat <<'EOF'
feat(push): web-push VAPID adapter and env template

EOF
)"
```

---

### Task 6: tRPC `admin.push` router

**Files:**
- Create: `src/server/trpc/routers/admin/push.ts`
- Modify: `src/server/trpc/routers/app.ts`
- Modify: `src/server/trpc/context.ts` — add `push: resolvePush(db)`
- Modify: `docs/contracts/procedure-map.md`

- [ ] **Step 1: Router**

```ts
// src/server/trpc/routers/admin/push.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../../init";

export const adminPushRouter = createTRPCRouter({
  getVapidPublicKey: adminProcedure.query(() => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "VAPID_PUBLIC_KEY not configured",
      });
    }
    return { publicKey };
  }),

  status: adminProcedure
    .input(z.object({ endpoint: z.string().min(1).optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!input?.endpoint) return { enabledOnDevice: false };
      const { data } = await ctx.db
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", input.endpoint)
        .eq("admin_user_id", ctx.adminUserId!)
        .maybeSingle();
      return { enabledOnDevice: !!data };
    }),

  subscribe: adminProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
        userAgent: z.string().max(512).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      const { error } = await ctx.db.from("push_subscriptions").upsert(
        {
          admin_user_id: ctx.adminUserId!,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent ?? null,
          updated_at: now,
        },
        { onConflict: "endpoint" },
      );
      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return { ok: true as const };
    }),

  unsubscribe: adminProcedure
    .input(z.object({ endpoint: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", input.endpoint)
        .eq("admin_user_id", ctx.adminUserId!);
      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return { ok: true as const };
    }),
});
```

- [ ] **Step 2: Mount**

In `app.ts`:

```ts
import { adminPushRouter } from "./admin/push";
// ...
admin: createTRPCRouter({
  catalog: adminCatalogRouter,
  orders: adminOrdersRouter,
  settings: adminSettingsRouter,
  push: adminPushRouter,
}),
```

- [ ] **Step 3: Context**

```ts
import { resolvePush } from "@/server/push/resolve";
// ...
push: resolvePush(db),
```

- [ ] **Step 4: procedure-map** — add section `admin.push` with the four procedures (mirror style of `admin.settings`).

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc docs/contracts/procedure-map.md
git commit -S -m "$(cat <<'EOF'
feat(api): admin.push subscribe/unsubscribe tRPC procedures

EOF
)"
```

---

### Task 7: Wire domain — placeOrder + confirmPayment + low stock

**Files:**
- Modify: `src/server/domain/checkout/place-order.ts`
- Modify: `src/server/domain/checkout/place-order.test.ts`
- Modify: `src/server/domain/orders/transitions.ts`
- Modify: `src/server/domain/orders/transitions.test.ts` (if deps type breaks)
- Modify: `src/server/domain/payments/handle-payway-notification.ts`
- Modify: `src/server/trpc/routers/checkout.ts`
- Modify: `src/server/trpc/routers/admin/orders.ts`
- Modify: `src/app/api/payway/notifications/route.ts`
- Modify: `docs/contracts/domain-invariants.md`

- [ ] **Step 1: Extend deps**

```ts
// PlaceOrderDeps
push: PushPort;

// TransitionDeps
push: PushPort;

// HandlePaywayNotificationDeps
push: PushPort;
```

- [ ] **Step 2: After customer email in `placeOrder`**

1. `sendAdminPushBestEffort(deps.push, orderCreatedPayload({ orderId, code, totalCents }))`.
2. For each priced line, compute `before = available` from the stock check already done in `quote` (expose available on quote lines **or** re-read availability). Simplest robust approach after RPC success:

```ts
// After order commit, for each merged line:
// beforeAvailable was known at quote time — capture from quote stockCheck if available.
// afterAvailable = beforeAvailable - qty
// if crossedLowStockThreshold(before, after) → stockLowPayload(...)
```

If `quote` does not return `available` per line today, extend quote result **minimally** with `available` on each line (used only server-side) **or** select variants + reservations after place and compute after, estimating before = after + qty (valid because place reserved `qty`). Prefer:

```ts
after = current available (variantsWithAvailability)
before = after + line.qty  // reservation just added
```

Load product name/color/size/product_id for payload from order_items or variant join.

- [ ] **Step 3: `confirmPayment`**

After email best-effort:

```ts
await sendAdminPushBestEffort(
  deps.push,
  paymentConfirmedPayload({ orderId: order.id, code: order.code }),
);
```

- [ ] **Step 4: Thread `ctx.push` / `resolvePush(db)`** through checkout router, admin orders router, payway route.

- [ ] **Step 5: Tests**

In `place-order.test.ts` add `push: { sendToAdmins: vi.fn() }` to deps; assert called with `order.created` after success; assert order still succeeds when push rejects.

In transitions test: mock push on confirmPayment.

- [ ] **Step 6: domain-invariants.md** short section:

```markdown
## Admin Web Push

- Best-effort only (same as email): failures never fail placeOrder / confirmPayment.
- Events: order created, payment confirmed, stock low (available ≤ 2, edge into band only).
- No customer PII or access_token in push payloads.
```

- [ ] **Step 7: Run tests**

```bash
pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add src/server/domain src/server/trpc/routers src/app/api/payway docs/contracts/domain-invariants.md
git commit -S -m "$(cat <<'EOF'
feat(push): notify admins on order, payment, and low stock

EOF
)"
```

---

### Task 8: Service worker push handlers

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Append handlers** (keep existing install/activate/fetch)

```js
self.addEventListener("push", (event) => {
  let data = { title: "Activate Admin", body: "", url: "/admin", tag: "admin" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* ignore */
  }
  const url = typeof data.url === "string" && data.url.startsWith("/admin") ? data.url : "/admin";
  event.waitUntil(
    self.registration.showNotification(data.title || "Activate Admin", {
      body: data.body || "",
      tag: data.tag || "admin",
      data: { url },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path =
    event.notification.data &&
    typeof event.notification.data.url === "string" &&
    event.notification.data.url.startsWith("/admin")
      ? event.notification.data.url
      : "/admin";
  const targetUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
```

- [ ] **Step 2: Bump `CACHE` constant** (e.g. `activate-pwa-v20-admin-push`) so clients refresh SW.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -S -m "$(cat <<'EOF'
feat(pwa): handle Web Push and notification click in SW

EOF
)"
```

---

### Task 9: Admin-only PWA manifest

**Files:**
- Create: `src/app/admin/manifest.ts`
- Modify: `src/app/admin/layout.tsx` metadata `manifest`
- Modify: `src/app/manifest.ts` — optional: remove Admin shortcut clutter or leave; **do not** change store `scope`/`start_url`

- [ ] **Step 1: Admin manifest**

```ts
// src/app/admin/manifest.ts
import type { MetadataRoute } from "next";

const THEME = "#1A1816";
const BG = "#F3EEE7";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Activate Admin",
    short_name: "Admin",
    description: "Panel de pedidos y catálogo — Activate Moda Deportiva",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: BG,
    theme_color: THEME,
    lang: "es-AR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

Next.js App Router: file at `src/app/admin/manifest.ts` serves `/admin/manifest.webmanifest`.

- [ ] **Step 2: Admin layout metadata**

```ts
export const metadata: Metadata = {
  // ...existing
  manifest: "/admin/manifest.webmanifest",
  applicationName: "Activate Admin",
  // keep appleWebApp title
};
```

Ensure root `src/app/layout.tsx` still uses storefront manifest for non-admin pages. Nested admin layout `manifest` should override for admin routes (verify in Next 16; if not, set via explicit `<link>` in admin layout head using the Metadata API only).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/manifest.ts src/app/admin/layout.tsx
git commit -S -m "$(cat <<'EOF'
feat(pwa): dedicated Activate Admin manifest (scope /admin)

EOF
)"
```

---

### Task 10: Admin opt-in UI

**Files:**
- Create: `src/components/admin/push-opt-in.tsx`
- Modify: `src/app/admin/config/page.tsx`

- [ ] **Step 1: Component behavior**

Client component:

1. If no `serviceWorker` / `PushManager` → unsupported message.
2. On mount: get SW registration; `pushManager.getSubscription()`; if endpoint, call `admin.push.status`.
3. **Activar:** `getVapidPublicKey` → `Notification.requestPermission` → `subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })` → `admin.push.subscribe` with keys from `subscription.toJSON()`.
4. **Desactivar:** unsubscribe local + `admin.push.unsubscribe`.
5. Spanish copy for iOS install steps (short).

Helper `urlBase64ToUint8Array` standard VAPID convert — put in `src/lib/push/vapid.ts`.

- [ ] **Step 2: Render on config page** above or below the settings form:

```tsx
import { AdminPushOptIn } from "@/components/admin/push-opt-in";
// ...
<AdminPushOptIn />
```

- [ ] **Step 3: Manual check list** (document in PR): install PWA, enable, place order on another device/session.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/push-opt-in.tsx src/lib/push src/app/admin/config/page.tsx
git commit -S -m "$(cat <<'EOF'
feat(admin): Web Push opt-in UI on config

EOF
)"
```

---

### Task 11: Verification + docs polish

**Files:**
- Modify: `AGENTS.md` quick table row (optional one line)
- Modify: `docs/FRONTEND-HANDOFF.md` only if it documents PWA install for admin

- [ ] **Step 1: Full verify**

```bash
pnpm test
pnpm lint
pnpm build
```

Expected: all pass.

- [ ] **Step 2: Self-check vs spec**

| Spec requirement | Task |
|------------------|------|
| order.created push | 7 |
| payment_confirmed push | 7 |
| stock.low edge ≤2 | 1 + 7 |
| push_subscriptions | 4 |
| admin.push.* | 6 |
| SW handlers | 8 |
| Admin PWA scope /admin | 9 |
| Opt-in UI | 10 |
| VAPID env | 5 |
| best-effort | 3 + 7 |
| worktree branch | 0 |

- [ ] **Step 3: Final commit if doc nits remain**

```bash
git commit -S -m "$(cat <<'EOF'
docs: note admin Web Push in AGENTS quick table

EOF
)"
```

---

## Ops after merge (human)

1. `npx web-push generate-vapid-keys` → set `VAPID_*` on host.
2. Run migration on cloud DB.
3. Deploy; hard-refresh admin; install **Activate Admin**; Activar notificaciones.
4. Smoke test order + payment + stock 3→2.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-10-09-admin-web-push.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session with executing-plans + checkpoints  

**Which approach?** Start with Task 0 (worktree) either way.
