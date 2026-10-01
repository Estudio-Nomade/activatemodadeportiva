function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="prose prose-neutral mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </article>
  );
}

export default function QuienesSomosPage() {
  return (
    <InfoPage title="Quiénes somos">
      <p>
        Activate Moda Deportiva es una tienda de indumentaria deportiva con local físico en San
        Manuel. Vendemos online con retiro en el local o envío Andreani.
      </p>
      <p>Dirección, horarios y mapa: placeholders hasta datos definitivos de la cliente.</p>
    </InfoPage>
  );
}
