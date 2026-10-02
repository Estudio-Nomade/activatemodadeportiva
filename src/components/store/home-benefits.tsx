import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconCreditCard,
  IconPercent,
  IconRefresh,
  IconTruck,
} from "@/components/store/icons";

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

export function HomeBenefits({ discountPercent }: Props) {
  const items: Benefit[] = [
    {
      key: "discount",
      label: `${discountPercent}% DE DESCUENTO CON TRANSFERENCIA`,
      icon: <IconPercent size={24} />,
      href: "/medios-de-pago",
    },
    {
      key: "shipping",
      label: "ENVÍOS A TODO EL PAÍS",
      icon: <IconTruck size={24} />,
      href: "/envios",
    },
    {
      key: "returns",
      label: "CAMBIOS Y DEVOLUCIONES",
      icon: <IconRefresh size={24} />,
      href: "/cambios-y-devoluciones",
    },
    {
      key: "payment",
      label: "TODOS LOS MÉTODOS DE PAGO",
      icon: <IconCreditCard size={24} />,
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
