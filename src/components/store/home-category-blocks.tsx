"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { categoryTileImageSrc } from "@/lib/media/category-tile";

export type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

type Props = {
  categories: HomeCategory[];
  isError?: boolean;
};

export function HomeCategoryBlocks({ categories, isError }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const roots = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const childrenOf = (id: string) =>
    categories
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.sort_order - b.sort_order);

  function toggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  return (
    <section className="home-cat px-4 py-3 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <h2 className="home-cat__heading mb-0 font-display text-[0] leading-none md:mb-5 md:text-[36px] md:font-semibold md:leading-[1.2]">
        Comprá por categoría
      </h2>

      <div className="home-cat__list flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-5">
        {roots.map((root) => {
          const children = childrenOf(root.id);
          const hasChildren = children.length > 0;
          const open = expandedId === root.id;
          const href = `/c/${root.slug}`;

          if (!hasChildren) {
            return (
              <Link
                key={root.id}
                href={href}
                className="home-cat__tile group relative block overflow-hidden rounded-[12px] lg:rounded-[16px]"
              >
                <TileFace name={root.name} slug={root.slug} chevron />
              </Link>
            );
          }

          return (
            <div
              key={root.id}
              className={`home-cat__block overflow-hidden rounded-[12px] lg:rounded-[16px] ${open ? "home-cat__block--open" : ""}`}
            >
              <div className="home-cat__tile group relative">
                <TileFace name={root.name} slug={root.slug} />
                <button
                  type="button"
                  className="absolute inset-0 z-[2] flex min-h-12 items-center justify-between px-4 text-left"
                  aria-expanded={open}
                  aria-controls={`home-cat-panel-${root.id}`}
                  onClick={() => toggle(root.id)}
                >
                  <span className="sr-only">
                    {open ? "Cerrar" : "Abrir"} subcategorías de {root.name}
                  </span>
                  <span
                    aria-hidden
                    className={`home-cat__chevron ml-auto font-display text-lg text-inverse transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                  >
                    ›
                  </span>
                </button>
              </div>

              <div
                id={`home-cat-panel-${root.id}`}
                role="region"
                aria-label={`Subcategorías de ${root.name}`}
                hidden={!open}
                className="home-cat__panel border border-t-0 border-border bg-surface"
              >
                <ul className="divide-y divide-border">
                  <li>
                    <Link
                      href={href}
                      className="flex min-h-12 items-center px-4 py-3 font-display text-[15px] font-semibold text-text hover:bg-surface-soft"
                    >
                      Ver todo {root.name}
                    </Link>
                  </li>
                  {children.map((ch) => (
                    <li key={ch.id}>
                      <Link
                        href={`/c/${ch.slug}`}
                        className="flex min-h-12 items-center px-4 py-3 text-[15px] text-text hover:bg-surface-soft"
                      >
                        {ch.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {isError ? (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          No pudimos cargar categorías. Si es la primera vez, aplicá el bootstrap SQL en Supabase.
        </p>
      ) : null}
    </section>
  );
}

function TileFace({
  name,
  slug,
  chevron = false,
}: {
  name: string;
  slug: string;
  chevron?: boolean;
}) {
  return (
    <>
      <Image
        src={categoryTileImageSrc(slug)}
        alt=""
        fill
        className="object-cover transition duration-300 group-hover:scale-[1.03]"
        sizes="(min-width: 768px) 33vw, 100vw"
      />
      <span className="absolute inset-0 z-[1] flex items-center justify-between bg-[#12100f66] px-4 font-display text-lg font-semibold text-inverse md:text-xl lg:text-2xl">
        {name}
        {chevron ? (
          <span aria-hidden className="text-lg opacity-90">
            ›
          </span>
        ) : null}
      </span>
    </>
  );
}
