import type { DatosOferta, DatosOfertaUsuario } from "./contratos";
import { MONEDAS } from "./contratos";
import { PAISES } from "./paises";
import { ordenarPaises, PAISES_PUBLICO } from "./remoto";
import { esIdioma, NIVELES_IDIOMA } from "./idiomas";
import { AREAS, MODALIDADES, SENIORITY } from "./listas";
import { TECNOLOGIAS } from "./tecnologias";

/**
 * Comprueba los datos de una oferta que manda el staff (crear o editar).
 * La usa el API antes de guardar; está aquí para que la web pueda usar las mismas reglas.
 *
 * Devuelve los datos limpios o, si algo está mal, un código por campo:
 * { errores: { titulo: "corto", urlOriginal: "url" } }.
 */

export const LIMITES = {
  titulo: { min: 3, max: 120 },
  resumen: { max: 300 },
  descripcion: { max: 8000 },
  ciudad: { max: 80 },
  tecnologias: { max: 12 },
  /** Responsabilidades y requisitos: cuántos puntos y lo largo de cada uno. */
  puntos: { max: 6, largo: 200 },
  idiomas: { max: 5 },
  salario: { max: 1_000_000 },
} as const;

const idsTecnologias = new Set<string>(TECNOLOGIAS.map((t) => t.id));

type Resultado = { datos: DatosOferta; errores?: undefined } | { datos?: undefined; errores: Record<string, string> };

/** Una lista de puntos: sin viñetas al principio, sin vacíos ni repetidos. */
function puntos(valor: unknown): string[] {
  const lista = Array.isArray(valor) ? valor : typeof valor === "string" ? valor.split("\n") : [];
  const limpios = lista
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.replace(/^\s*(?:[•·▪◦*-]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  return [...new Set(limpios)];
}

/**
 * ¿Se puede publicar? Hace falta lo que escribe el staff con la IA (resumen y al menos una responsabilidad)
 * o, si la empresa nos autoriza, su descripción completa.
 */
export function tieneTextoPublicable(d: Pick<DatosOferta, "resumen" | "responsabilidades" | "descripcion" | "autorizada">): boolean {
  return (!!d.resumen?.trim() && d.responsabilidades.length > 0) || (d.autorizada && !!d.descripcion?.trim());
}

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio : null;
}

function entero(valor: unknown): number | null | "mal" {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(String(valor).replace(/[.\s]/g, ""));
  return Number.isInteger(n) && n >= 0 && n <= LIMITES.salario.max ? n : "mal";
}

function esUrlWeb(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function de<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return typeof valor === "string" && (lista as readonly string[]).includes(valor) ? (valor as T) : null;
}

export function validarOferta(entrada: unknown): Resultado {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const errores: Record<string, string> = {};

  const empresaId = texto(e.empresaId);
  if (!empresaId) errores.empresaId = "falta";

  const titulo = texto(e.titulo);
  if (!titulo) errores.titulo = "falta";
  else if (titulo.length < LIMITES.titulo.min) errores.titulo = "corto";
  else if (titulo.length > LIMITES.titulo.max) errores.titulo = "largo";

  const resumen = texto(e.resumen);
  if (resumen && resumen.length > LIMITES.resumen.max) errores.resumen = "largo";

  const descripcion = texto(e.descripcion);
  if (descripcion && descripcion.length > LIMITES.descripcion.max) errores.descripcion = "largo";

  const responsabilidades = puntos(e.responsabilidades);
  if (responsabilidades.length > LIMITES.puntos.max) errores.responsabilidades = "demasiados";
  else if (responsabilidades.some((p) => p.length > LIMITES.puntos.largo)) errores.responsabilidades = "largo";
  const requisitos = puntos(e.requisitos);
  if (requisitos.length > LIMITES.puntos.max) errores.requisitos = "demasiados";
  else if (requisitos.some((p) => p.length > LIMITES.puntos.largo)) errores.requisitos = "largo";

  const idioma = typeof e.idioma === "string" && esIdioma(e.idioma) ? e.idioma : null;
  if (!idioma) errores.idioma = "falta";

  const urlOriginal = texto(e.urlOriginal);
  if (!urlOriginal) errores.urlOriginal = "falta";
  else if (!esUrlWeb(urlOriginal)) errores.urlOriginal = "url";

  const area = de(AREAS, e.area);
  if (!area) errores.area = "falta";
  const seniority = de(SENIORITY, e.seniority);
  if (!seniority) errores.seniority = "falta";
  const modalidad = de(MODALIDADES, e.modalidad);
  if (!modalidad) errores.modalidad = "falta";

  const tecnologias = Array.isArray(e.tecnologias)
    ? [...new Set(e.tecnologias.filter((t): t is string => typeof t === "string"))]
    : [];
  if (tecnologias.some((t) => !idsTecnologias.has(t))) errores.tecnologias = "desconocida";
  else if (tecnologias.length > LIMITES.tecnologias.max) errores.tecnologias = "demasiadas";

  const pais = texto(e.pais)?.toUpperCase() ?? null;
  if (pais && !/^[A-Z]{2}$/.test(pais)) errores.pais = "codigo";

  const ciudad = texto(e.ciudad);
  if (ciudad && ciudad.length > LIMITES.ciudad.max) errores.ciudad = "largo";

  // Desde dónde se puede trabajar en remoto: cualquier país, o una lista de países (al menos uno).
  const remotoMundo = e.remotoMundo === true;
  const listaPaises = Array.isArray(e.remotoPaises) ? e.remotoPaises.filter((p): p is string => typeof p === "string") : [];
  const remotoPaises = remotoMundo ? [] : ordenarPaises(listaPaises);
  if (remotoPaises.some((p) => !(PAISES as readonly string[]).includes(p))) errores.remotoPaises = "codigo";
  else if (modalidad === "remoto" && !remotoMundo && !remotoPaises.length) errores.remotoPaises = "falta";
  if (modalidad && modalidad !== "remoto" && !ciudad && !pais) errores.ciudad = "falta";

  const salarioMin = entero(e.salarioMin);
  const salarioMax = entero(e.salarioMax);
  if (salarioMin === "mal") errores.salarioMin = "numero";
  if (salarioMax === "mal") errores.salarioMax = "numero";
  const hayMin = typeof salarioMin === "number";
  const hayMax = typeof salarioMax === "number";
  if (hayMin && hayMax && salarioMin > salarioMax) errores.salarioMax = "menor";
  const moneda = de(MONEDAS, e.moneda);
  if ((hayMin || hayMax) && !moneda) errores.moneda = "falta";

  const idiomasRequeridos: DatosOferta["idiomasRequeridos"] = [];
  if (Array.isArray(e.idiomasRequeridos)) {
    for (const r of e.idiomasRequeridos) {
      const fila = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      if (typeof fila.idioma !== "string" || !esIdioma(fila.idioma)) {
        errores.idiomasRequeridos = "idioma";
        continue;
      }
      const nivel = texto(fila.nivel) ? de(NIVELES_IDIOMA, fila.nivel) : null;
      if (texto(fila.nivel) && !nivel) errores.idiomasRequeridos = "nivel";
      if (!idiomasRequeridos.some((x) => x.idioma === fila.idioma)) {
        idiomasRequeridos.push({ idioma: fila.idioma, nivel });
      }
    }
  }
  if (!idiomasRequeridos.length && !errores.idiomasRequeridos) errores.idiomasRequeridos = "falta";
  else if (idiomasRequeridos.length > LIMITES.idiomas.max) errores.idiomasRequeridos = "demasiados";

  if (Object.keys(errores).length) return { errores };
  return {
    datos: {
      empresaId: empresaId!,
      titulo: titulo!,
      resumen,
      descripcion,
      responsabilidades,
      requisitos,
      idioma: idioma!,
      urlOriginal: urlOriginal!,
      area: area!,
      seniority: seniority!,
      modalidad: modalidad!,
      tecnologias,
      pais,
      ciudad,
      remotoMundo: modalidad === "remoto" && remotoMundo,
      remotoPaises: modalidad === "remoto" ? remotoPaises : [],
      salarioMin: hayMin ? salarioMin : null,
      salarioMax: hayMax ? salarioMax : null,
      moneda: hayMin || hayMax ? moneda : null,
      idiomasRequeridos,
      autorizada: e.autorizada === true,
    },
  };
}

/**
 * ¿Se puede hacer desde España o Latinoamérica? Es lo único que publica la bolsa por ahora.
 * Remoto: desde cualquier país o desde alguno de esos. Híbrido o presencial: en alguno de esos países.
 */
export function esDeEspanaOLatam(d: Pick<DatosOferta, "modalidad" | "remotoMundo" | "remotoPaises" | "pais">): boolean {
  if (d.modalidad === "remoto") return d.remotoMundo || d.remotoPaises.some((p) => PAISES_PUBLICO.includes(p));
  return !!d.pais && PAISES_PUBLICO.includes(d.pais);
}

/**
 * Comprueba una oferta que sube cualquiera desde la web: las mismas reglas que las del staff y, además,
 * - la empresa se escribe: { empresa: { nombre, web? } };
 * - tiene que poderse hacer desde España o Latinoamérica (código "fuera" en remotoPaises o pais);
 * - hay que marcar que es real y que tiene permiso para publicarla (declaracion: true).
 */
export function validarOfertaUsuario(
  entrada: unknown,
): { datos: DatosOfertaUsuario; errores?: undefined } | { datos?: undefined; errores: Record<string, string> } {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const errores: Record<string, string> = {};

  const empresa = (e.empresa && typeof e.empresa === "object" ? e.empresa : {}) as Record<string, unknown>;
  const nombre = texto(empresa.nombre);
  if (!nombre) errores.empresa = "falta";
  else if (nombre.length < 2) errores.empresa = "corto";
  else if (nombre.length > 80) errores.empresa = "largo";
  const web = texto(empresa.web);
  if (web && (!esUrlWeb(web) || web.length > 200)) errores.empresaWeb = "url";

  const base = validarOferta({ ...e, empresaId: "la-de-la-oferta", autorizada: false });
  Object.assign(errores, base.errores);
  if (base.datos && !esDeEspanaOLatam(base.datos)) {
    errores[base.datos.modalidad === "remoto" ? "remotoPaises" : "pais"] = "fuera";
  }
  if (e.declaracion !== true) errores.declaracion = "falta";
  // Las de un recruiter cuentan como autorizadas: basta su descripción (o el resumen con responsabilidades).
  if (base.datos && !tieneTextoPublicable({ ...base.datos, autorizada: true })) errores.descripcion = "falta";

  if (Object.keys(errores).length || !base.datos) return { errores };
  const { empresaId: _e, autorizada: _a, ...datos } = base.datos;
  return { datos: { ...datos, empresa: { nombre: nombre!, web } } };
}

/** "Backend Developer (Node.js)" + "marea-cloud" → "backend-developer-nodejs-marea-cloud". */
export function slugOferta(titulo: string, slugEmpresa: string): string {
  const base = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return [base, slugEmpresa].filter(Boolean).join("-");
}

/** "Volcán Data, S.L." → "volcan-data-s-l". */
export function slugEmpresa(nombre: string): string {
  return slugOferta(nombre, "") || "empresa";
}
