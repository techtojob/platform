# apps/web

La web de la bolsa de empleo: Next.js + TypeScript + Tailwind CSS.

Se sirve en **techtojob.com/empleo** (`basePath: "/empleo"` en `next.config.ts`). Los enlaces con `next/link` ya añaden `/empleo` solos; en `<Image src>` hay que ponerlo a mano.

```bash
pnpm dev        # desde la raíz del repo → http://localhost:3000/empleo
```

- Colores y tipografía de la marca: `src/app/globals.css` (`bg-ink`, `bg-slate`, `text-primary`, `bg-postit`), iguales que en la landing.
- Listas fijas (áreas, tecnologías…): se importan de `@techtojob/shared`, nunca se copian aquí.
- Todos los textos visibles en español; más adelante irán en archivos de idioma.
- Antes de escribir código, lee `AGENTS.md`: esta versión de Next.js tiene cambios respecto a lo que conoces.
