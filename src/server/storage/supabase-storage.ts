import type { ServiceClient } from "@/server/db/supabase";
import type { StoragePort } from "./port";

const DEFAULT_DOWNLOAD_EXPIRES = 60 * 60;

export function createSupabaseStorage(db: ServiceClient): StoragePort {
  return {
    async createSignedUploadUrl({ bucket, path }) {
      const { data, error } = await db.storage
        .from(bucket)
        .createSignedUploadUrl(path, { upsert: false });

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to create signed upload URL");
      }

      return {
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token,
      };
    },

    getPublicUrl({ bucket, path }) {
      const { data } = db.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },

    async createSignedDownloadUrl({
      bucket,
      path,
      expiresIn = DEFAULT_DOWNLOAD_EXPIRES,
    }) {
      const { data, error } = await db.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to create signed download URL");
      }

      return { signedUrl: data.signedUrl };
    },

    async removeObjects({ bucket, paths }) {
      if (!paths.length) return;
      const { error } = await db.storage.from(bucket).remove(paths);
      if (error) {
        throw new Error(error.message ?? "Failed to remove storage objects");
      }
    },
  };
}
