/**
 * Listas fijas de TechToJob.
 *
 * Son la base de los filtros, los perfiles, las ofertas y, más adelante, los retos
 * y las noticias. Aquí solo hay identificadores: no se cambian una vez en producción
 * porque se usan en la base de datos y en las URLs.
 *
 * Los nombres que ve la gente están en los archivos de textos de cada idioma
 * (apps/web/messages/<idioma>.json), con la misma clave: `areas.desarrollo`…
 */

export const AREAS = [
  "desarrollo",
  "datos",
  "ia",
  "ciberseguridad",
  "producto-diseno",
  "infra-devops",
  "soporte-it",
] as const;

export const SENIORITY = [
  "sin-experiencia",
  "junior",
  "mid",
  "senior",
  "lead",
] as const;

export const MODALIDADES = [
  "remoto",
  "hibrido",
  "presencial",
] as const;

export const DISPONIBILIDAD = [
  "buscando",
  "abierto",
  "freelance",
  "no-busca",
] as const;

export const VISIBILIDAD_PERFIL = [
  "publico",
  "registrados",
  "oculto",
] as const;

/**
 * Emblemas de los perfiles:
 * - fundador: entre los 1.000 primeros registrados en la bolsa (sale solo);
 * - torneo: ganador de un torneo de la comunidad;
 * - quiz: primero del ranking del quiz del Discord.
 * - juicio: su portfolio pasó por "Tu portfolio a juicio" (el directo de los viernes).
 */
export const TIPOS_EMBLEMA = ["fundador", "torneo", "quiz", "juicio"] as const;

/** Visibilidad por defecto de un perfil nuevo. */
export const VISIBILIDAD_POR_DEFECTO = "registrados" satisfies VisibilidadPerfil;

export type Area = (typeof AREAS)[number];
export type Seniority = (typeof SENIORITY)[number];
export type Modalidad = (typeof MODALIDADES)[number];
export type Disponibilidad = (typeof DISPONIBILIDAD)[number];
export type VisibilidadPerfil = (typeof VISIBILIDAD_PERFIL)[number];
export type TipoEmblema = (typeof TIPOS_EMBLEMA)[number];

/** Estado de una oferta en la bolsa. Solo las "publicada" se ven en la web. */
export const ESTADOS_OFERTA = ["pendiente", "publicada", "rechazada", "cerrada"] as const;
export type EstadoOferta = (typeof ESTADOS_OFERTA)[number];

/**
 * Cómo llegó la oferta: la trajo un conector (automática), la subió el staff (manual)
 * o la subió alguien desde la web con su cuenta (usuario; la revisa el staff antes de salir).
 */
export const ORIGENES_OFERTA = ["automatica", "manual", "usuario"] as const;
export type OrigenOferta = (typeof ORIGENES_OFERTA)[number];
