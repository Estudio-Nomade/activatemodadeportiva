"use client";

import { useId, useState } from "react";

export type PdpAccordionItem = {
  id: string;
  title: string;
  content: React.ReactNode;
};

type Props = {
  items: PdpAccordionItem[];
  /** Single-open KISS (default). */
  singleOpen?: boolean;
};

export function PdpAccordion({ items, singleOpen = true }: Props) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const [openSet, setOpenSet] = useState<Set<string>>(() => new Set());

  if (items.length === 0) return null;

  const isOpen = (id: string) => (singleOpen ? openId === id : openSet.has(id));

  const toggle = (id: string) => {
    if (singleOpen) {
      setOpenId((prev) => (prev === id ? null : id));
      return;
    }
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => {
        const expanded = isOpen(item.id);
        const panelId = `${baseId}-${item.id}-panel`;
        const btnId = `${baseId}-${item.id}-btn`;
        return (
          <div key={item.id}>
            <h3 className="m-0">
              <button
                type="button"
                id={btnId}
                className="flex w-full min-h-12 items-center justify-between gap-3 py-3.5 text-left text-[13px] font-bold uppercase tracking-wide text-text md:text-sm"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                <span>{item.title}</span>
                <span
                  className={`shrink-0 text-lg font-normal leading-none text-muted transition-transform ${expanded ? "rotate-45" : ""}`}
                  aria-hidden
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              hidden={!expanded}
              className={expanded ? "pb-4" : undefined}
            >
              {expanded ? (
                <div className="space-y-2 text-[13px] leading-relaxed text-muted md:text-sm">
                  {item.content}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
