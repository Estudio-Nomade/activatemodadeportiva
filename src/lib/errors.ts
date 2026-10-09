import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/trpc/routers/app";

export function domainCode(err: unknown): string | undefined {
  const e = err as TRPCClientErrorLike<AppRouter> | undefined;
  const data = e?.data as { domainCode?: string } | undefined;
  return data?.domainCode;
}

function formatZodishMessage(raw: string): string | null {
  const t = raw.trim();
  if (!t.startsWith("[")) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const parts = parsed
      .map((issue) => {
        if (!issue || typeof issue !== "object") return null;
        const i = issue as { path?: unknown; message?: unknown };
        const path = Array.isArray(i.path)
          ? i.path.filter((p) => typeof p === "string" || typeof p === "number").join(".")
          : "";
        const msg = typeof i.message === "string" ? i.message : "";
        if (!msg) return null;
        return path ? `${path}: ${msg}` : msg;
      })
      .filter((x): x is string => !!x);
    return parts.length ? parts.join("; ") : null;
  } catch {
    return null;
  }
}

export function errorMessage(err: unknown, fallback = "Algo salió mal"): string {
  if (!err) return fallback;
  if (typeof err === "string") return formatZodishMessage(err) ?? err;
  const e = err as { message?: string };
  if (!e.message) return fallback;
  return formatZodishMessage(e.message) ?? e.message;
}
