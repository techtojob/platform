/**
 * Listas fijas de TechToJob.
 *
 * Son la base de los filtros, los perfiles, las ofertas y, más adelante, los retos
 * y las noticias. Los valores (`id`) no se cambian una vez en producción: se usan
 * en la base de datos y en las URLs. El texto (`nombre`) sí se puede cambiar.
 */

export const AREAS = [
  { id: "desarrollo", nombre: "Desarrollo" },
  { id: "datos-ia", nombre: "Datos e IA" },
  { id: "ciberseguridad", nombre: "Ciberseguridad" },
  { id: "producto-diseno", nombre: "Producto y Diseño" },
  { id: "infra-devops", nombre: "Infra y DevOps" },
  { id: "soporte-it", nombre: "Soporte IT" },
] as const;

export const SENIORITY = [
  { id: "sin-experiencia", nombre: "Sin experiencia" },
  { id: "junior", nombre: "Junior" },
  { id: "mid", nombre: "Mid" },
  { id: "senior", nombre: "Senior" },
  { id: "lead", nombre: "Lead" },
] as const;

export const MODALIDADES = [
  { id: "remoto", nombre: "Remoto" },
  { id: "hibrido", nombre: "Híbrido" },
  { id: "presencial", nombre: "Presencial" },
] as const;

export const DISPONIBILIDAD = [
  { id: "buscando", nombre: "Buscando activamente" },
  { id: "abierto", nombre: "Abierto a ofertas" },
  { id: "freelance", nombre: "Freelance" },
  { id: "no-busca", nombre: "No busca ahora" },
] as const;

export const VISIBILIDAD_PERFIL = [
  { id: "publico", nombre: "Público" },
  { id: "registrados", nombre: "Solo usuarios registrados" },
  { id: "oculto", nombre: "Oculto" },
] as const;

/** Visibilidad por defecto de un perfil nuevo. */
export const VISIBILIDAD_POR_DEFECTO = "registrados" satisfies VisibilidadPerfil;

export type Area = (typeof AREAS)[number]["id"];
export type Seniority = (typeof SENIORITY)[number]["id"];
export type Modalidad = (typeof MODALIDADES)[number]["id"];
export type Disponibilidad = (typeof DISPONIBILIDAD)[number]["id"];
export type VisibilidadPerfil = (typeof VISIBILIDAD_PERFIL)[number]["id"];
