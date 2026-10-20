import { leerCantidad, type OfertaImportada, type OfertaStaff } from "@techtojob/shared";

/**
 * Lo que hay en el formulario de una oferta del staff, tal cual se escribe.
 * El formulario trabaja con esto; al guardar se convierte a lo que pide el API.
 */
export type ValoresOferta = {
  urlOriginal: string;
  /** La empresa elegida. Sin id y con nombre: es una empresa nueva. */
  empresa: { id: string | null; nombre: string; web: string } | null;
  titulo: string;
  idioma: string;
  resumen: string;
  descripcion: string;
  area: string;
  seniority: string;
  modalidad: string;
  remotoDesde: string;
  ciudad: string;
  pais: string;
  tecnologias: string[];
  /** Como se escribe: "35k", "35.000"… */
  salarioMin: string;
  salarioMax: string;
  moneda: string;
  /** Marcado: la oferta no dice el salario (para no confundirlo con un olvido). */
  sinSalario: boolean;
  /** Idiomas que pide y su nivel ("" si no lo dice). */
  pide: Array<{ idioma: string; nivel: string }>;
  /** La empresa nos autoriza a publicarla (sale en Google for Jobs). */
  autorizada: boolean;
};

export const VALORES_VACIOS: ValoresOferta = {
  urlOriginal: "",
  empresa: null,
  titulo: "",
  idioma: "es",
  resumen: "",
  descripcion: "",
  area: "",
  seniority: "",
  modalidad: "",
  remotoDesde: "",
  ciudad: "",
  pais: "ES",
  tecnologias: [],
  salarioMin: "",
  salarioMax: "",
  moneda: "EUR",
  sinSalario: false,
  pide: [{ idioma: "es", nivel: "" }],
  autorizada: false,
};

export function valoresDeOferta(o: OfertaStaff): ValoresOferta {
  return {
    urlOriginal: o.urlOriginal,
    empresa: { id: o.empresa.id, nombre: o.empresa.nombre, web: o.empresa.web ?? "" },
    titulo: o.titulo,
    idioma: o.idioma,
    resumen: o.resumen ?? "",
    descripcion: o.descripcion ?? "",
    area: o.area,
    seniority: o.seniority,
    modalidad: o.modalidad,
    remotoDesde: o.remotoDesde ?? "",
    ciudad: o.ciudad ?? "",
    pais: o.pais ?? "",
    tecnologias: o.tecnologias,
    salarioMin: o.salarioMin?.toString() ?? "",
    salarioMax: o.salarioMax?.toString() ?? "",
    moneda: o.moneda ?? "EUR",
    sinSalario: o.salarioMin == null && o.salarioMax == null,
    pide: o.idiomasRequeridos.map((i) => ({ idioma: i.idioma, nivel: i.nivel ?? "" })),
    autorizada: o.autorizada,
  };
}

/**
 * Pone en el formulario lo que se ha leído de la página de la oferta.
 * Solo cambia lo que la página dice; lo demás se queda como estaba.
 */
export function aplicarImportada(v: ValoresOferta, d: OfertaImportada): { valores: ValoresOferta; rellenados: string[] } {
  const n: ValoresOferta = { ...v };
  const rellenados: string[] = [];
  const poner = <K extends keyof ValoresOferta>(campo: K, valor: ValoresOferta[K] | undefined, nombre: string = campo) => {
    if (valor === undefined || valor === "" || (Array.isArray(valor) && !valor.length)) return;
    n[campo] = valor;
    rellenados.push(nombre);
  };
  poner("titulo", d.titulo);
  if (d.empresa) poner("empresa", { id: d.empresa.id, nombre: d.empresa.nombre, web: d.empresa.web ?? "" });
  poner("idioma", d.idioma);
  poner("resumen", d.resumen);
  poner("descripcion", d.descripcion);
  poner("area", d.area);
  poner("seniority", d.seniority);
  poner("modalidad", d.modalidad);
  poner("remotoDesde", d.remotoDesde);
  if (d.ciudad || d.pais) {
    poner("ciudad", d.ciudad, "lugar");
    if (d.pais) n.pais = d.pais;
  }
  poner("tecnologias", d.tecnologias.length ? [...new Set([...v.tecnologias, ...d.tecnologias])] : undefined);
  if (d.salarioMin || d.salarioMax) {
    n.salarioMin = d.salarioMin?.toString() ?? "";
    n.salarioMax = d.salarioMax?.toString() ?? "";
    n.moneda = d.moneda ?? n.moneda;
    n.sinSalario = false;
    rellenados.push("salario");
  }
  poner(
    "pide",
    d.idiomasRequeridos.length ? d.idiomasRequeridos.map((i) => ({ idioma: i.idioma, nivel: i.nivel ?? "" })) : undefined,
    "idiomas",
  );
  return { valores: n, rellenados: [...new Set(rellenados)] };
}

/** Lo que se manda al API (que vuelve a comprobarlo todo). */
export function datosParaApi(v: ValoresOferta, empresaId: string) {
  const siHay = (s: string) => s.trim() || null;
  const cantidad = (s: string) => (s.trim() ? (leerCantidad(s) ?? s) : null);
  const conSalario = !v.sinSalario && !!(v.salarioMin.trim() || v.salarioMax.trim());
  return {
    empresaId,
    titulo: v.titulo,
    resumen: siHay(v.resumen),
    descripcion: siHay(v.descripcion),
    idioma: v.idioma,
    urlOriginal: v.urlOriginal.trim(),
    area: v.area,
    seniority: v.seniority,
    modalidad: v.modalidad,
    tecnologias: v.tecnologias,
    pais: v.modalidad === "remoto" ? null : siHay(v.pais),
    ciudad: v.modalidad === "remoto" ? null : siHay(v.ciudad),
    remotoDesde: v.modalidad === "remoto" ? siHay(v.remotoDesde) : null,
    salarioMin: conSalario ? cantidad(v.salarioMin) : null,
    salarioMax: conSalario ? cantidad(v.salarioMax) : null,
    moneda: conSalario ? v.moneda : null,
    idiomasRequeridos: v.pide.map((p) => ({ idioma: p.idioma, nivel: siHay(p.nivel) })),
    autorizada: v.autorizada,
  };
}
