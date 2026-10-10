import { describe, expect, it, vi } from "vitest";
import type { ServiceClient } from "@/server/db/supabase";
import {
  createWebPushAdapter,
  type PushSubscriptionJSON,
  type SendNotificationFn,
} from "./web-push-adapter";

const subscription = {
  endpoint: "https://push.example/endpoint-1",
  p256dh: "p256dh-key",
  auth: "auth-key",
};

function mockDb(opts: {
  rows?: typeof subscription[];
  onDelete?: (endpoint: string) => void;
}): ServiceClient {
  const rows = opts.rows ?? [subscription];
  const deleteEq = vi.fn(async (col: string, val: string) => {
    if (col === "endpoint") opts.onDelete?.(val);
    return { error: null };
  });

  return {
    from(table: string) {
      if (table !== "push_subscriptions") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select() {
          return Promise.resolve({ data: rows, error: null });
        },
        delete() {
          return { eq: deleteEq };
        },
      };
    },
  } as unknown as ServiceClient;
}

describe("createWebPushAdapter", () => {
  it("deletes subscription when send returns 410 Gone", async () => {
    const deleted: string[] = [];
    const db = mockDb({
      onDelete: (endpoint) => deleted.push(endpoint),
    });

    const sendNotification: SendNotificationFn = vi.fn(async () => {
      const err = Object.assign(new Error("Gone"), { statusCode: 410 });
      throw err;
    });

    const port = createWebPushAdapter(db, {
      publicKey: "pub",
      privateKey: "priv",
      subject: "mailto:ops@example.com",
      sendNotification,
    });

    const payload = {
      title: "New order",
      body: "ACT-1",
      url: "/admin/pedidos/1",
      tag: "order-1",
      event: "order.created" as const,
    };

    await port.sendToAdmins(payload);

    const expectedSub: PushSubscriptionJSON = {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    };
    expect(sendNotification).toHaveBeenCalledWith(expectedSub, JSON.stringify(payload));
    expect(deleted).toEqual([subscription.endpoint]);
  });

  it("deletes subscription when send returns 404", async () => {
    const deleted: string[] = [];
    const db = mockDb({
      onDelete: (endpoint) => deleted.push(endpoint),
    });

    const sendNotification: SendNotificationFn = vi.fn(async () => {
      throw Object.assign(new Error("Not Found"), { statusCode: 404 });
    });

    const port = createWebPushAdapter(db, {
      publicKey: "pub",
      privateKey: "priv",
      subject: "mailto:ops@example.com",
      sendNotification,
    });

    await port.sendToAdmins({
      title: "t",
      body: "b",
      url: "/admin",
      tag: "t",
      event: "order.created",
    });

    expect(deleted).toEqual([subscription.endpoint]);
  });
});
