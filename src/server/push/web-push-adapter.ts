import webpush from "web-push";
import type { ServiceClient } from "@/server/db/supabase";
import type { AdminPushPayload, PushPort } from "./port";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type SendNotificationFn = (
  subscription: PushSubscriptionJSON,
  payload: string,
) => Promise<unknown>;

export type WebPushAdapterOpts = {
  publicKey: string;
  privateKey: string;
  subject: string;
  sendNotification?: SendNotificationFn;
};

function isGoneStatus(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { statusCode?: unknown }).statusCode;
  return code === 404 || code === 410;
}

export function createWebPushAdapter(
  db: ServiceClient,
  opts: WebPushAdapterOpts,
): PushPort {
  const send: SendNotificationFn =
    opts.sendNotification ??
    ((subscription, payload) => {
      webpush.setVapidDetails(opts.subject, opts.publicKey, opts.privateKey);
      return webpush.sendNotification(subscription, payload);
    });

  return {
    async sendToAdmins(payload: AdminPushPayload): Promise<void> {
      const { data, error } = await db.from("push_subscriptions").select("*");
      if (error) {
        throw new Error(error.message ?? "Failed to load push subscriptions");
      }
      const rows = data ?? [];
      const body = JSON.stringify(payload);

      await Promise.allSettled(
        rows.map(async (row) => {
          const subscription: PushSubscriptionJSON = {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          };
          try {
            await send(subscription, body);
          } catch (err) {
            if (isGoneStatus(err)) {
              await db
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", row.endpoint);
            }
          }
        }),
      );
    },
  };
}
