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

/** Una oferta entera (GET /ofertas/:id): lo del listado y además el texto completo y el enlace para aplicar. */
export type OfertaDetalle = OfertaListado & {
  descripcion: string | null;
  /** A donde se manda a la gente para aplicar: la oferta en la web de la empresa. */
  urlOriginal: string;
  empresa: OfertaListado["empresa"] & { web: string | null };
};

/** Respuesta de GET /ofertas. */
export type ResultadoOfertas = {
  ofertas: OfertaListado[];
  /** Cuántas ofertas hay en total con estos filtros e idiomas (no solo en esta página). */
  total: number;
  /** Para pedir la página siguiente (`despues=`); null si no hay más. */
  siguiente: string | null;
  /** Ofertas que quedan fuera por cada idioma que la persona no habla: { en: 12 }. */
  ocultasPorIdioma: Partial<Record<Idioma, number>>;
  /**
   * Cuántas ofertas hay con cada valor de cada filtro, contando el resto de filtros
   * puestos: el "Desarrollo 12" junto a cada casilla. Solo en la primera página.
   */
  facetas: {
    area: Partial<Record<Area, number>>;
    seniority: Partial<Record<Seniority, number>>;
    modalidad: Partial<Record<Modalidad, number>>;
  };
};

/** Respuesta de error de cualquier ruta. */
export type ErrorApi = { error: { codigo: string; mensaje: string } };

/** Respuesta de GET /cuenta: quién ha iniciado sesión y su Discord. 401 si nadie. */
export type Cuenta = {
  usuario: { id: string; nombre: string; email: string; imagen: string | null };
  /** Con qué puede entrar o qué tiene vinculado: "google", "github", "discord". */
  proveedores: string[];
  discord: {
    /** Si en este entorno se puede vincular Discord (está configurado). */
    disponible: boolean;
    vinculado: boolean;
    /** Id interno de la vinculación (para desvincular). */
    cuentaId: string | null;
    /** Nombre de usuario de Discord. */
    nombre: string | null;
    enServidor: boolean;
    /** Ids de sus roles en el servidor. */
    roles: string[];
    /** Fecha ISO de la última comprobación. */
    comprobadoEn: string | null;
    /** Invitación al servidor, para quien aún no está. */
    invitacion: string | null;
  };
};
