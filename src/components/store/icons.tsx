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
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={props.className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

export function IconInstagram(props: IconProps) {
  return base({
    ...props,
    size: props.size ?? 20,
    children: (
      <>
        <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" />
        <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M17.5 7.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
      </>
    ),
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
