import Link from "next/link";
import {
  IconCreditCard,
  IconPercent,
  IconRefresh,
  IconTruck,
} from "@/components/store/icons";

type Benefit = {
  key: string;
  label: string;
  Icon: typeof IconPercent;
  href?: string;
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
      Icon: IconPercent,
      href: "/medios-de-pago",
    },
    {
      key: "shipping",
      label: "ENVÍOS A TODO EL PAÍS",
      Icon: IconTruck,
      href: "/envios",
    },
    {
      key: "returns",
      label: "CAMBIOS Y DEVOLUCIONES",
      Icon: IconRefresh,
      href: "/cambios-y-devoluciones",
    },
    {
      key: "payment",
      label: "TODOS LOS MÉTODOS DE PAGO",
      Icon: IconCreditCard,
      href: "/medios-de-pago",
    },
  ];

  return (
    <section className="home-benefits" aria-label="Beneficios de compra">
      <ul className="home-benefits__list">
        {items.map(({ key, label, Icon, href }) => {
          const inner = (
            <>
              <span className="home-benefits__icon">
                <Icon size={24} />
              </span>
              <span className="home-benefits__label">{label}</span>
            </>
          );
          return (
            <li key={key} className="home-benefits__item">
              {href ? (
                <Link href={href} className="home-benefits__link">
                  {inner}
                </Link>
              ) : (
                <div className="home-benefits__link">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
