# TechToJob – Plataforma

La bolsa de empleo de [TechToJob](https://techtojob.com): ofertas tech revisadas por el staff, perfiles de talento y, en próximas fases, torneos, retos y noticias.

> **Estado:** fase 0 en preparación. Todavía no hay nada publicado.

## Qué hay en este repo

```
apps/
  web/        La web de la bolsa (Next.js + TypeScript + Tailwind) → techtojob.com/empleo (español) y techtojob.com/jobs (inglés)
  api/        El API → api.techtojob.com (framework pendiente de decidir por backend)
packages/
  shared/     Tipos y listas fijas compartidas: áreas, seniority, modalidad, tecnologías…
```

La landing está en otro repo, [techtojob/landing](https://github.com/techtojob/landing), y ocupa la raíz de techtojob.com.

## Diseño

Todo el diseño de la fase 0 está en Figma: [Bolsa de empleo – Fase 0](https://www.figma.com/design/vwPWI3ny45ONm0WruVGrRM/Bolsa-de-empleo-%E2%80%93-Fase-0).

- **Estilos y componentes:** colores, tipografía (Sora) y componentes comunes.
- **Pantallas:** una sección por pantalla, numerada igual que su issue (02 Listado de ofertas … 10 Créditos y legales).
- **Borradores:** para probar ideas.

Diseño edita; el resto del equipo tiene acceso de lectura. Si no puedes entrar, pídelo en Discord.

## Arrancar en local (5 minutos)

Necesitas **Node.js 22** y **pnpm**:

```bash
corepack enable            # activa pnpm, viene con Node
git clone https://github.com/techtojob/platform.git
cd platform
pnpm install
pnpm dev                   # → http://localhost:3000 (te lleva a /empleo o /jobs)
```

Comandos desde la raíz:

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Arranca la web en modo desarrollo |
| `pnpm typecheck` | Comprueba los tipos de todo el repo |
| `pnpm lint` | Revisa el estilo del código |
| `pnpm build` | Compila todo, igual que en producción |

Las tres últimas se ejecutan solas en cada pull request; si fallan, el PR no se puede unir.

## Cómo trabajamos

1. Coge una issue del [tablero de la fase 0](https://github.com/orgs/techtojob/projects) y asígnatela.
2. Crea una rama: `feat/…`, `fix/…` o `docs/…`.
3. Abre un pull request hacia `main`. Necesita al menos una aprobación.
4. Nada de claves ni connection strings en el código: van en `.env.local` (que no se sube) o en los secretos de Cloudflare y GitHub.

Normas completas en la [guía de contribución](https://github.com/techtojob/.github/blob/main/CONTRIBUTING.md) y el [código de conducta](https://github.com/techtojob/.github/blob/main/CODE_OF_CONDUCT.md).

## Reglas que no se rompen

- **Listas fijas:** áreas, tecnologías, seniority y modalidad solo se usan desde `@techtojob/shared`. ¿Falta una tecnología? Añádela allí con un PR.
- **La web nunca habla con la base de datos:** todo pasa por el API.
- **Móvil primero y accesible:** contraste suficiente, navegación con teclado y textos alternativos.
- **Datos personales con cuidado:** nunca se muestran email ni teléfono, y en desarrollo se usan datos de prueba, nunca reales.

## Licencia

[GNU AGPL v3](LICENSE). Puedes reutilizar el código, pero si publicas una versión modificada tienes que liberar también tu código.

Quien colabora con el proyecto firma antes el acuerdo de colaboración de TechToJob.
