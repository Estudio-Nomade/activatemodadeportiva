import Link from "next/link";

type Props = {
  /** From discountPercentFromBps(settings.payment_discount_bps) */
  discountPercent: number;
};

/** Self-contained SVG — only <path> (no line/circle/rect primitives). */
function BenefitSvg({ d, paths }: { d?: string; paths?: string[] }) {
  const list = paths ?? (d ? [d] : []);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {list.map((pathD) => (
        <path key={pathD} d={pathD} />
      ))}
    </svg>
  );
}

/** percent-like mark */
function IconDiscount() {
  return (
    <BenefitSvg
      paths={[
        "M19 5 5 19",
        "M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
        "M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
      ]}
    />
  );
}

/** truck */
function IconShipping() {
  return (
    <BenefitSvg
      paths={[
        "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",
        "M15 18H9",
        "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",
        "M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
        "M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
      ]}
    />
  );
}

/** refresh-cw */
function IconReturns() {
  return (
    <BenefitSvg
      paths={[
        "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
        "M21 3v5h-5",
        "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
        "M8 16H3v5",
      ]}
    />
  );
}

/** credit-card as paths only */
function IconPayment() {
  return (
    <BenefitSvg
      paths={[
        "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
        "M2 10h20",
      ]}
    />
  );
}

const ITEMS = [
  {
    key: "discount",
    href: "/medios-de-pago",
    Icon: IconDiscount,
    label: (pct: number) => `${pct}% DE DESCUENTO CON TRANSFERENCIA`,
  },
  {
    key: "shipping",
    href: "/envios",
    Icon: IconShipping,
    label: () => "ENVÍOS A TODO EL PAÍS",
  },
  {
    key: "returns",
    href: "/cambios-y-devoluciones",
    Icon: IconReturns,
    label: () => "CAMBIOS Y DEVOLUCIONES",
  },
  {
    key: "payment",
    href: "/medios-de-pago",
    Icon: IconPayment,
    label: () => "TODOS LOS MÉTODOS DE PAGO",
  },
] as const;

export function HomeBenefits({ discountPercent }: Props) {
  return (
    <section className="home-benefits" aria-label="Beneficios de compra">
      <ul className="home-benefits__list">
        {ITEMS.map((item) => {
          const Icon = item.Icon;
          return (
            <li key={item.key} className="home-benefits__item">
              <Link href={item.href} className="home-benefits__link">
                <span className="home-benefits__icon">
                  <Icon />
                </span>
                <span className="home-benefits__label">{item.label(discountPercent)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
