"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotonAddressField } from "@/components/checkout/photon-address-field";
import { useCart } from "@/lib/cart/store";
import { domainCode, errorMessage } from "@/lib/errors";
import { formatArsCents } from "@/lib/format/money";
import { trpc } from "@/lib/trpc/client";

type Ship = "pickup" | "andreani";

type FieldErrors = Partial<
  Record<"customerName" | "phone" | "email" | "line1" | "city" | "postalCode" | "photon", string>
>;

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const settings = trpc.settings.getPublic.useQuery();
  const quoteMut = trpc.checkout.quote.useMutation();
  const placeMut = trpc.checkout.placeOrder.useMutation();

  const [shippingMethod, setShippingMethod] = useState<Ship>("pickup");
  const [installmentsChoice, setInstallmentsChoice] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photonQuery, setPhotonQuery] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [line2, setLine2] = useState("");
  const [province, setProvince] = useState("");
  const [addressPicked, setAddressPicked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [stockBlock, setStockBlock] = useState(false);

  const installmentOptions = settings.data?.payway_installments?.length
    ? settings.data.payway_installments
    : [1];
  const installments =
    installmentsChoice != null && installmentOptions.includes(installmentsChoice)
      ? installmentsChoice
      : (installmentOptions[0] ?? 1);

  const cartInput = useMemo(
    () => lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
    [lines],
  );

  const shippingAddress =
    shippingMethod === "andreani"
      ? {
          line1,
          city,
          postalCode,
          line2: line2 || undefined,
          province: province || undefined,
        }
      : null;

  const andreaniReady =
    shippingMethod !== "andreani" ||
    (line1.trim().length > 0 && city.trim().length > 0 && postalCode.trim().length > 0);

  useEffect(() => {
    if (cartInput.length === 0) return;
    if (!andreaniReady) return;
    const t = setTimeout(() => {
      quoteMut.mutate({
        lines: cartInput,
        shippingMethod,
        paymentMethod: "payway",
        shippingAddress,
        installments,
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartInput, shippingMethod, installments, line1, city, postalCode, line2, province, andreaniReady]);

  const quote = quoteMut.data;
  const freeThreshold = settings.data?.free_shipping_threshold_cents ?? 0;
  const quoteBaseAfterDiscount =
    quote != null ? quote.subtotalCents - quote.discountCents : null;
  const needsMoreForFree =
    shippingMethod === "andreani" &&
    freeThreshold > 0 &&
    quoteBaseAfterDiscount != null &&
    quoteBaseAfterDiscount < freeThreshold &&
    (quote?.shippingCents ?? 0) > 0
      ? freeThreshold - quoteBaseAfterDiscount
      : 0;

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!customerName.trim()) next.customerName = "Completá tu nombre";
    if (!phone.trim()) next.phone = "Completá el teléfono";
    if (!email.trim()) next.email = "Completá el email";
    else if (!isEmail(email)) next.email = "Email inválido";

    if (shippingMethod === "andreani") {
      if (!line1.trim()) next.line1 = "Calle y número requeridos";
      if (!city.trim()) next.city = "Ciudad requerida";
      if (!postalCode.trim()) next.postalCode = "Código postal requerido";
      if (!addressPicked && !photonQuery.trim() && !line1.trim()) {
        next.photon = "Buscá o completá la dirección";
      }
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onConfirm() {
    setFormError(null);
    setStockBlock(false);
    if (!validate()) {
      setFormError("Revisá los campos marcados.");
      return;
    }
    try {
      const order = await placeMut.mutateAsync({
        lines: cartInput,
        shippingMethod,
        paymentMethod: "payway",
        installments,
        customerName: customerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        shippingAddress,
      });
      clear();
      if (typeof window !== "undefined" && order.access_token) {
        window.sessionStorage.setItem(`order_token_${order.code}`, order.access_token);
      }
      if (order.payment_link) {
        window.location.assign(order.payment_link);
        return;
      }
      setFormError(
        order.link_error
          ? "No pudimos abrir Payway. Completá el pago desde el seguimiento del pedido."
          : null,
      );
      router.push(
        `/pedido?token=${encodeURIComponent(order.access_token)}`,
      );
    } catch (e) {
      const code = domainCode(e);
      if (code === "STOCK_INSUFFICIENT") {
        setStockBlock(true);
        setFormError("Stock insuficiente. Revisá el carrito.");
      } else if (code === "INSTALLMENTS_NOT_ALLOWED") {
        setFormError("Cuotas no disponibles. Elegí otra opción.");
      } else if (code === "VALIDATION_ERROR") {
        setFormError(errorMessage(e, "Datos incompletos para el envío."));
      } else setFormError(errorMessage(e));
    }
  }

  if (lines.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p>No hay productos para checkout.</p>
        <Link href="/carrito" className="btn btn-secondary mx-auto mt-4 max-w-xs">
          Ir al carrito
        </Link>
      </div>
    );
  }

  if (stockBlock) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger/10 text-2xl text-danger">
          !
        </div>
        <h1 className="text-xl font-bold">Sin stock suficiente</h1>
        <p className="text-sm text-muted">
          Algún ítem se agotó o superó el disponible. Ajustá cantidades en el carrito e intentá de
          nuevo.
        </p>
        <Link href="/carrito" className="btn btn-primary">
          Volver al carrito
        </Link>
        <Link href="/" className="btn btn-secondary">
          Seguir comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] md:items-start md:gap-10 md:space-y-0 md:px-6 lg:gap-14 lg:px-8 lg:py-10">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold md:text-3xl">Tu compra</h1>

        <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
          <h2 className="font-bold">Tus datos</h2>
          <Field
            id="name"
            label="Nombre y apellido"
            value={customerName}
            error={fieldErrors.customerName}
            onChange={setCustomerName}
          />
          <Field
            id="phone"
            label="Teléfono"
            value={phone}
            error={fieldErrors.phone}
            onChange={setPhone}
            inputMode="tel"
          />
          <Field
            id="email"
            label="Email"
            value={email}
            error={fieldErrors.email}
            onChange={setEmail}
            type="email"
          />
        </section>

        <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
          <h2 className="font-bold">Envío</h2>
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="radio"
              name="ship"
              checked={shippingMethod === "pickup"}
              onChange={() => setShippingMethod("pickup")}
            />
            Retiro en local · San Manuel (gratis)
          </label>
          <label className="flex min-h-12 items-center gap-3">
            <input
              type="radio"
              name="ship"
              checked={shippingMethod === "andreani"}
              onChange={() => setShippingMethod("andreani")}
            />
            Andreani a domicilio
          </label>

          {shippingMethod === "andreani" ? (
            <div className="mt-2 space-y-3 border-t border-border pt-3">
              <PhotonAddressField
                value={photonQuery}
                error={fieldErrors.photon}
                onQueryChange={(q) => {
                  setPhotonQuery(q);
                  setAddressPicked(false);
                }}
                onSelect={(addr) => {
                  setPhotonQuery(addr.label);
                  setLine1(addr.line1);
                  setCity(addr.city);
                  setPostalCode(addr.postalCode);
                  setProvince(addr.province ?? "");
                  setAddressPicked(true);
                  setFieldErrors((fe) => ({
                    ...fe,
                    photon: undefined,
                    line1: undefined,
                    city: undefined,
                    postalCode: addr.postalCode ? undefined : fe.postalCode,
                  }));
                }}
              />

              <Field
                id="line1"
                label="Calle y número"
                value={line1}
                error={fieldErrors.line1}
                onChange={(v) => {
                  setLine1(v);
                  setAddressPicked(false);
                }}
              />
              <Field id="line2" label="Piso / depto / referencias" value={line2} onChange={setLine2} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  id="city"
                  label="Ciudad"
                  value={city}
                  error={fieldErrors.city}
                  onChange={(v) => {
                    setCity(v);
                    setAddressPicked(false);
                  }}
                />
                <Field
                  id="cp"
                  label="Código postal"
                  value={postalCode}
                  error={fieldErrors.postalCode}
                  onChange={(v) => {
                    setPostalCode(v);
                    setAddressPicked(false);
                  }}
                />
              </div>
              <Field id="province" label="Provincia" value={province} onChange={setProvince} />
              <p className="text-xs text-muted">
                Buscá con Photon y revisá/ajustá los campos. CP es obligatorio para despacho.
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
          <h2 className="font-bold">Medio de pago</h2>
          <p className="text-sm text-muted">
            Tarjeta u otros medios vía Payway (formulario seguro).
          </p>
          <div className="field">
            <label htmlFor="installments">Cuotas</label>
            <select
              id="installments"
              value={installments}
              onChange={(e) => setInstallmentsChoice(Number(e.target.value))}
              className="min-h-12 w-full rounded-[12px] border border-border bg-bg px-3"
            >
              {installmentOptions.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1 cuota (contado)" : `${n} cuotas`}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>

      <aside className="space-y-4 md:sticky md:top-28 lg:rounded-[20px]">
        {needsMoreForFree > 0 ? (
          <div className="rounded-[16px] border border-accent/30 bg-accent-soft p-4 text-sm">
            <p className="font-bold text-accent">Envío gratis cerca</p>
            <p className="mt-1 text-muted">
              Te faltan {formatArsCents(needsMoreForFree)} para envío Andreani gratis.
            </p>
          </div>
        ) : null}

        {shippingMethod === "andreani" && quote && quote.shippingCents === 0 && freeThreshold > 0 ? (
          <div className="rounded-[16px] border border-border bg-accent-soft p-4 text-sm text-text">
            ¡Llegaste al umbral! Envío Andreani gratis.
          </div>
        ) : null}

        <section className="space-y-2 rounded-[16px] border border-border bg-surface p-4 text-sm">
          <h2 className="font-bold">Resumen</h2>
          {quoteMut.isError ? (
            <p className="text-danger">
              {domainCode(quoteMut.error) === "STOCK_INSUFFICIENT"
                ? "Stock insuficiente. Revisá cantidades en el carrito."
                : errorMessage(quoteMut.error, "No se pudo cotizar")}
            </p>
          ) : null}
          {!andreaniReady && shippingMethod === "andreani" ? (
            <p className="text-muted">Completá dirección, ciudad y CP para cotizar el envío.</p>
          ) : null}
          {quote ? (
            <>
              {quote.lines.map((l) => (
                <div key={l.variantId} className="flex justify-between gap-3">
                  <span>
                    {l.productName} · {l.color}/{l.size} × {l.qty}
                  </span>
                  <span>{formatArsCents(l.unitPriceCents * l.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2">
                <span>Subtotal</span>
                <span>{formatArsCents(quote.subtotalCents)}</span>
              </div>
              {quote.discountCents > 0 ? (
                <div className="flex justify-between">
                  <span>Descuento</span>
                  <span>−{formatArsCents(quote.discountCents)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>Envío {shippingMethod === "pickup" ? "(retiro)" : "(Andreani)"}</span>
                <span>
                  {quote.shippingCents === 0 ? "Gratis" : formatArsCents(quote.shippingCents)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-accent">{formatArsCents(quote.totalCents)}</span>
              </div>
            </>
          ) : (
            <p className="text-muted">
              {andreaniReady ? "Calculando total…" : "Esperando dirección…"}
            </p>
          )}
        </section>

        {formError ? <p className="text-sm text-danger">{formError}</p> : null}

        <button
          type="button"
          className="btn btn-primary"
          disabled={placeMut.isPending || !quote || !andreaniReady}
          onClick={onConfirm}
        >
          {placeMut.isPending ? "Redirigiendo a Payway…" : "Pagar con Payway"}
        </button>
        <Link href="/carrito" className="btn btn-ghost">
          Volver al carrito
        </Link>
      </aside>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={error ? "border-danger" : undefined}
        aria-invalid={!!error}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
