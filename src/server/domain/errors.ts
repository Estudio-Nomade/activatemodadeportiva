export type DomainErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "STOCK_INSUFFICIENT"
  | "INVALID_PAYMENT_SHIPPING_COMBO"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_PENDING"
  | "RESERVATION_EXPIRED"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "PAYWAY_CONFIG_MISSING"
  | "PAYWAY_LINK_FAILED"
  | "PAYWAY_NOTIFICATION_INVALID"
  | "INSTALLMENTS_NOT_ALLOWED";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
