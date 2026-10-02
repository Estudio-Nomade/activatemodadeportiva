import Image from "next/image";
import Link from "next/link";
import { PRODUCTS_HREF } from "@/components/store/chrome";

const GALLERY = [
  {
    src: "/about/lorena-local.jpg",
    alt: "Lorena en el local de Activate Moda Deportiva",
  },
  {
    src: "/about/local-1.jpg",
    alt: "Interior del local Activate Moda Deportiva",
  },
  {
    src: "/about/local-2.jpg",
    alt: "Detalle del local Activate en San Manuel",
  },
  {
    src: "/about/local-3.jpg",
    alt: "Espacio de venta Activate Moda Deportiva",
  },
] as const;

const EMOTIONAL = [
  "Confiá en vos, podés lograr todo lo que te propongas.",
  "Los sueños se cumplen, pero también hay que trabajar mucho, ser constante, no salirse de la meta y poner toda la energía ahí.",
  "Hubo un momento en el que sentía que lo tenía todo, pero aun así me sentía vacía. Y fue ahí cuando entendí que tenía que salir a descubrirme, reinventarme y preguntarme qué quería realmente para mi vida.",
  "Empecé a buscar eso que me hiciera bien, que me diera ganas de levantarme cada mañana y sentir que estaba construyendo algo por mí y para mí.",
  "Así nació Activate.",
  "Hoy puedo decir que estoy feliz de haber elegido este camino y de haberme animado a crear algo propio.",
  "Activate representa eso para mí: animarse, confiar, trabajar por lo que uno quiere y seguir avanzando.",
  "Gracias a todos los que estuvieron y siguen estando del otro lado.",
  "Los espero en Activate.",
] as const;

const BRAND = [
  "Activate es una tienda de moda deportiva pensada para acompañar el movimiento, la comodidad y el estilo en el día a día.",
  "Trabajamos con una selección de marcas de indumentaria y accesorios deportivos, priorizando la calidad y la comodidad.",
  "Buscamos ofrecer productos funcionales, con una atención cercana y una experiencia de compra simple. Trabajamos con marcas que acompañan nuestros valores: Magher, I-Run, Sox, Head, entre otras.",
] as const;

export default function QuienesSomosPage() {
  return (
    <div className="bg-bg pb-16 md:pb-20">
      {/* Hero — Lorena + title overlay */}
      <section className="relative w-full overflow-hidden aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/9] md:max-h-[min(72vh,560px)]">
        <Image
          src="/about/lorena-hero.jpg"
          alt="Lorena, creadora de Activate Moda Deportiva"
          fill
          priority
          className="object-cover object-[center_28%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#12100fee] via-[#12100f66] to-[#12100f18]"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 z-[1] px-5 pb-8 pt-16 sm:px-8 sm:pb-10 md:px-12 md:pb-12 lg:px-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
            Sobre nosotros
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Quiénes somos
          </h1>
          <p className="mt-3 max-w-xl text-base italic leading-snug text-white/90 sm:text-lg md:text-xl">
            “Así me sentí el día que empezó todo.”
          </p>
        </div>
      </section>

      {/* Story + brand + personal */}
      <div className="mx-auto max-w-3xl px-4 pt-10 md:px-6 md:pt-14">
        <div className="space-y-4 text-[15px] leading-relaxed text-text md:text-base md:leading-relaxed">
          {EMOTIONAL.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="my-10 h-px w-full bg-border" aria-hidden />

        <h2 className="text-lg font-bold text-text md:text-xl">La marca</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-text md:text-base">
          {BRAND.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <blockquote className="mt-10 rounded-2xl border border-border border-l-[3px] border-l-accent bg-surface px-5 py-5 shadow-sm md:px-6 md:py-6">
          <p className="text-base font-semibold text-text md:text-lg">
            “Soy Lorena, creadora de Activate.”
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-base">
            Activate nació de las ganas de empezar algo propio, construir un espacio con identidad y
            ofrecer una propuesta de moda deportiva que combine calidad, comodidad y estilo.
          </p>
        </blockquote>
      </div>

      {/* Gallery — local + Lorena (2×2 mobile; 4 even cols desktop, no orphan span) */}
      <section className="mx-auto mt-12 max-w-6xl px-4 md:mt-16 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
          {GALLERY.map((item) => (
            <div
              key={item.src}
              className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-soft"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Values + CTA */}
      <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-6 px-4 text-center md:mt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted sm:text-[13px]">
          Movimiento · Estilo · Calidad
        </p>
        <Link href={PRODUCTS_HREF} className="btn btn-primary max-w-xs">
          Ver productos
        </Link>
        <Link href="/contacto" className="text-sm font-semibold text-accent">
          Contacto
        </Link>
      </div>
    </div>
  );
}
