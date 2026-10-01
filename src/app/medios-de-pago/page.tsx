export default function MediosPagoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-8 text-sm text-muted md:px-6">
      <h1 className="text-2xl font-bold text-text">Medios de pago</h1>
      <p>
        <strong className="text-text">Transferencia:</strong> disponible con retiro o Andreani.
        Descuento configurable (default 10%) sobre productos. Podés subir el comprobante al
        confirmar o después desde el seguimiento.
      </p>
      <p>
        <strong className="text-text">Efectivo:</strong> solo con retiro en local. Mismo descuento
        sobre productos. Se abona al retirar.
      </p>
      <p>Tarjetas / Payway / Mercado Pago: fuera de alcance v1.</p>
    </div>
  );
}
