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

export function IconMenu(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M4 5h16" />
        <path d="M4 12h16" />
        <path d="M4 19h16" />
      </>
    ),
  });
}

export function IconClose(props: IconProps) {
  return base({
    ...props,
    children: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  });
}

export function IconSearch(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
  });
}

export function IconCart(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
  });
}

export function IconChevronRight(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 18,
    children: <path d="m9 18 6-6-6-6" />,
  });
}

export function IconChevronLeft(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 18,
    children: <path d="m15 18-6-6 6-6" />,
  });
}

export function IconWhatsApp(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  });
}

export function IconZoom(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 18,
    children: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
      </>
    ),
  });
}

/** Lucide-ish percent — path-only (avoid line/circle intrinsic edge cases). */
export function IconPercent(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 24,
    children: (
      <>
        <path d="M19 5 5 19" />
        <path d="M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
        <path d="M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      </>
    ),
  });
}

/** Lucide-ish truck — path-only */
export function IconTruck(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 24,
    children: (
      <>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <path d="M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
        <path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      </>
    ),
  });
}

/** Lucide-ish refresh-cw */
export function IconRefresh(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 24,
    children: (
      <>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </>
    ),
  });
}

/** Lucide-ish credit-card — path-only */
export function IconCreditCard(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 24,
    children: (
      <>
        <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
        <path d="M2 10h20" />
      </>
    ),
  });
}
