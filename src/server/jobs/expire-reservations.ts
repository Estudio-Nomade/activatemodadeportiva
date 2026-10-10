import { createServiceClient } from "@/server/db/supabase";
import {
  expireReservations as expireReservationsDomain,
  type ExpireReservationsResult,
} from "@/server/domain/orders/expire-reservations";
import { consoleEmail } from "@/server/email/console";
import { createResendEmail } from "@/server/email/resend";
import type { EmailPort } from "@/server/email/port";
import { resolvePush } from "@/server/push/resolve";

function resolveEmail(): EmailPort {
  if (process.env.RESEND_API_KEY) {
    return createResendEmail();
  }
  return consoleEmail;
}

export async function runExpireReservations(
  now: Date = new Date(),
): Promise<ExpireReservationsResult> {
  const db = createServiceClient();
  return expireReservationsDomain({
    db,
    email: resolveEmail(),
    push: resolvePush(db),
    now,
  });
}
