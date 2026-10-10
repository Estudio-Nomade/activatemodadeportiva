import { DomainError } from "@/server/domain/errors";

/** Same-origin admin path only. No scheme, no //, no .. */
export function assertAdminDeepLink(path: string): string {
  if (path.includes("://") || path.startsWith("//") || path.includes("..")) {
    throw new DomainError("VALIDATION_ERROR", "Invalid admin push URL");
  }
  if (path !== "/admin" && !path.startsWith("/admin/")) {
    throw new DomainError("VALIDATION_ERROR", "Push URL must be an /admin path");
  }
  return path;
}
