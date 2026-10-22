import type { Seniority } from "./listas";

/**
 * El nivel de un perfil no se elige: sale de los años de experiencia trabajando en tech
 * y de si ha liderado un equipo o proyecto técnico. Así "Mid" significa lo mismo para todos.
 *   0 → Sin experiencia · 1–2 → Junior · 3–5 → Mid · 6+ → Senior · 6+ y lidera → Lead
 */
export const MAXIMO_ANOS_EXPERIENCIA = 16; // 16 = "más de 15"

export function nivelPorExperiencia(anos: number, lidera: boolean): Seniority {
  if (anos <= 0) return "sin-experiencia";
  if (anos <= 2) return "junior";
  if (anos <= 5) return "mid";
  return lidera ? "lead" : "senior";
}

/** De dónde sale la foto del perfil. */
export const FOTOS_PERFIL = ["google", "github", "ninguna"] as const;
export type FotoPerfil = (typeof FOTOS_PERFIL)[number];

/** Las fotos que tiene cada persona en sus cuentas (null si no tiene esa cuenta o no hay foto). */
export type FotosCuenta = { google: string | null; github: string | null };

/** La foto que se enseña según lo que ha elegido (si esa ya no está, ninguna). */
export function fotoElegida(foto: FotoPerfil, fotos: FotosCuenta): string | null {
  return foto === "ninguna" ? null : fotos[foto];
}
