import type { AdminPushPayload, PushPort } from "@/server/push/port";

export async function sendAdminPushBestEffort(
  push: PushPort,
  payload: AdminPushPayload,
): Promise<void> {
  try {
    await push.sendToAdmins(payload);
  } catch {
    // best-effort
  }
}
