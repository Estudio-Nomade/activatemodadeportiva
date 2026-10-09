import type { EmailPort } from "./port";
import { buildEmailHtml, buildEmailSubjectWithData } from "./templates";

/** Dev adapter: logs subject + HTML length (and optional full HTML via EMAIL_CONSOLE_HTML=1). */
export const consoleEmail: EmailPort = {
  async send(input) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const subject = buildEmailSubjectWithData(input.template, input.data);
    const html = buildEmailHtml(input.template, { ...input.data, appUrl });
    console.info("[email]", {
      template: input.template,
      to: input.to,
      subject,
      htmlBytes: html.length,
      data: input.data,
    });
    if (process.env.EMAIL_CONSOLE_HTML === "1") {
      console.info("[email:html]", html);
    }
  },
};
