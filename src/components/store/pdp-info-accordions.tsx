"use client";

import Link from "next/link";
import {
  ContactLinks,
  PaymentDiscountLabel,
  ShippingFeesCopy,
  StoreAddressBlock,
  TransferAliasCopy,
} from "@/components/store/info-page";
import { PdpAccordion, type PdpAccordionItem } from "@/components/store/pdp-accordion";

const COMPOSITION_CARE = (
  <>
    <p>
      Prendas deportivas pensadas para entrenamiento y uso diario. La composición exacta
      (tejido, elastano, etc.) y las instrucciones de lavado figuran en el rótulo de cada
      prenda.
    </p>
    <p>
      Recomendación general: lavar con agua fría, no usar blanqueador, no planchar estampas y
      secar a la sombra. Ante dudas, consultanos por WhatsApp.
    </p>
  </>
);

type Props = {
  description?: string | null;
};

export function PdpInfoAccordions({ description }: Props) {
  const items: PdpAccordionItem[] = [];

  const desc = description?.trim();
  if (desc) {
    items.push({
      id: "description",
      title: "Descripción",
      content: <p className="whitespace-pre-wrap">{desc}</p>,
    });
  }

  items.push(
    {
      id: "composition",
      title: "Composición y cuidados",
      content: COMPOSITION_CARE,
    },
    {
      id: "payment",
      title: "Métodos de pago",
      content: (
        <>
          <p>
            <strong className="text-text">Transferencia:</strong> retiro o Andreani.{" "}
            <PaymentDiscountLabel /> sobre productos. Subí el comprobante al confirmar o desde el
            seguimiento.
          </p>
          <TransferAliasCopy />
          <p>
            <strong className="text-text">Efectivo:</strong> solo retiro en local. Mismo descuento.
            Se abona al retirar.
          </p>
          <p>Tarjetas / Payway / Mercado Pago: fuera de alcance v1.</p>
          <p>
            <Link
              href="/medios-de-pago"
              className="font-semibold text-accent underline underline-offset-2"
            >
              Ver más sobre medios de pago
            </Link>
          </p>
        </>
      ),
    },
    {
      id: "shipping",
      title: "Métodos de envío",
      content: (
        <>
          <p>
            <strong className="text-text">Retiro en local:</strong> gratis.
          </p>
          <StoreAddressBlock />
          <ShippingFeesCopy />
          <p>
            <Link href="/envios" className="font-semibold text-accent underline underline-offset-2">
              Ver más sobre envíos
            </Link>
          </p>
        </>
      ),
    },
    {
      id: "returns",
      title: "Cambios y devoluciones",
      content: (
        <>
          <p>
            En v1 la gestión de cambios es offline (local / WhatsApp). No hay solicitud online de
            devolución.
          </p>
          <p>
            Escribinos por WhatsApp o acercate al local con el pedido y el producto en condiciones.
          </p>
          <StoreAddressBlock />
          <ContactLinks />
          <p>
            <Link
              href="/cambios-y-devoluciones"
              className="font-semibold text-accent underline underline-offset-2"
            >
              Ver política completa
            </Link>
          </p>
        </>
      ),
    },
  );

  return <PdpAccordion items={items} singleOpen />;
}
