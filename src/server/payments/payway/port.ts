export type CreateCheckoutLinkInput = {
  siteTransactionId: string;
  amountCents: number;
  currency: "ARS";
  installments: number;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  notificationsUrl: string;
  products: {
    id: string;
    quantity: number;
    valueCents: number;
    description: string;
  }[];
};

export type CreateCheckoutLinkResult = {
  paymentLink: string;
  paywayPaymentId?: string;
};

export type PaywayPaymentInfo = {
  status: string;
  amountCents: number;
  siteTransactionId: string;
};

export type PaywayPort = {
  createCheckoutLink(input: CreateCheckoutLinkInput): Promise<CreateCheckoutLinkResult>;
  getPayment(paywayPaymentId: string): Promise<PaywayPaymentInfo>;
};
