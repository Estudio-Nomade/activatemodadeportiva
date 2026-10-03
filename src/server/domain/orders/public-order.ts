/** Shape safe to return for buyer tracking by code (no magic token). */
export function toPublicOrderByCode<T extends Record<string, unknown>>(order: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strip secret
  const { access_token: _token, ...rest } = order;
  return rest;
}

export function assertProofStoragePath(orderId: string, storagePath: string): void {
  const prefix = `payment-proofs/${orderId}/`;
  if (
    !storagePath.startsWith(prefix) ||
    storagePath.includes("..") ||
    storagePath.length > 512
  ) {
    throw new Error("INVALID_PROOF_PATH");
  }
}
