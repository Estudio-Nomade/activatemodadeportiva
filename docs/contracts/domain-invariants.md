# Domain invariants (Activate backend)

Operational rules the API and UI must respect. Server is source of truth.

## Money

- All amounts are **integer cents** (ARS). Never floats for totals.
- Unit price for a line: `promo_price_cents ?? list_price_cents` on the product.

## Totals algorithm (`calculateTotals`)

Order of operations:

1. **subtotalCents** = Σ (`unitPriceCents * qty`) over lines
2. **discountCents** = `floor(subtotalCents * paymentDiscountBps / 10_000)`  
   (`payment_discount_bps` from `store_settings`; applies to transfer/cash policy as configured server-side)
3. **shippingCents**:
   - `pickup` → `0`
   - `andreani` → `0` if `(subtotalCents - discountCents) >= free_shipping_threshold_cents`, else `andreani_fee_cents`
4. **totalCents** = `subtotalCents - discountCents + shippingCents`

### Payment × shipping combo

- **cash** is only valid with **pickup**. Otherwise `INVALID_PAYMENT_SHIPPING_COMBO`.

**Never trust client-computed totals.** Quote and placeOrder recompute on the server.

## Stock

```
available = stock_on_hand - sum(active reservation qty for variant)
```

- Reservations with `status = 'active'` count against availability.
- Catalog `getProduct` exposes **`available`** per variant — use that for cart UI.
- Catalog `listProducts` / `search` expose **`is_sold_out`** (all variants `available <= 0`, or no variants) for grid badges.
- Duplicate `variantId` lines are **merged** (sum qty) before stock checks.
- Only **published** products can be quoted/ordered.
- `assertLinesInStock`: if any line `qty > available` → `STOCK_INSUFFICIENT`.
- `placeOrder` / `confirmPayment` / `cancelOrder` use atomic SQL RPCs (`place_order_tx`, `confirm_payment_tx`, `cancel_order_tx`).

## Shipping address

- `andreani` requires `shippingAddress` with at least `line1`, `city`, `postalCode`.
- `pickup` does not require address.

## Tracking secrets

- `orders.getByCode` does **not** return `access_token`.
- Magic link uses `access_token` via `getByToken` / email only.
- Order codes are high-entropy (`ACT-` + 10 chars), not sequential 6-digit.

## Reservation window (24h)

- On `placeOrder`, `reservation_expires_at = now + 24 hours`.
- While status is `pendiente_pago`, stock stays reserved.
- Cron / `jobs:expire` cancels orders where `status = pendiente_pago` and `reservation_expires_at < now` (`cancel_reason = expired`), releasing reservations.

## Order status machine

| From | To | Notes |
|------|-----|--------|
| `pendiente_pago` | `pago_confirmado`, `cancelado` | |
| `pago_confirmado` | `preparando`, `cancelado` | |
| `preparando` | `listo_retiro` | only if `shipping_method = pickup` |
| `preparando` | `enviado` | only if `shipping_method = andreani` |
| `preparando` | `cancelado` | |
| `listo_retiro` | `entregado`, `cancelado` | |
| `enviado` | `entregado`, `cancelado` | |
| `entregado` / `cancelado` | — | terminal |

Invalid move → `INVALID_TRANSITION`.

Cancel reasons: `admin` | `expired`.

## Domain error codes (`data.domainCode`)

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Bad input / missing fields |
| `UNAUTHORIZED` | Missing/invalid auth (also tRPC `UNAUTHORIZED`) |
| `FORBIDDEN` | Authenticated but not admin |
| `STOCK_INSUFFICIENT` | Not enough available stock |
| `INVALID_PAYMENT_SHIPPING_COMBO` | cash without pickup |
| `ORDER_NOT_FOUND` | Unknown code/token/id |
| `ORDER_NOT_PENDING` | e.g. proof upload when not `pendiente_pago` |
| `RESERVATION_EXPIRED` | Action after reservation window (when used) |
| `INVALID_TRANSITION` | Status machine violation |
| `CONFLICT` | Concurrent update / conflict |

Domain errors surface as tRPC `BAD_REQUEST` with `cause` mapped into `error.data.domainCode`.
