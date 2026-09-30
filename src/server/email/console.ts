import type { EmailPort } from "./port";

export const consoleEmail: EmailPort = {
  async send(input) {
    console.info("[email]", input.template, input.to, input.data);
  },
};
