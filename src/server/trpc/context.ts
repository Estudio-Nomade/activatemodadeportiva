import { createServiceClient } from "@/server/db/supabase";
import { consoleEmail } from "@/server/email/console";
import type { EmailPort } from "@/server/email/port";
import { createResendEmail } from "@/server/email/resend";
import { loadPaywayConfig } from "@/server/payments/payway/config";
import { createPaywayHttpAdapter } from "@/server/payments/payway/http-adapter";
import type { PaywayPort } from "@/server/payments/payway/port";
import { resolvePush } from "@/server/push/resolve";
import { createSupabaseStorage } from "@/server/storage/supabase-storage";
import type { StoragePort } from "@/server/storage/port";

function resolveEmail(): EmailPort {
  if (process.env.RESEND_API_KEY) {
    return createResendEmail();
  }
  return consoleEmail;
}

function resolvePayway(): PaywayPort {
  return {
    async createCheckoutLink(input) {
      return createPaywayHttpAdapter(loadPaywayConfig()).createCheckoutLink(input);
    },
    async getPayment(id) {
      return createPaywayHttpAdapter(loadPaywayConfig()).getPayment(id);
    },
  };
}

export async function createTRPCContext(opts: { headers: Headers }) {
  const db = createServiceClient();
  const authHeader = opts.headers.get("authorization");
  const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let adminUserId: string | null = null;
  if (jwt) {
    const { data, error } = await db.auth.getUser(jwt);
    if (!error && data.user) adminUserId = data.user.id;
  }
  return {
    db,
    headers: opts.headers,
    email: resolveEmail(),
    storage: createSupabaseStorage(db) as StoragePort,
    payway: resolvePayway(),
    push: resolvePush(db),
    appBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    adminUserId,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
