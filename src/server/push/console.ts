import type { PushPort } from "./port";

export const consolePush: PushPort = {
  async sendToAdmins(payload) {
    console.info("[push:console]", payload.event, payload.title, payload.body, payload.url);
  },
};
