# PROMPT — feat: Quiénes somos con copy Lorena + fotos reales

**Modo:** implementar (no investigate-only).  
**Idioma de respuesta al humano:** español, corto, con URL de smoke.  
**Código/comentarios en el repo:** inglés (AGENTS.md). Copy de producto: ES-AR.

---

## 0) Kickoff (leé esto primero)

Repo absoluto:

```text
/home/marti/Documentos/Estudio Nomade/activatemodadeportiva
```

Branch actual probable: `feat/visual-fidelity-pencil-brand`.

Nueva branch (desde el HEAD actual del checkout principal, **no** desde worktree `:3001`):

```text
feat/quienes-somos-content-photos
```

Síntoma del humano:

> Hay que agregar en **Quienes somos** la info de la carpeta `seccion sobre nosotros` (Word). Además las fotos. Bonito: **una imagen donde se vea ella + el título Quiénes somos**, y **abajo las otras imágenes**.

Smoke obligatorio al final: **http://localhost:3000/quienes-somos** (nunca asumir `:3001`).

---

## 1) Fuentes de verdad (NO inventar copy)

### Word del cliente (texto completo a usar)

Path:

```text
/home/marti/Documentos/Estudio Nomade/activatemodadeportiva/seccion sobre nosotros/Seccion sobre nosotros.docx
```

Contenido extraído (ya validado; pegar este copy, no parafrasear de más):

**Título de sección (en el doc dice “Sobre nosotros”)**  
En la web el nav ya dice **Quienes Somos** y la ruta es `/quienes-somos`.  
Usar H1 de página: **Quiénes somos** (con tilde en Quiénes).  
Opcional eyebrow/subtitle de marca: **Sobre nosotros**.

**Frase principal**

> “Así me sentí el día que empezó todo.”

**Texto emocional (párrafos, respetar voz en 1ª persona)**

> Confiá en vos, podés lograr todo lo que te propongas.  
> Los sueños se cumplen, pero también hay que trabajar mucho, ser constante, no salirse de la meta y poner toda la energía ahí.  
> Hubo un momento en el que sentía que lo tenía todo, pero aun así me sentía vacía. Y fue ahí cuando entendí que tenía que salir a descubrirme, reinventarme y preguntarme qué quería realmente para mi vida.  
> Empecé a buscar eso que me hiciera bien, que me diera ganas de levantarme cada mañana y sentir que estaba construyendo algo por mí y para mí.  
> Así nació Activate.  
> Hoy puedo decir que estoy feliz de haber elegido este camino y de haberme animado a crear algo propio.  
> Activate representa eso para mí: animarse, confiar, trabajar por lo que uno quiere y seguir avanzando.  
> Gracias a todos los que estuvieron y siguen estando del otro lado.  
> Los espero en Activate.

**Presentación de la marca (debajo del texto emocional)**

> Activate es una tienda de moda deportiva pensada para acompañar el movimiento, la comodidad y el estilo en el día a día.  
> Trabajamos con una selección de marcas de indumentaria y accesorios deportivos, priorizando la calidad y la comodidad.  
> Buscamos ofrecer productos funcionales, con una atención cercana y una experiencia de compra simple. Trabajamos con marcas que acompañan nuestros valores: Magher, I-Run, Sox, Head, entre otras.

**Presentación personal**

> “Soy Lorena, creadora de Activate.”  
> Activate nació de las ganas de empezar algo propio, construir un espacio con identidad y ofrecer una propuesta de moda deportiva que combine calidad, comodidad y estilo.

**Tres palabras debajo del collage**

> Movimiento · Estilo · Calidad

**CTA final**

> VER PRODUCTOS → href `/productos` (constante ya existe: `PRODUCTS_HREF` en `src/components/store/chrome.tsx`)

### Fotos reales (hoy en la **raíz del repo**, untracked)

| Archivo raíz (source) | Uso sugerido | Destino `public/` |
|-----------------------|--------------|-------------------|
| `Imagen Lorena.jpeg` (1600×1200) | **Hero grande** — Lorena (ella se ve) | `public/about/lorena-hero.jpg` |
| `Imagen Loena 2.jpeg` (1200×1600) | Galería — Lorena en el local (centro) | `public/about/lorena-local.jpg` |
| `imagen del local.jpeg` (960×1280) | Galería local 1 | `public/about/local-1.jpg` |
| `Imagen del local 2.jpeg` (960×1280) | Galería local 2 | `public/about/local-2.jpg` |
| `Imagen del local 3.jpeg` (960×1280) | Galería local 3 (opcional 4ª) | `public/about/local-3.jpg` |

Notas del Word sobre fotos:

- Ideal: inauguración (Lorena al lado del mostrador), local, Lorena al centro del local, otra del local.
- Composición: **1 foto grande de ella** + **2–3 más chicas** + texto.
- El humano reforzó: **arriba imagen de ella con el “Quiénes somos”**; **abajo el resto de imágenes**.

**Reglas assets (críticas):**

1. Copiar a `public/about/` (crear carpeta). **No** servir paths de la raíz del repo.
2. **No** `git add` los JPEG de la raíz ni el `.docx` ni PDFs de marca.
3. Nombres destino **sin espacios** (ASCII kebab). Extensión `.jpg` OK aunque source sea `.jpeg`.
4. Preferir `next/image` con `width`/`height` o `fill` + container relative; `sizes` razonable mobile-first.
5. Alt texts ES-AR útiles (ej. “Lorena, creadora de Activate Moda Deportiva”).
6. No commitear dumps de 25MB de identidad; solo los about optimizados si hace falta. Los JPEG actuales (~160–300KB) están OK sin recompress obligatorio; si querés, opcional `sharp`/cwebp pero no bloquea.

---

## 2) Estado actual del código (leé live, no asumas)

Página actual (placeholder corto):

```text
src/app/quienes-somos/page.tsx
```

Hoy es un `InfoShell` genérico con 2 párrafos + dirección + contacto. **Reemplazar el contenido**, no dejar el placeholder.

Shell compartido de legales:

```text
src/components/store/info-page.tsx
```

`InfoShell` = `max-w-2xl` + H1 + children muted.  
Para esta página el layout es **más editorial / visual** → **no te limites a `max-w-2xl` de texto legal**. Opciones OK:

- A) Nueva página standalone (sin `InfoShell`) con layout propio `max-w-5xl` / `max-w-6xl`, **o**
- B) Extender `InfoShell` con props opcionales (`wide`, `flush`, sin forzar muted en todo).

Preferir **A** si tocar `InfoShell` ensucia otras legales (`/envios`, `/contacto`, etc.). Podés reutilizar `ContactLinks` / `StoreAddressBlock` al final si queda natural; no es obligatorio meter la dirección en el hero.

Nav desktop ya apunta a `/quienes-somos` con label **Quienes Somos** (`chrome.tsx` `buildDesktopNav`). **No cambiar** labels del header en este PR.

Tokens marca (Tailwind del proyecto / Pencil):

| Token | Valor |
|-------|--------|
| bg | `#F7F4EF` / `bg-bg` |
| surface | `#FFFFFF` / `bg-surface` |
| text | `#2C2A28` / `text-text` |
| muted | `#7A756E` / `text-muted` |
| accent | `#2F6F6A` / `text-accent` / CTAs |
| border | `#E5DFD6` / `border-border` |
| font | DM Sans |
| radius | 8 / 12 / 16 |

No dark mode. No teal full-bleed promo. Mobile-first.

---

## 3) Layout pedido (aceptación visual)

Implementar en **mobile-first**, desktop más aire.

### Bloque 1 — Hero “ella + Quiénes somos” (arriba)

Composición preferida (elegí la que se vea mejor con la foto landscape 1600×1200 de `lorena-hero`):

**Opción recomendada (overlay editorial):**

- Full-bleed o casi (`-mx` del padding del shell / `w-full`) ratio ~4/5 mobile, ~21/9 o 2/1 desktop.
- Imagen de **Lorena** (`lorena-hero`) `object-cover`, foco en el rostro/torso.
- Overlay gradient oscuro suave (no negro plano) desde abajo o izquierda.
- Encima, tipografía:
  - eyebrow opcional: `SOBRE NOSOTROS` (tracking wide, caption)
  - H1 grande: **Quiénes somos**
  - Frase principal en itálica o quote: *“Así me sentí el día que empezó todo.”*
- No poner el muro de texto emocional encima de la foto (legibilidad).

**Opción B (split desktop):** foto izquierda / texto título+frase derecha; mobile stacked foto arriba texto abajo.

### Bloque 2 — Texto emocional + marca + Lorena

Debajo del hero, en columna legible (`max-w-2xl` o `max-w-3xl` centrado o left):

1. Párrafos del texto emocional (buen `leading-relaxed`, `space-y-4`, color `text-text` o muted suave — **no** gris ilegible).
2. Separador sutil o H2 **La marca** / sin H2 si fluye mejor.
3. Tres párrafos de presentación de marca.
4. Cita o callout: **“Soy Lorena, creadora de Activate.”** + párrafo personal (surface-soft o border-left accent).

### Bloque 3 — Galería abajo (el resto de fotos)

Debajo del copy:

- Grid responsive:
  - mobile: 1 col o 2 col mosaic
  - md+: collage 2–3 cols
- Fotos: `lorena-local`, `local-1`, `local-2`, y si entra bien `local-3`.
- Bordes radius 12–16, sin cards pesadas con sombra dura; gap 8–16.
- Una de las de Lorena en galería puede span 2 filas si el collage lo pide (opcional, no over-engineer).

### Bloque 4 — Tres palabras + CTA

- Centrado: **Movimiento · Estilo · Calidad** (tracking, uppercase o small-caps visual con `tracking-[0.2em]`).
- Botón primary existente del design system: **Ver productos** → `/productos`  
  Buscar clases `btn btn-primary` (ya usadas en contacto).
- Opcional secundario: link a `/contacto`.

### Qué NO hacer

- No CMS/admin para este copy v1 (hardcode en el page/component está OK; es contenido de marca estable).
- No meter esto en home “bloque de marca” salvo que el humano lo pida aparte.
- No tocar checkout, stock, tRPC domain.
- No reescribir header/nav/logo.
- No `git add -A`.
- No editar worktree `.worktrees/home-header-hero-visual` — solo checkout principal.
- No inventar biografía extra ni “fundadora desde 20XX” si no está en el Word.

---

## 4) Archivos esperados a tocar

| Path | Acción |
|------|--------|
| `public/about/*.jpg` | crear (copiar desde raíz) |
| `src/app/quienes-somos/page.tsx` | reescribir layout + copy |
| opcional `src/components/store/about-page.tsx` o `quienes-somos-content.tsx` | si la page queda gorda, extraer presentational |
| `public/sw.js` | bump `CACHE` string si SW cachea navigations de HTML estático de forma agresiva (como en otros fixes visuales) |

No hace falta migration/Supabase.

---

## 5) Pasos de ejecución (orden)

1. `cd` al path absoluto del repo.
2. `git status` + `git branch --show-current`. Confirmar que **no** estás en el worktree.
3. `git checkout -b feat/quienes-somos-content-photos` (o desde la branch visual actual si el humano quiere seguir ahí — default: branch nueva).
4. `mkdir -p public/about` y copiar/renombrar fotos:

```bash
cp "Imagen Lorena.jpeg" public/about/lorena-hero.jpg
cp "Imagen Loena 2.jpeg" public/about/lorena-local.jpg
cp "imagen del local.jpeg" public/about/local-1.jpg
cp "Imagen del local 2.jpeg" public/about/local-2.jpg
cp "Imagen del local 3.jpeg" public/about/local-3.jpg
```

5. Implementar UI según §3.
6. Si `pnpm dev` no corre en **:3000**, levantarlo en el checkout principal.
7. Browser smoke §6.
8. Verify §7.
9. Commit **solo** archivos del feature (ver §8).

---

## 6) Acceptance (browser — obligatorio)

Abrir **http://localhost:3000/quienes-somos** (hard refresh / soft; si UI vieja, unregister SW).

Checklist:

- [ ] Se ve **foto de Lorena** arriba con título **Quiénes somos** (y frase principal visible).
- [ ] Debajo está el **texto emocional completo** del Word (no el placeholder de San Manuel solamente).
- [ ] Está el bloque de **marca** (Magher, I-Run, Sox, Head…).
- [ ] Está **“Soy Lorena, creadora de Activate.”**
- [ ] **Abajo** hay galería con **local + otras fotos** (mínimo 3 imágenes en total en la página contando hero).
- [ ] **Movimiento · Estilo · Calidad**
- [ ] CTA **Ver productos** → `/productos` funciona.
- [ ] Mobile 390px legible: tipografía no overflow, botones ≥44–48px, imágenes no rompen layout.
- [ ] Desktop 1440: no se ve “artículo legal flaco” vacío; se siente marca.
- [ ] Nav header sigue: Mujer · Hombre · Accesorios · Quienes Somos.
- [ ] No errores runtime en consola por `next/image` o paths 404.

Si el humano dice “no lo veo”: verificar puerto **:3000** vs **:3001** worktree.

---

## 7) Verify

```bash
cd "/home/marti/Documentos/Estudio Nomade/activatemodadeportiva"
# scoped si global lint está ruidoso:
pnpm exec eslint "src/app/quienes-somos/**/*.{ts,tsx}" "src/components/store/**/*.{ts,tsx}" --max-warnings 0
pnpm exec tsc --noEmit
# o al menos:
pnpm build
```

No hace falta `pnpm test` de dominio para este cambio de UI estática, salvo que toques algo compartido raro.

---

## 8) Git

Stage **solo**:

- `public/about/**`
- `src/app/quienes-somos/**`
- component nuevo si aplica
- `public/sw.js` si bump

**No** stage:

- raíz `Imagen*.jpeg`, `fotoportada.png`, `categoria*.png`, PDFs, `Estructura web.docx`, `seccion sobre nosotros/**`, `.env*`, `.next`

Commit (esta máquina a veces falla GPG — usar `--no-gpg-sign` si `-S` rompe):

```bash
git add public/about src/app/quienes-somos
# + otros paths del feature
git commit --no-gpg-sign -m "$(cat <<'EOF'
feat(store): quienes-somos with Lorena story and local photos

Replace placeholder about page with client copy from the Sobre nosotros
brief, hero photo of Lorena, and a photo gallery of the store.
EOF
)"
```

PR opcional a `main` o merge en la branch visual según pida el humano. No push a main directo.

---

## 9) Informe final al humano (formato)

```text
DONE / BLOCKED
Branch:
Commit:
URL smoke: http://localhost:3000/quienes-somos
Fotos en public/about: (listar)
Layout: hero overlay | split (cuál)
Verify: eslint/tsc/build
Notas:
```

---

## 10) Pitfalls Activate (no negociable)

1. Smoke en **:3000** del checkout principal.
2. BrandLogo/nav **no** forman parte de este ticket.
3. Nunca servir imágenes desde la raíz del monorepo.
4. Nunca `git add -A` con dumps de cliente.
5. Copy ES-AR voseo del Word; no neutralizar a “tú”.
6. CTA productos = `/productos` (no solo `/c/mujer`).
7. KISS: una page bien hecha > carrusel fancy / parallax / Framer.
