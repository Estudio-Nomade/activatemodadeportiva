import type { ReactNode } from "react";

type IconProps = { className?: string; size?: number };

function base({ size = 22, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Lucide-ish home — path-only */
export function IconHome(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </>
    ),
  });
}

/** Lucide-ish package — path-only */
export function IconPackage(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
  });
}

/** Lucide-ish shirt / catalog — path-only */
export function IconCatalog(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </>
    ),
  });
}

/** Lucide-ish sliders-horizontal — path-only (no bare line) */
export function IconSettings(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M4 21V14" />
        <path d="M4 10V3" />
        <path d="M12 21V12" />
        <path d="M12 8V3" />
        <path d="M20 21V16" />
        <path d="M20 12V3" />
        <path d="M2 14h4" />
        <path d="M10 8h4" />
        <path d="M18 16h4" />
      </>
    ),
  });
}

/** Three dots horizontal — path-only */
export function IconMore(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        <path d="M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        <path d="M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      </>
    ),
  });
}

/** Lucide-ish folders / categories */
export function IconFolders(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M20 17a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.9a2 2 0 0 1-1.69-.9l-.81-1.2a2 2 0 0 0-1.67-.9H8a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2Z" />
        <path d="M2 8v11a2 2 0 0 0 2 2h14" />
      </>
    ),
  });
}

/** Lucide-ish ruler / size guide */
export function IconRuler(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
        <path d="m14.5 12.5 2-2" />
        <path d="m11.5 9.5 2-2" />
        <path d="m8.5 6.5 2-2" />
        <path d="m17.5 15.5 2-2" />
      </>
    ),
  });
}

/** Lucide-ish plus */
export function IconPlus(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
  });
}

/** Lucide-ish external-link / store */
export function IconStore(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </>
    ),
  });
}

/** Lucide-ish log-out */
export function IconLogout(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
  });
}

/** Lucide-ish alert-circle — path-only */
export function IconAlert(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
  });
}

/** Lucide-ish box / inventory */
export function IconBox(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
  });
}

/** Lucide-ish clipboard-list / in progress */
export function IconClipboard(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
        <path d="M8 12h8" />
        <path d="M8 16h6" />
      </>
    ),
  });
}

/** Lucide-ish close — path-only */
export function IconClose(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 22,
    children: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  });
}
