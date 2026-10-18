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

## Normas

- **Única pieza que habla con la base de datos** (Postgres en Neon). La web nunca se conecta a ella directamente.
- **Listas fijas y tipos** compartidos con la web: de `@techtojob/shared`.
- **Errores** siempre con el mismo formato: `{ "error": { "codigo": "no_encontrado", "mensaje": "…" } }`.
- **Secretos** (connection string, claves de login…) en `.dev.vars` en local (no se sube) y con `wrangler secret put` en Cloudflare. Nunca en el código ni en `wrangler.jsonc`.
- **CORS:** solo pueden llamar al API las webs de `ORIGENES_PERMITIDOS` (en `wrangler.jsonc`).
