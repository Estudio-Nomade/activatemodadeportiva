export type ProofMediaKind = "image" | "pdf" | "other";

/** Guess display kind from storage path / file name. */
export function proofMediaKind(storagePath: string): ProofMediaKind {
  const base = storagePath.split("/").pop() ?? storagePath;
  const lower = base.toLowerCase();
  if (/\.(jpe?g|png|gif|webp|bmp|heic)$/.test(lower)) return "image";
  if (/\.pdf$/.test(lower)) return "pdf";
  return "other";
}
