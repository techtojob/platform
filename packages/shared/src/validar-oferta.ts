import type { DatosOferta } from "./contratos";
import { MONEDAS, ZONAS_REMOTO } from "./contratos";
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
  idiomas: { max: 5 },
  salario: { max: 1_000_000 },
} as const;

const idsTecnologias = new Set<string>(TECNOLOGIAS.map((t) => t.id));

type Resultado = { datos: DatosOferta; errores?: undefined } | { datos?: undefined; errores: Record<string, string> };

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

  const remotoDesde = texto(e.remotoDesde) ? de(ZONAS_REMOTO, e.remotoDesde) : null;
  if (texto(e.remotoDesde) && !remotoDesde) errores.remotoDesde = "falta";
  if (modalidad === "remoto" && !remotoDesde) errores.remotoDesde = "falta";
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
      idioma: idioma!,
      urlOriginal: urlOriginal!,
      area: area!,
      seniority: seniority!,
      modalidad: modalidad!,
      tecnologias,
      pais,
      ciudad,
      remotoDesde: modalidad === "remoto" ? remotoDesde : null,
      salarioMin: hayMin ? salarioMin : null,
      salarioMax: hayMax ? salarioMax : null,
      moneda: hayMin || hayMax ? moneda : null,
      idiomasRequeridos,
    },
  };
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
