type IconProps = { className?: string; size?: number };

function base({ size = 22, className, children }: IconProps & { children: React.ReactNode }) {
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
