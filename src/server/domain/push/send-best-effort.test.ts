import { describe, expect, it, vi } from "vitest";
import { sendAdminPushBestEffort } from "./send-best-effort";

describe("sendAdminPushBestEffort", () => {
  it("does not throw when push fails", async () => {
    const push = {
      sendToAdmins: vi.fn().mockRejectedValue(new Error("boom")),
    };
    await expect(
      sendAdminPushBestEffort(push, {
        title: "t",
        body: "b",
        url: "/admin",
        tag: "t1",
        event: "order.created",
      }),
    ).resolves.toBeUndefined();
  });
});
