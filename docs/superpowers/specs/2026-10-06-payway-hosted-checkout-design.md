# Payway hosted checkout — design

**Date:** 2026-10-06  
**Status:** Design approved in chat; awaiting user review of this file before implementation plan  
**Scope:** Replace transfer/cash checkout with Payway AR hosted payment form (payment link).  
**Out of PRD v1:** This was explicitly post-v1 in the original PRD; product now chooses to implement it as the sole payment method.

---

## 1. Goal

Buyers pay by card (and Payway-supported methods on the hosted form) via a Payway-hosted checkout. The store never handles PAN. Payment confirmation is automatic via Payway notifications (webhook). Installments are configurable. Transfer and cash leave the storefront.

**Success criteria**

1. Checkout offers only Payway + shipping + contact + installments selector.
2. `placeOrder` creates `pendiente_pago`, reserves stock 24h, returns a Payway `paymentLink`.
3. Buyer is redirected to Payway; on approval, webhook moves order to `pago_confirmado` without admin action.
4. Success/cancel return URLs land on order tracking (`/pedido?token=…`).
5. Unpaid orders still expire via existing 24h job.
6. Credentials live in env; no secrets in client bundles except public key if ever needed (v1 link flow keeps public key server-side).

---

## 2. Decisions locked

| Topic | Choice |
|-------|--------|
| Integration style | **A — Hosted payment link / form** (not embedded card form) |
| Payment methods in UI | **Payway only** (no transfer, no cash) |
| Pricing | List/promo product prices; **no payment-method discount** |
| Installments | Configurable list (e.g. `1,3,6`); buyer picks at checkout |
| Payment confirmation | **Automatic webhook** → existing `confirm_payment_tx` |
| Stock model | Unchanged: reserve on place, release on cancel/expire |
| Admin confirm payment | Not required for happy path; optional keep for ops recovery is **out of scope** unless webhook fails and ops need a manual path — **v1: webhook only**; admin may still cancel |

---

## 3. Current system (baseline)

- `PaymentMethod = "transfer" | "cash"`; cash ⇒ pickup only.
- Totals: subtotal → discount via `payment_discount_bps` → shipping → total (integer cents).
- `placeOrder` → RPC `place_order_tx` → email `order_created` (CBU copy if transfer).
- Admin `confirmPayment` → RPC `confirm_payment_tx` → email `payment_confirmed`.
- Payment proofs bucket for transfer; not used after this change for new orders.
- Cron expires `pendiente_pago` after 24h.

---

## 4. Target buyer flow

```text
Cart
  → Checkout (name, phone, email, shipping, installments)
  → checkout.placeOrder { paymentMethod: "payway", installments }
  → Server: quote (no payment discount) → place_order_tx → create Payway link
  → Response: order + paymentLink
  → Browser redirect to paymentLink
  → Payway hosted form
  → notifications_url POST → confirmPayment (idempotent)
  → success_url / cancel_url → /pedido?token=<access_token>
```

**Retry unpaid:** Order tracking for `pendiente_pago` + `payway` shows “Completar pago”; server regenerates a payment link (same `site_transaction_id` rules as below).

---

## 5. Architecture

### 5.1 Layers

| Layer | Responsibility |
|-------|----------------|
| `src/server/payments/payway/` | PaywayPort + HTTP adapter (create link, verify/fetch payment, parse notification) |
| Domain checkout/orders | `paymentMethod: payway`, installments validation, totals without discount, call port after place |
| `src/app/api/payway/notifications/route.ts` | Webhook HTTP entry (not tRPC) |
| tRPC checkout | Thin: placeOrder / optional `createPaymentLink` for retry |
| Storefront checkout + pedido | Redirect + retry CTA; remove transfer/cash UI |
| Admin | Show Payway ids; hide transfer-proof primary flow for payway orders |

Routers stay thin. Domain owns rules. Payway HTTP is isolated behind a port (same pattern as EmailPort / StoragePort).

### 5.2 PaywayPort (sketch)

```ts
type CreateCheckoutLinkInput = {
  siteTransactionId: string; // stable id for this order payment attempt policy
  amountCents: number;       // Payway amount field: document adapter conversion
  currency: "ARS";
  installments: number;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  redirectUrl?: string;
  notificationsUrl: string;
  products: { id: string; quantity: number; value: number; description: string }[];
};

type CreateCheckoutLinkResult = {
  paymentLink: string;
  paywayPaymentId?: string;
};

type PaywayPort = {
  createCheckoutLink(input: CreateCheckoutLinkInput): Promise<CreateCheckoutLinkResult>;
  /** Defense-in-depth after webhook: confirm status/amount with Payway API */
  getPayment(paywayPaymentId: string): Promise<{
    status: string;
    amountCents: number;
    siteTransactionId: string;
  }>;
};
```

Adapter uses official Payway Node patterns (`sdk-node-payway` / REST equivalent): `checkoutHash` → payments link, env-based ambient `developer` | `production`.

**Amount encoding:** Payway docs/SDK samples mix “decimal pesos” and integer-looking values. The adapter **must** convert from our integer cents to the exact unit Payway expects for the account (document in adapter + one integration test fixture). Default assumption to validate in sandbox: amount in **cents as integer** (as in modern TS SDK examples) — confirm against sandbox before production.

### 5.3 Identifiers

- `orders.payway_site_transaction_id`: set once at first link creation to `order.id` (UUID) unless Payway length/charset rejects UUIDs — then use `order.code` (`ACT-…`). **One stable value per order** for idempotent retries (regenerating link reuses same id where API allows; if Payway requires unique id per attempt, append `-n` attempt counter stored on order).
- `orders.payway_payment_id`: last known Payway payment/operation id from link response or webhook.
- `orders.installments`: int ≥ 1 chosen at placeOrder.

### 5.4 Webhook

`POST /api/payway/notifications`

1. Parse body (store raw payload if `payway_webhook_events` table exists).
2. Resolve order by `site_transaction_id` / stored id.
3. If order already `pago_confirmado` or beyond → 200 OK (idempotent).
4. If still `pendiente_pago`: optionally `getPayment` to verify approved status and **amount matches `total_cents`**.
5. Call domain `confirmPayment(orderId)`.
6. Return 200.

Do **not** trust success_url query params alone to confirm payment.

### 5.5 Return URLs

- `success_url` / `cancel_url` / `redirect_url`: `{APP_URL}/pedido?token={access_token}` (and optional `payway=1` query for copy only).
- Tracking page already shows status banner; if webhook lags, user may briefly see `pendiente_pago` — acceptable; optional client refetch interval is nice-to-have, not required for v1.

---

## 6. Data model

### 6.1 Env (`.env.example`)

```bash
PAYWAY_PUBLIC_KEY=
PAYWAY_PRIVATE_KEY=
PAYWAY_SITE_ID=
PAYWAY_TEMPLATE_ID=1
PAYWAY_ENV=developer
# Comma-separated allowed installments (fallback if not in store_settings)
PAYWAY_INSTALLMENTS=1
```

- `PAYWAY_TEMPLATE_ID`: `1` = standard hosted form; `2` = Cybersource-enabled template (only if merchant is configured for it).
- Private key **never** `NEXT_PUBLIC_*`.
- `NEXT_PUBLIC_APP_URL` already exists — base for return and notification URLs.

Notification URL: `{NEXT_PUBLIC_APP_URL}/api/payway/notifications` (must be publicly reachable in production).

### 6.2 Schema migration

1. Extend enum `payment_method` with `'payway'`.
   - Keep `'transfer' | 'cash'` in DB for historical rows if any exist; **application** only accepts `payway` for new quotes/orders.
2. `orders` columns:
   - `installments int not null default 1 check (installments >= 1)`
   - `payway_site_transaction_id text null`
   - `payway_payment_id text null`
3. Optional: `payway_webhook_events (id, received_at, payload jsonb, order_id null, processed_at null, error text null)`.
4. `store_settings`:
   - `payway_installments int[] not null default '{1}'` (or `text` parsed as CSV — prefer `int[]`).
   - `payment_discount_bps` may remain in DB but **is not applied** when computing totals for payway (and transfer/cash are not offered). Free-shipping threshold uses subtotal with **zero** payment discount: `baseAfterDiscount = subtotalCents`.

5. Constraint `cash_requires_pickup`: keep for legacy rows; payway has no shipping restriction beyond existing andreani address rules.

### 6.3 Totals algorithm (updated)

1. `subtotalCents` = Σ unitPrice × qty  
2. `discountCents` = **0** for `payway`  
3. `shippingCents` = pickup 0; andreani 0 if `subtotalCents >= free_shipping_threshold_cents` else fee  
4. `totalCents` = subtotal − discount + shipping  

Validate `installments ∈ configured allow-list`.

Remove UI/domain paths that apply `payment_discount_bps` for the live checkout path.

---

## 7. API / contracts

### 7.1 tRPC

**`checkout.quote` / `checkout.placeOrder`**

- Input `paymentMethod`: `"payway"` only (Zod).
- Input `installments`: positive int (required for placeOrder; quote may default 1).
- Output `placeOrder`: existing order fields + `payment_link: string | null`.
  - If link creation fails after order commit: order exists, `payment_link: null`, surface `PAYWAY_LINK_FAILED` (tRPC error **or** soft field + domainCode — prefer **throw after commit is bad**; better: return order + `payment_link: null` and domain warning, or separate mutation).  
  - **Chosen behavior:** commit order first; then create link; if link fails, return success payload with `payment_link: null` and `link_error: "PAYWAY_LINK_FAILED"` so UI can call retry. Do not roll back stock reservation.

**`checkout.createPaymentLink`** (new)

- Input: `{ token: string }` or `{ code + … }` — **token only** (same secrecy as tracking).
- Only if order `pendiente_pago` and `payment_method = payway` and reservation not expired.
- Returns `{ payment_link }`.

Admin procedures: no change required for status machine; payment proofs can stay for legacy transfer orders.

### 7.2 HTTP

- `POST /api/payway/notifications` — as §5.4.
- Cron expire — unchanged.

### 7.3 Domain error codes (add)

| Code | Meaning |
|------|---------|
| `PAYWAY_CONFIG_MISSING` | Required env not set |
| `PAYWAY_LINK_FAILED` | Payway API error creating link |
| `PAYWAY_NOTIFICATION_INVALID` | Bad payload / amount mismatch / unknown order |
| `INSTALLMENTS_NOT_ALLOWED` | installments not in allow-list |

---

## 8. Frontend

### 8.1 Checkout (`src/app/checkout/page.tsx`)

- Remove `transfer` / `cash` selector.
- Add installments select from `settings.getPublic.payway_installments` (expose on public settings).
- On success: if `payment_link` → `window.location.assign(payment_link)`; else show error + link to pedido with token if returned.
- Shipping rules: payway works with pickup and andreani (no cash-only restriction).

### 8.2 Order tracking

- Status `pendiente_pago` + payway: CTA “Pagar con Payway” → `createPaymentLink`.
- Remove transfer CBU / proof upload prompts for payway orders (proof UI can remain gated to `payment_method === 'transfer'` for legacy).

### 8.3 Marketing / info pages

- `/medios-de-pago`, promo bar (`formatPromoBarCopy`), home promo: remove “10% transferencia” messaging; describe card via Payway.
- Admin config: stop emphasizing CBU as primary; optional keep field unused.

### 8.4 Admin orders

- Display `installments`, `payway_payment_id`, `payway_site_transaction_id`.
- Confirm-payment button: hide for payway when already confirmed; **v1 may hide confirm for payway entirely** (webhook-only). Ops recovery can use SQL/support — document in OPS.

---

## 9. Email

- `order_created`: for payway, include “completar pago” deep link to `/pedido?token=…` (and optionally note redirect already happened). No CBU block.
- `payment_confirmed`: unchanged trigger (now from webhook path).

---

## 10. Security

1. Private API key only on server.  
2. Webhook must not confirm solely on “hit success_url”.  
3. Verify amount and approved status (API get payment and/or signed notification if Payway provides it — implement whatever the live notification payload supports; if unsigned, **always** `getPayment` before confirm).  
4. Notification endpoint: no auth cookie; rely on obscurity is insufficient — verification via Payway API is mandatory.  
5. Rate-limit retry link creation lightly (optional).  
6. Never log full card data (N/A for hosted form). Log Payway payment ids only.

---

## 11. Testing

| Type | Cases |
|------|--------|
| Unit | Totals with payway (discount 0); installments allow-list; combo rules without cash |
| Unit | Payway adapter request shape (mocked fetch) |
| Integration | placeOrder payway + mock port returns link; webhook confirms; duplicate webhook; expire unpaid payway; createPaymentLink when pending |
| Manual sandbox | Real keys in `.env.local`, one approved payment, one cancel, one expire |

CI must not call real Payway.

---

## 12. Docs to update in the same change set

- `docs/contracts/domain-invariants.md` — totals, payment methods, new errors  
- `docs/contracts/procedure-map.md` — checkout I/O, new procedure  
- `docs/contracts/backend-for-frontend.md` — client examples  
- `AGENTS.md` — remove “do not add Payway” ban; note payway is live  
- `.env.example` — Payway vars  
- PRD residual notes optional (changelog only)

---

## 13. Rollout

1. Ship behind env: if `PAYWAY_PRIVATE_KEY` missing, placeOrder payway fails with `PAYWAY_CONFIG_MISSING` (no half-broken checkout).  
2. Sandbox (`PAYWAY_ENV=developer`) first.  
3. Production keys + public HTTPS notification URL.  
4. Monitor webhook events / failed confirms.

---

## 14. Out of scope (explicit)

- Embedded card form / JS `createToken` on our domain  
- Refunds API, partial capture, two-step auth/capture  
- Interest-bearing installment pricing / surcharge tables  
- Keeping transfer/cash in storefront  
- Buyer accounts  
- Cybersource retail basket fields beyond what template_id=2 requires by default (if template 2 is used, pass minimal required fraud payload only when Payway rejects without it — spike in sandbox)

---

## 15. Open implementation notes (not product blockers)

1. Exact Payway notification JSON schema — implement parser from sandbox capture; keep raw event log.  
2. Amount unit (cents vs pesos with decimals) — validate in sandbox before prod.  
3. Whether regenerated links may reuse `site_transaction_id` — follow Payway behavior; use attempt suffix if required.

---

## 16. Approach rejected (record)

- **B — Create Payway session before order:** breaks reservation-first model.  
- **C — Embedded tokenization:** higher PCI/UI complexity; user chose hosted link.
