import Link from "next/link";
import type { ReactNode } from "react";

type Benefit = {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
};

type Props = {
  /** From discountPercentFromBps(settings.payment_discount_bps) */
  discountPercent: number;
};

function BenefitIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function HomeBenefits({ discountPercent }: Props) {
  const items: Benefit[] = [
    {
      key: "discount",
      label: `${discountPercent}% DE DESCUENTO CON TRANSFERENCIA`,
      icon: (
        <BenefitIcon>
          <line x1="19" x2="5" y1="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </BenefitIcon>
      ),
      href: "/medios-de-pago",
    },
    {
      key: "shipping",
      label: "ENVÍOS A TODO EL PAÍS",
      icon: (
        <BenefitIcon>
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </BenefitIcon>
      ),
      href: "/envios",
    },
    {
      key: "returns",
      label: "CAMBIOS Y DEVOLUCIONES",
      icon: (
        <BenefitIcon>
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </BenefitIcon>
      ),
      href: "/cambios-y-devoluciones",
    },
    {
      key: "payment",
      label: "TODOS LOS MÉTODOS DE PAGO",
      icon: (
        <BenefitIcon>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </BenefitIcon>
      ),
      href: "/medios-de-pago",
    },
  ];

  return (
    <section className="home-benefits" aria-label="Beneficios de compra">
      <ul className="home-benefits__list">
        {items.map((item) => (
          <li key={item.key} className="home-benefits__item">
            <Link href={item.href} className="home-benefits__link">
              <span className="home-benefits__icon">{item.icon}</span>
              <span className="home-benefits__label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
