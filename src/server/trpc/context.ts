import { createServiceClient } from "@/server/db/supabase";
import { consoleEmail } from "@/server/email/console";
import type { EmailPort } from "@/server/email/port";
import { createResendEmail } from "@/server/email/resend";
import { createSupabaseStorage } from "@/server/storage/supabase-storage";
import type { StoragePort } from "@/server/storage/port";

function resolveEmail(): EmailPort {
  if (process.env.RESEND_API_KEY) {
    return createResendEmail();
  }
  return consoleEmail;
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
    adminUserId,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
