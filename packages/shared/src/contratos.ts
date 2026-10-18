import type { Idioma, NivelIdioma } from "./idiomas";
import type { Area, Modalidad, Seniority } from "./listas";

/**
 * Contratos del API: la forma exacta de lo que devuelve cada ruta.
 * El API los cumple y la web los usa, así los dos siempre hablan igual.
 */

/** Una oferta tal y como sale en el listado (GET /ofertas). */
export type OfertaListado = {
  id: string;
  slug: string;
  titulo: string;
  resumen: string | null;
  idioma: Idioma;
  empresa: { nombre: string; slug: string; logoUrl: string | null };
  area: Area;
  seniority: Seniority;
  modalidad: Modalidad;
  tecnologias: string[];
  pais: string | null;
  ciudad: string | null;
  /** Si es remoto, desde qué zona: "es", "eu", "latam", "mundo". */
  remotoDesde: string | null;
  salario: { min: number | null; max: number | null; moneda: string | null } | null;
  idiomasRequeridos: Array<{ idioma: Idioma; nivel: NivelIdioma | null }>;
  /** Fecha ISO. */
  publicadaEn: string;
};

/** Respuesta de GET /ofertas. */
export type ResultadoOfertas = {
  ofertas: OfertaListado[];
  /** Para pedir la página siguiente (`despues=`); null si no hay más. */
  siguiente: string | null;
  /** Ofertas que quedan fuera por cada idioma que la persona no habla: { en: 12 }. */
  ocultasPorIdioma: Partial<Record<Idioma, number>>;
};

/** Respuesta de error de cualquier ruta. */
export type ErrorApi = { error: { codigo: string; mensaje: string } };
