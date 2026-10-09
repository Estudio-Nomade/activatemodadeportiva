# Backend for frontend (tRPC)

Also read: [`AGENTS.md`](../../AGENTS.md) · [`domain-invariants.md`](./domain-invariants.md) · [`procedure-map.md`](./procedure-map.md)

## Install

Same major versions as the app:

- `@trpc/client`
- `superjson`
- (optional) `@trpc/react-query` if using React Query bindings

Import the **type only** of the router:

```ts
import type { AppRouter } from "@/server/trpc/routers/app";
// or from a published types package once split
```

## Client setup

```ts
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/routers/app";

export function createApiClient(opts?: { getAccessToken?: () => string | null }) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/trpc`,
        transformer: superjson,
        headers() {
          const token = opts?.getAccessToken?.();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
```

**Must** use `superjson` on both client and server (server already does in `src/server/trpc/init.ts`).

## Admin auth

1. Sign in with Supabase Auth (email/password or whatever is configured).
2. Ensure `admin_profiles.user_id` contains that user.
3. Pass the session **access_token** as `Authorization: Bearer <token>` on every admin procedure.

Without a valid admin profile → tRPC `UNAUTHORIZED` or `FORBIDDEN`.

## Examples

### Quote

```ts
const quote = await client.checkout.quote.mutate({
  lines: [{ variantId: "...", qty: 1 }],
  shippingMethod: "pickup",
  paymentMethod: "payway",
  installments: 1,
});
// use quote.totalCents for display only — never send totals back to charge
```

### Place order

```ts
const order = await client.checkout.placeOrder.mutate({
  lines: [{ variantId: "...", qty: 1 }],
  shippingMethod: "andreani",
  paymentMethod: "payway",
  installments: 1,
  customerName: "Ana",
  phone: "+54...",
  email: "ana@example.com",
  // required when shippingMethod === "andreani"
  shippingAddress: { line1: "Calle 123", city: "La Plata", postalCode: "1900" },
});
// Keep order.access_token only from placeOrder / email magic link — never from getByCode
```

### Payment proof upload

Buyer flow on `/pedido` (transfer + `pendiente_pago`):

1. Choose file (image/PDF) — local preview only.
2. Tap **Enviar comprobante** → `createProofUploadUrl` → PUT signed URL → `uploadPaymentProof`.
3. Server inserts `payment_proofs` row and best-effort emails `store_settings.contact_email` (admin ops).

```ts
const upload = await client.orders.createProofUploadUrl.mutate({
  token, // or code
  fileName: "comprobante.jpg",
});
// PUT file to upload.signedUrl
await client.orders.uploadPaymentProof.mutate({
  token,
  storagePath: upload.path, // must be payment-proofs/{orderId}/...
});
```

### Public order lookup

```ts
const byCode = await client.orders.getByCode.query({ code: order.code });
const byToken = await client.orders.getByToken.query({ token: order.access_token });
```

### Payment proof

1. Obtain a signed upload URL (Storage port / future procedure) for bucket `payment-proofs`.
2. PUT the file to the signed URL.
3. Confirm:

```ts
await client.orders.uploadPaymentProof.mutate({
  token: order.access_token,
  storagePath: "proofs/<orderId>/<filename>",
});
```

## Errors

```ts
try {
  await client.checkout.placeOrder.mutate(...);
} catch (e) {
  // TRPCClientError
  const domainCode = e.data?.domainCode as string | undefined;
  // e.g. STOCK_INSUFFICIENT, INVALID_PAYMENT_SHIPPING_COMBO
}
```

See `docs/contracts/domain-invariants.md` for codes.

## Rules for UI

1. **Never trust client totals** — always show server `quote` / order `*_cents`.
2. Cart is **client-only**; there is no carts table. Re-quote before checkout.
3. Cash + shipping other than pickup will fail server-side.
4. After placeOrder, stock is reserved **24h**; show `reservation_expires_at`.
5. Product image public URLs: bucket `product-images` (public). Proofs: `payment-proofs` (private, signed download).

## Procedure catalog

Full input/output list: `docs/contracts/procedure-map.md`.
