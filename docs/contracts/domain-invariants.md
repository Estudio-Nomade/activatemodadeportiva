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
- `assertLinesInStock`: if any line `qty > available` → `STOCK_INSUFFICIENT`.
- `placeOrder` reserves stock atomically (RPC); oversell races still fail with stock error.

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
