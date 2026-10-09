export type EmailTemplate =
  | "order_created"
  | "payment_confirmed"
  | "payment_proof_received"
  | "ready_pickup"
  | "shipped"
  | "delivered"
  | "cancelled";

export type EmailPort = {
  send(input: {
    template: EmailTemplate;
    to: string;
    data: Record<string, unknown>;
  }): Promise<void>;
};
