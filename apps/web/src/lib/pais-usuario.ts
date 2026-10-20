import { PAISES } from "@techtojob/shared";

/**
 * Desde qué país trabaja quien visita la bolsa: decide qué ofertas ve (solo las que puede hacer desde allí).
 * Orden: lo que eligió a mano (cookie) → el país de su perfil (con sesión) → el país de su conexión
 * (Cloudflare) → ninguno (ve todas). Si eligió "todos", ve todas aunque sepamos su país.
 */

export const COOKIE_DESDE = "TTJ_DESDE";
export const TODOS = "todos";

const esPais = (v: string | null | undefined): v is string => !!v && (PAISES as readonly string[]).includes(v.toUpperCase());

export function paisDelUsuario({
  cookie,
  paisPerfil,
  paisConexion,
}: {
  cookie: string | undefined | null;
  paisPerfil?: string | null;
  paisConexion: string | null | undefined;
}): string | null {
  if (cookie === TODOS) return null;
  if (esPais(cookie)) return cookie.toUpperCase();
  if (esPais(paisPerfil)) return paisPerfil.toUpperCase();
  return esPais(paisConexion) ? paisConexion.toUpperCase() : null;
}

