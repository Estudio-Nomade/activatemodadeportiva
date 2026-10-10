import { NextResponse } from "next/server";
import { createServiceClient } from "@/server/db/supabase";
import { DomainError } from "@/server/domain/errors";
import { handlePaywayNotification } from "@/server/domain/payments/handle-payway-notification";
import { consoleEmail } from "@/server/email/console";
import type { EmailPort } from "@/server/email/port";
import { createResendEmail } from "@/server/email/resend";
import { loadPaywayConfig } from "@/server/payments/payway/config";
import { createPaywayHttpAdapter } from "@/server/payments/payway/http-adapter";
import { resolvePush } from "@/server/push/resolve";

function resolveEmail(): EmailPort {
  if (process.env.RESEND_API_KEY) return createResendEmail();
  return consoleEmail;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const db = createServiceClient();
    const payway = createPaywayHttpAdapter(loadPaywayConfig());
    await handlePaywayNotification(body, {
      db,
      email: resolveEmail(),
      payway,
      push: resolvePush(db),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DomainError && e.code === "PAYWAY_CONFIG_MISSING") {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    if (e instanceof DomainError && e.code === "PAYWAY_NOTIFICATION_INVALID") {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("payway notification", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
