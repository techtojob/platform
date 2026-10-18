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
  "datos-ia",
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

/** Visibilidad por defecto de un perfil nuevo. */
export const VISIBILIDAD_POR_DEFECTO = "registrados" satisfies VisibilidadPerfil;

export type Area = (typeof AREAS)[number];
export type Seniority = (typeof SENIORITY)[number];
export type Modalidad = (typeof MODALIDADES)[number];
export type Disponibilidad = (typeof DISPONIBILIDAD)[number];
export type VisibilidadPerfil = (typeof VISIBILIDAD_PERFIL)[number];
