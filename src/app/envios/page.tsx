export default function EnviosPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-8 text-sm text-muted md:px-6">
      <h1 className="text-2xl font-bold text-text">Envíos</h1>
      <p>
        <strong className="text-text">Retiro en local (San Manuel):</strong> gratis.
      </p>
      <p>
        <strong className="text-text">Andreani a domicilio:</strong> costo fijo configurable. Si el
        subtotal de productos (después del descuento por medio de pago) supera el umbral, el envío
        es gratis.
      </p>
      <p>No hay envío a domicilio dentro de San Manuel: quien está en la zona retira en el local.</p>
    </div>
  );
}
