# apps/web

La web de la bolsa de empleo: Next.js + TypeScript + Tailwind CSS.

```bash
pnpm dev:api    # en una terminal: el API (ver apps/api/README.md)
pnpm dev        # en otra: la web → http://localhost:3000 (te lleva a /empleo o /jobs)
```

La web pide los datos al API de `API_URL` (por defecto `http://localhost:8787`). Las llamadas están en `src/lib/api.ts`; las páginas nunca usan `fetch` directamente.

- Colores y tipografía de la marca: `src/app/globals.css` (`bg-ink`, `bg-slate`, `text-primary`, `bg-postit`), iguales que en la landing.
- Listas fijas (áreas, tecnologías…): se importan de `@techtojob/shared`, nunca se copian aquí.
- Antes de escribir código, lee `AGENTS.md`: esta versión de Next.js tiene cambios respecto a lo que conoces.

## Dónde va cada cosa

La regla: **lo que hace la web y cómo se ve van separados**. Así se puede programar antes de tener el diseño final y cambiar el diseño después sin romper nada.

```
src/
  app/[locale]/      Páginas. Delgadas: piden datos, los pasan a componentes y poco más.
  components/ui/     Componentes base (Boton, Campo, Etiqueta, ChipFiltro, Tarjeta…).
                     Todo el aspecto visual vive aquí y en globals.css.
  components/        Componentes de la bolsa hechos con los de ui/ (tarjeta de oferta, filtros…).
  lib/               Lógica sin aspecto visual: llamadas al API, filtros, formatos… Sin JSX.
  i18n/              Idiomas y rutas.
  app/globals.css    Colores, tamaños de título y redondeos. Un cambio aquí afecta a toda la web.
```

- **Nunca un botón, campo o chip hecho a mano** en una página: se usa el de `@/components/ui`. Si falta alguno, se añade allí.
- **Nada de colores sueltos** (`#84c0bf`, `bg-[#…]`): se usan los del tema (`bg-primary`, `text-peligro`…).
- **El catálogo** con todos los componentes está en `/empleo/componentes`. Útil para revisar cambios de diseño de un vistazo.

## Idiomas

Cada idioma tiene su propia dirección y sus rutas traducidas:

| | Español | Inglés |
| --- | --- | --- |
| Inicio | `/empleo` | `/jobs` |
| Talento | `/empleo/talento` | `/jobs/talent` |
| Una oferta | `/empleo/ofertas/<slug>` | `/jobs/offers/<slug>` |

**Cómo se elige el idioma** (`src/proxy.ts`):

1. Si la persona lo eligió a mano con el selector (cookie `TTJ_IDIOMA`), se respeta siempre.
2. Si no: idioma del navegador → país (cabecera `CF-IPCountry` de Cloudflare) → español.
3. Si entra por una dirección de otro idioma, se le lleva a la misma página en el suyo (`/empleo/talento` → `/jobs/talent`). A los buscadores no se les redirige.

### Reglas al programar

- **Ningún texto escrito en el código.** Todos van en `messages/es.json` (el español es la referencia) y su traducción en `messages/en.json`. En los componentes: `const t = useTranslations(); t("inicio.titulo")`.
- **Enlaces con la ruta interna** (la de las carpetas de `src/app`), usando `Link` de `@/i18n/navigation`, no el de `next/link`:

  ```tsx
  import { Link } from "@/i18n/navigation";
  <Link href="/talento">…</Link>                                   // → /empleo/talento o /jobs/talent
  <Link href={{ pathname: "/ofertas/[slug]", params: { slug } }}>…</Link>
  ```
- **Página nueva:** su carpeta en `src/app/[locale]/…` y su ruta traducida en `src/i18n/idiomas.json` para cada idioma.
- **Listas fijas:** en `@techtojob/shared` solo hay identificadores. El nombre se pinta con `t(\`areas.${area}\`)`.
- **Fechas y números:** con `useFormatter()` de next-intl, que los adapta al idioma solo.

### Añadir un idioma

1. En `src/i18n/idiomas.json`, añadir su entrada: nombre, `base` (única, por ejemplo `/empregos`) y sus rutas traducidas.
2. Crear `messages/<código>.json` copiando `en.json` y traduciendo. Lo que falte se muestra en inglés.
3. En Cloudflare, añadir la ruta `techtojob.com/<base>*` hacia esta app.

`pnpm typecheck` comprueba que las bases no choquen y que las rutas cuadren, y avisa de los textos que faltan por traducir.
