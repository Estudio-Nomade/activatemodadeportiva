export type StoragePort = {
  createSignedUploadUrl(input: {
    bucket: string;
    path: string;
    expiresIn?: number;
  }): Promise<{ signedUrl: string; path: string; token?: string }>;

  getPublicUrl(input: { bucket: string; path: string }): string;

  createSignedDownloadUrl(input: {
    bucket: string;
    path: string;
    expiresIn?: number;
  }): Promise<{ signedUrl: string }>;

  /** Best-effort delete of object keys inside a bucket. */
  removeObjects?(input: { bucket: string; paths: string[] }): Promise<void>;
};

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const PAYMENT_PROOFS_BUCKET = "payment-proofs";
export const SIZE_GUIDES_BUCKET = "size-guides";
