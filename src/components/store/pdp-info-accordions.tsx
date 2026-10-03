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
import {
  normalizeCompositionCareText,
  shouldShowCompositionCare,
} from "@/lib/catalog/composition-care";

type Props = {
  description?: string | null;
  compositionCareText?: string | null;
};

export function PdpInfoAccordions({ description, compositionCareText }: Props) {
  const items: PdpAccordionItem[] = [];

  const desc = description?.trim();
  if (desc) {
    items.push({
      id: "description",
      title: "Descripción",
      content: <p className="whitespace-pre-wrap">{desc}</p>,
    });
  }

  if (shouldShowCompositionCare(compositionCareText)) {
    items.push({
      id: "composition",
      title: "Composición y cuidados",
      content: (
        <p className="whitespace-pre-wrap">
          {normalizeCompositionCareText(compositionCareText)}
        </p>
      ),
    });
  }

  items.push(
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
          <p>Por ahora no aceptamos tarjetas online. Si necesitás otra forma de pago, escribinos.</p>
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
            Los cambios se gestionan por WhatsApp o en el local. No hay solicitud online de
            devolución.
          </p>
          <p>
            Escribinos o acercate con el pedido y el producto en condiciones.
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
