import type { ServiceClient } from "@/server/db/supabase";
import { consolePush } from "./console";
import type { PushPort } from "./port";
import { createWebPushAdapter } from "./web-push-adapter";

export function resolvePush(db: ServiceClient): PushPort {
  if (
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  ) {
    return createWebPushAdapter(db, {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT,
    });
  }
  return consolePush;
}
