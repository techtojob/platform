import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Usa siempre estos `Link`, `redirect`, `useRouter`… en vez de los de `next/*`:
 * escriben la dirección en el idioma de quien navega (/empleo/talento o /jobs/talent).
 * Se les pasa la ruta interna: <Link href="/talento">.
 */
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
