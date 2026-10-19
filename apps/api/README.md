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

## Inicio de sesión

Se entra con **Google** o **GitHub** (Better Auth, `src/auth.ts`). **Discord no sirve para entrar**: se vincula desde "Mi cuenta" y el bot de TechToJob comprueba si la persona está en el servidor (`src/servicios/discord.ts`). Solo pedimos a Discord el permiso `identify` (id y nombre de usuario).

Las rutas son `/api/auth/*`, pero la web las sirve desde su propio dominio (rewrite en `apps/web/next.config.ts`): así la cookie de sesión es de la web. Por eso todas las direcciones de vuelta apuntan a la web (`localhost:3000`), no al API.

Un proveedor sin configurar simplemente no funciona; el resto de la web, sí.

### Configurarlo en local (una vez)

1. `pnpm --filter api db:migrar` (crea las tablas de usuarios).
2. En `.dev.vars`, `BETTER_AUTH_SECRET` con un valor al azar:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
3. **GitHub** → https://github.com/settings/applications/new
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
   - Copia el Client ID y genera un Client secret → `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET`.
   - GitHub solo admite una dirección de vuelta por app: producción tendrá su propia app.
4. **Google** → https://console.cloud.google.com → proyecto TechToJob → *Google Auth Platform* → *Clients* → *Create client* → *Web application*
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - → `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
5. **Discord** → https://discord.com/developers/applications → la app del bot de TechToJob
   - *OAuth2* → *Redirects*: `http://localhost:3000/api/auth/callback/discord` → `DISCORD_CLIENT_ID` y `DISCORD_CLIENT_SECRET`.
   - *Bot* → *Reset Token* → `DISCORD_BOT_TOKEN`. El bot tiene que estar en el servidor.
   - Id del servidor: en Discord, *Ajustes → Avanzado → Modo desarrollador*; luego clic derecho en el servidor → *Copiar ID del servidor* → `DISCORD_SERVIDOR_ID` en `wrangler.jsonc` (no es secreto).

En producción, lo mismo con `https://techtojob.com` y los secretos con `wrangler secret put` (issue #16).

## Rutas

| Ruta | Qué hace |
| --- | --- |
| `GET /salud` | Comprueba que el API está vivo. |
| `GET /ofertas?idiomas=es,en` | Ofertas publicadas que piden solo idiomas de la lista, de la más nueva a la más antigua. Opcionales: `q` (texto: título, resumen, empresa y, si es una tecnología, sus ofertas), `area`, `nivel`, `modalidad`, `tec` (separados por comas), `salario=1` (solo con salario), `limite` y `despues` (página siguiente). Devuelve también `total` (todas las páginas), `ocultasPorIdioma` (cuántas quedan fuera por cada idioma que no hablas) y `facetas` (cuántas hay con cada área, nivel y modalidad, contando el resto de filtros). |
| `GET/POST /api/auth/*` | Inicio de sesión (Better Auth). Se usa a través de la web. |
| `GET /cuenta` | Quién ha iniciado sesión y el estado de su Discord. 401 sin sesión. |
| `POST /cuenta/discord/comprobar` | Vuelve a preguntar al bot si está en el servidor. |
| `GET /ofertas/:id` | Una oferta publicada entera: descripción, enlace para aplicar (`urlOriginal`) y web de la empresa. No filtra por idiomas. 404 si no existe o no está publicada. |

## Normas

- **Única pieza que habla con la base de datos** (Postgres en Neon). La web nunca se conecta a ella directamente.
- **Listas fijas y tipos** compartidos con la web: de `@techtojob/shared`.
- **Errores** siempre con el mismo formato: `{ "error": { "codigo": "no_encontrado", "mensaje": "…" } }`.
- **Secretos** (connection string, claves de login…) en `.dev.vars` en local (no se sube) y con `wrangler secret put` en Cloudflare. Nunca en el código ni en `wrangler.jsonc`.
- **CORS:** solo pueden llamar al API las webs de `ORIGENES_PERMITIDOS` (en `wrangler.jsonc`).
