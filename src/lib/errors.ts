import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/trpc/routers/app";

export function domainCode(err: unknown): string | undefined {
  const e = err as TRPCClientErrorLike<AppRouter> | undefined;
  const data = e?.data as { domainCode?: string } | undefined;
  return data?.domainCode;
}

export function errorMessage(err: unknown, fallback = "Algo salió mal"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const e = err as { message?: string };
  return e.message || fallback;
}
