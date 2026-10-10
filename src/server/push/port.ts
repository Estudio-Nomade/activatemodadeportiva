export type AdminPushEvent =
  | "order.created"
  | "order.payment_confirmed"
  | "stock.low";

export type AdminPushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  event: AdminPushEvent;
};

export type PushPort = {
  sendToAdmins(payload: AdminPushPayload): Promise<void>;
};
