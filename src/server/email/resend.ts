import { Resend } from "resend";
import type { EmailPort } from "./port";
import { buildEmailHtml, buildEmailSubjectWithData } from "./templates";

export function createResendEmail(): EmailPort {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for Resend email");
  }
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? "Activate <onboarding@resend.dev>";

  return {
    async send({ template, to, data }) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      await resend.emails.send({
        from,
        to,
        subject: buildEmailSubjectWithData(template, data),
        html: buildEmailHtml(template, { ...data, appUrl }),
      });
    },
  };
}
