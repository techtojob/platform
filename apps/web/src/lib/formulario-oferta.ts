import type { OfertaStaff } from "@techtojob/shared";

/**
 * Lo que hay escrito en el formulario de una oferta, tal cual (texto).
 * Se usa para rellenarlo al editar y para no perder lo escrito si algo está mal.
 */
export type ValoresOferta = {
  empresaId: string;
  empresaNombre: string;
  empresaWeb: string;
  titulo: string;
  resumen: string;
  descripcion: string;
  idioma: string;
  urlOriginal: string;
  area: string;
  seniority: string;
  modalidad: string;
  pais: string;
  ciudad: string;
  remotoDesde: string;
  salarioMin: string;
  salarioMax: string;
  moneda: string;
  tecnologias: string[];
  /** Idiomas que pide y su nivel ("" si no lo dice). */
  pide: Array<{ idioma: string; nivel: string }>;
};

/** Valor especial del desplegable de empresas: "es una empresa nueva". */
export const EMPRESA_NUEVA = "__nueva";

export const VALORES_VACIOS: ValoresOferta = {
  empresaId: "",
  empresaNombre: "",
  empresaWeb: "",
  titulo: "",
  resumen: "",
  descripcion: "",
  idioma: "es",
  urlOriginal: "",
  area: "",
  seniority: "",
  modalidad: "",
  pais: "",
  ciudad: "",
  remotoDesde: "",
  salarioMin: "",
  salarioMax: "",
  moneda: "EUR",
  tecnologias: [],
  pide: [{ idioma: "es", nivel: "" }],
};

export function valoresDeOferta(o: OfertaStaff): ValoresOferta {
  return {
    ...VALORES_VACIOS,
    empresaId: o.empresaId,
    titulo: o.titulo,
    resumen: o.resumen ?? "",
    descripcion: o.descripcion ?? "",
    idioma: o.idioma,
    urlOriginal: o.urlOriginal,
    area: o.area,
    seniority: o.seniority,
    modalidad: o.modalidad,
    pais: o.pais ?? "",
    ciudad: o.ciudad ?? "",
    remotoDesde: o.remotoDesde ?? "",
    salarioMin: o.salarioMin?.toString() ?? "",
    salarioMax: o.salarioMax?.toString() ?? "",
    moneda: o.moneda ?? "EUR",
    tecnologias: o.tecnologias,
    pide: o.idiomasRequeridos.map((i) => ({ idioma: i.idioma, nivel: i.nivel ?? "" })),
  };
}

export function valoresDeFormulario(f: FormData): ValoresOferta {
  const texto = (campo: string) => String(f.get(campo) ?? "").trim();
  return {
    empresaId: texto("empresaId"),
    empresaNombre: texto("empresaNombre"),
    empresaWeb: texto("empresaWeb"),
    titulo: texto("titulo"),
    resumen: texto("resumen"),
    descripcion: texto("descripcion"),
    idioma: texto("idioma"),
    urlOriginal: texto("urlOriginal"),
    area: texto("area"),
    seniority: texto("seniority"),
    modalidad: texto("modalidad"),
    pais: texto("pais").toUpperCase(),
    ciudad: texto("ciudad"),
    remotoDesde: texto("remotoDesde"),
    salarioMin: texto("salarioMin"),
    salarioMax: texto("salarioMax"),
    moneda: texto("moneda"),
    tecnologias: f.getAll("tecnologias").map(String),
    pide: f.getAll("pide").map((i) => ({ idioma: String(i), nivel: texto(`nivel-${i}`) })),
  };
}

/** Lo que se manda al API (el API vuelve a comprobarlo todo). */
export function datosParaApi(v: ValoresOferta, empresaId: string) {
  const siHay = (s: string) => s || null;
  return {
    empresaId,
    titulo: v.titulo,
    resumen: siHay(v.resumen),
    descripcion: siHay(v.descripcion),
    idioma: v.idioma,
    urlOriginal: v.urlOriginal,
    area: v.area,
    seniority: v.seniority,
    modalidad: v.modalidad,
    tecnologias: v.tecnologias,
    pais: siHay(v.pais),
    ciudad: siHay(v.ciudad),
    remotoDesde: v.modalidad === "remoto" ? siHay(v.remotoDesde) : null,
    salarioMin: siHay(v.salarioMin),
    salarioMax: siHay(v.salarioMax),
    moneda: v.salarioMin || v.salarioMax ? siHay(v.moneda) : null,
    idiomasRequeridos: v.pide.map((p) => ({ idioma: p.idioma, nivel: siHay(p.nivel) })),
  };
}
