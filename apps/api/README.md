# apps/api

Aquí irá el API de la plataforma, en **api.techtojob.com**.

**Pendiente:** el equipo de backend elige el framework antes de empezar con el login. Opciones que se están valorando:

| Opción | A favor | En contra |
| --- | --- | --- |
| **Hono** en Cloudflare Workers | TypeScript como la web, gratis y sin servidor, login hecho con Better Auth | Poca estructura impuesta |
| **NestJS** en un servidor Node | Muy estructurado | Hay que mantener un servidor |
| **FastAPI** (Python) | Rápido de escribir, documentación automática | Otro lenguaje; servidor propio; el login es más trabajo |

Sea cual sea, el API:

- es la **única** pieza que habla con la base de datos (Postgres en Neon);
- usa las listas fijas de `packages/shared`;
- guarda los secretos en los secretos de Cloudflare o GitHub, nunca en el código.
