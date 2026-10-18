# apps/api

El API de la bolsa, en **api.techtojob.com**: [Hono](https://hono.dev) sobre Cloudflare Workers.

```bash
pnpm dev:api     # desde la raíz → http://localhost:8787/salud
pnpm test        # pruebas (Vitest)
```

## Dónde va cada cosa

```
src/
  index.ts       Punto de entrada en Cloudflare.
  app.ts         Monta el API: CORS, rutas y formato de errores.
  rutas/         Una carpeta o archivo por grupo de rutas (salud, ofertas, perfiles…).
                 Solo hacen de puente: leen la petición, llaman a servicios/ y responden.
  servicios/     La lógica de verdad (qué ofertas ve cada uno, cómo se guarda un perfil…).
                 TypeScript normal, sin nada de Hono.
test/            Pruebas de servicios y de rutas.
```

**La regla:** nada de Hono dentro de `servicios/`. Así la lógica se prueba sola y, si algún día cambiamos de framework (por ejemplo a NestJS), solo se rehacen las rutas.

## Base de datos

Postgres en [Neon](https://neon.tech) con [Drizzle](https://orm.drizzle.team). Las tablas están en `src/db/esquema.ts` y las migraciones en `migraciones/`.

**Primera vez (en tu ordenador):**

1. Copia `.dev.vars.example` como `.dev.vars` y pega la connection string de la **rama `dev`** de Neon. Ese archivo no se sube nunca a GitHub.
2. `pnpm --filter api db:migrar` crea las tablas.
3. `pnpm --filter api db:datos-prueba` carga empresas y ofertas inventadas.
4. `pnpm dev:api` y abre http://localhost:8787/ofertas?idiomas=es,en

**Cambiar una tabla:**

1. Edita `src/db/esquema.ts`.
2. `pnpm --filter api db:generar --name que-cambia` crea la migración en `migraciones/`. Revísala y súbela en el PR.
3. `pnpm --filter api db:migrar` la aplica en tu rama `dev`.

**Pruebas:** usan un Postgres en memoria (PGlite) con las mismas migraciones y los datos de `src/db/datos-prueba.ts`. No necesitan conexión ni claves.

## Rutas

| Ruta | Qué hace |
| --- | --- |
| `GET /salud` | Comprueba que el API está vivo. |
| `GET /ofertas?idiomas=es,en` | Ofertas publicadas que piden solo idiomas de la lista, de la más nueva a la más antigua. Filtros opcionales: `area`, `nivel`, `modalidad`, `tec` (separados por comas), `limite` y `despues` (página siguiente). Devuelve también `ocultasPorIdioma`: cuántas quedan fuera por cada idioma que no hablas. |

## Normas

- **Única pieza que habla con la base de datos** (Postgres en Neon). La web nunca se conecta a ella directamente.
- **Listas fijas y tipos** compartidos con la web: de `@techtojob/shared`.
- **Errores** siempre con el mismo formato: `{ "error": { "codigo": "no_encontrado", "mensaje": "…" } }`.
- **Secretos** (connection string, claves de login…) en `.dev.vars` en local (no se sube) y con `wrangler secret put` en Cloudflare. Nunca en el código ni en `wrangler.jsonc`.
- **CORS:** solo pueden llamar al API las webs de `ORIGENES_PERMITIDOS` (en `wrangler.jsonc`).
