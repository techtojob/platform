import type { Idioma, NivelIdioma } from "./idiomas";
import type { Area, EstadoOferta, Modalidad, Seniority } from "./listas";

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
  /** Si puede usar el panel de staff (rol de moderador en Discord o email en la lista de staff). */
  esStaff: boolean;
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

/* ── Panel de staff ─────────────────────────────────────────────── */

/** Zonas desde las que se puede trabajar en remoto. */
export const ZONAS_REMOTO = ["es", "eu", "latam", "mundo"] as const;
export type ZonaRemoto = (typeof ZONAS_REMOTO)[number];

export const MONEDAS = ["EUR", "USD", "GBP"] as const;
export type Moneda = (typeof MONEDAS)[number];

/** Lo que el staff escribe al crear o editar una oferta (POST/PUT /staff/ofertas). */
export type DatosOferta = {
  empresaId: string;
  titulo: string;
  resumen: string | null;
  descripcion: string | null;
  /** Idioma en que está escrita. */
  idioma: Idioma;
  urlOriginal: string;
  area: Area;
  seniority: Seniority;
  modalidad: Modalidad;
  tecnologias: string[];
  pais: string | null;
  ciudad: string | null;
  remotoDesde: ZonaRemoto | null;
  salarioMin: number | null;
  salarioMax: number | null;
  moneda: Moneda | null;
  idiomasRequeridos: Array<{ idioma: Idioma; nivel: NivelIdioma | null }>;
};

/** Una oferta vista por el staff: todo, en cualquier estado. */
export type OfertaStaff = DatosOferta & {
  id: string;
  slug: string;
  empresa: { id: string; nombre: string; slug: string; web: string | null };
  estado: EstadoOferta;
  motivoRechazo: string | null;
  /** Fechas ISO. */
  creadaEn: string;
  publicadaEn: string | null;
  caducaEn: string | null;
  revisadaEn: string | null;
};

/** Lo que el staff marca antes de publicar: lo que promete el post-it del listado. */
export const COMPROBACIONES = ["empresa", "enlace", "idiomas"] as const;
export type Comprobacion = (typeof COMPROBACIONES)[number];

export type EmpresaStaff = { id: string; nombre: string; slug: string; web: string | null; ofertas: number };

/** Error 400 con los campos que están mal: { campos: { titulo: "corto" } }. */
export type ErrorValidacion = { error: ErrorApi["error"] & { campos: Record<string, string> } };

/** Una oferta del panel que ya usa ese enlace (para no meterla dos veces). */
export type OfertaRepetida = { id: string; titulo: string; estado: EstadoOferta; empresa: string };

/**
 * Respuesta de POST /staff/importar: lo que se ha podido leer de la página de la oferta.
 * Todo son sugerencias para el formulario; lo que no se sabe, no viene.
 * - fuente "datos": la página trae los datos de la oferta para Google (JobPosting). Lo más fiable.
 * - fuente "pagina": solo el título y la descripción de la página.
 * - fuente "nada": no se pudo abrir o no hay nada útil (pasa con LinkedIn).
 */
export type OfertaImportada = {
  fuente: "datos" | "pagina" | "nada";
  repetida: OfertaRepetida | null;
  titulo?: string;
  /** La empresa: si ya está en la bolsa, con su id. */
  empresa?: { id: string | null; nombre: string; web: string | null };
  resumen?: string;
  descripcion?: string;
  idioma?: Idioma;
  area?: Area;
  seniority?: Seniority;
  modalidad?: Modalidad;
  ciudad?: string;
  pais?: string;
  remotoDesde?: ZonaRemoto;
  salarioMin?: number;
  salarioMax?: number;
  moneda?: Moneda;
  tecnologias: string[];
  idiomasRequeridos: Array<{ idioma: Idioma; nivel: NivelIdioma | null }>;
};
