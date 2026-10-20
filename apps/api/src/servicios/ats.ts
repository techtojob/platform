import { adivinarPuesto, type Ats, type ZonaRemoto } from "@techtojob/shared";
import { htmlATexto, type Pedir } from "./importar";

/**
 * Lectores de las páginas de empleo públicas de Greenhouse, Lever y Ashby.
 *
 * Los tres tienen una API pública (sin claves) pensada justo para esto: que otras webs
 * muestren las ofertas de la empresa. Cada lector devuelve las ofertas en el mismo formato,
 * y luego `filtrar` se queda con las que nos interesan (técnicas y 100 % remotas).
 */

export type OfertaAts = {
  /** Id de la oferta en el ATS (no cambia aunque cambie el título). */
  idExterno: string;
  titulo: string;
  /** Enlace a la oferta en la página de empleo de la empresa. */
  url: string;
  /** Texto original. Solo para el staff. */
  descripcion: string;
  /** Ubicaciones tal cual las pone la empresa ("Remote - Spain", "EMEA"…). */
  ubicaciones: string[];
  /** Lo que dice el ATS: remoto, híbrido, presencial o no lo dice (null). */
  modalidad: "remoto" | "hibrido" | "presencial" | null;
  publicadaEn: Date | null;
};

export type EmpresaAts = { ats: Ats; atsId: string; atsRegion?: string | null };

/** Ni más de 10 MB ni más de 20 segundos por empresa. */
const MAXIMO_BYTES = 10_000_000;
const ESPERA_MS = 20_000;
const AGENTE = "TechToJob/1.0 (+https://techtojob.com/empleo)";

export class ErrorAts extends Error {}

type Json = Record<string, unknown>;
const esObjeto = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const cadena = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const fecha = (v: unknown): Date | null => {
  if (typeof v !== "number" && typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function pedirJson(url: string, pedir: Pedir): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await pedir(url, {
      headers: { accept: "application/json", "user-agent": AGENTE },
      redirect: "error",
      signal: AbortSignal.timeout(ESPERA_MS),
    });
  } catch {
    throw new ErrorAts("No se pudo conectar con la página de empleo.");
  }
  if (respuesta.status === 404) throw new ErrorAts("La página de empleo no existe (404). ¿Ha cambiado el enlace?");
  if (!respuesta.ok) throw new ErrorAts(`La página de empleo respondió con un error (${respuesta.status}).`);
  const texto = await respuesta.text();
  if (texto.length > MAXIMO_BYTES) throw new ErrorAts("La respuesta es demasiado grande.");
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorAts("La respuesta no es válida.");
  }
}

const seguro = encodeURIComponent;

function modalidadDe(texto: string | null | undefined): OfertaAts["modalidad"] {
  const t = (texto ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (t === "remote") return "remoto";
  if (t === "hybrid") return "hibrido";
  if (t === "onsite" || t === "inoffice" || t === "office") return "presencial";
  return null;
}

/** Greenhouse: https://boards-api.greenhouse.io/v1/boards/{id}/jobs?content=true */
async function leerGreenhouse(id: string, pedir: Pedir): Promise<OfertaAts[]> {
  const datos = await pedirJson(`https://boards-api.greenhouse.io/v1/boards/${seguro(id)}/jobs?content=true`, pedir);
  if (!esObjeto(datos) || !Array.isArray(datos.jobs)) throw new ErrorAts("Greenhouse devolvió algo inesperado.");
  return datos.jobs.filter(esObjeto).flatMap((j) => {
    const titulo = cadena(j.title);
    const url = cadena(j.absolute_url);
    if (!titulo || !url || (typeof j.id !== "number" && typeof j.id !== "string")) return [];
    const ubicacion = esObjeto(j.location) ? cadena(j.location.name) : "";
    const oficinas = Array.isArray(j.offices) ? j.offices.filter(esObjeto).map((o) => cadena(o.name)).filter(Boolean) : [];
    return [
      {
        idExterno: String(j.id),
        titulo,
        url,
        // Greenhouse manda el HTML escapado (&lt;p&gt;): htmlATexto lo deshace.
        descripcion: htmlATexto(cadena(j.content)),
        ubicaciones: [ubicacion, ...oficinas].filter(Boolean),
        // Greenhouse no tiene un campo de modalidad: se deduce de la ubicación (ver `esRemoto`).
        modalidad: null,
        publicadaEn: fecha(j.first_published ?? j.updated_at),
      },
    ];
  });
}

/** Lever: https://api.lever.co/v0/postings/{id}?mode=json (o api.eu.lever.co para las europeas). */
async function leerLever(id: string, region: string | null | undefined, pedir: Pedir): Promise<OfertaAts[]> {
  const host = region === "eu" ? "api.eu.lever.co" : "api.lever.co";
  const datos = await pedirJson(`https://${host}/v0/postings/${seguro(id)}?mode=json`, pedir);
  if (!Array.isArray(datos)) throw new ErrorAts("Lever devolvió algo inesperado.");
  return datos.filter(esObjeto).flatMap((j) => {
    const titulo = cadena(j.text);
    const url = cadena(j.hostedUrl);
    if (!titulo || !url || !cadena(j.id)) return [];
    const cat = esObjeto(j.categories) ? j.categories : {};
    const todas = Array.isArray(cat.allLocations) ? cat.allLocations.map(cadena) : [];
    const listas = Array.isArray(j.lists)
      ? j.lists.filter(esObjeto).map((l) => `${cadena(l.text)}\n${htmlATexto(cadena(l.content))}`)
      : [];
    const descripcion = [cadena(j.descriptionPlain), ...listas, cadena(j.additionalPlain)].filter(Boolean).join("\n\n");
    return [
      {
        idExterno: cadena(j.id),
        titulo,
        url,
        descripcion,
        ubicaciones: [...new Set([cadena(cat.location), ...todas])].filter(Boolean),
        modalidad: modalidadDe(cadena(j.workplaceType)),
        publicadaEn: fecha(j.createdAt),
      },
    ];
  });
}

/** Ashby: https://api.ashbyhq.com/posting-api/job-board/{id} */
async function leerAshby(id: string, pedir: Pedir): Promise<OfertaAts[]> {
  const datos = await pedirJson(`https://api.ashbyhq.com/posting-api/job-board/${seguro(id)}`, pedir);
  if (!esObjeto(datos) || !Array.isArray(datos.jobs)) throw new ErrorAts("Ashby devolvió algo inesperado.");
  return datos.jobs.filter(esObjeto).flatMap((j) => {
    const titulo = cadena(j.title);
    const url = cadena(j.jobUrl) || cadena(j.applyUrl);
    if (!titulo || !url || !cadena(j.id) || j.isListed === false) return [];
    const secundarias = Array.isArray(j.secondaryLocations)
      ? j.secondaryLocations.map((l) => (esObjeto(l) ? cadena(l.location) : cadena(l)))
      : [];
    const tipo = modalidadDe(cadena(j.workplaceType));
    return [
      {
        idExterno: cadena(j.id),
        titulo,
        url,
        descripcion: cadena(j.descriptionPlain) || htmlATexto(cadena(j.descriptionHtml)),
        ubicaciones: [cadena(j.location), ...secundarias].filter(Boolean),
        modalidad: tipo ?? (j.isRemote === true ? "remoto" : null),
        publicadaEn: fecha(j.publishedAt),
      },
    ];
  });
}

/** Todas las ofertas publicadas en la página de empleo de una empresa. Lanza ErrorAts si no se puede leer. */
export async function leerAts(empresa: EmpresaAts, pedir: Pedir = fetch): Promise<OfertaAts[]> {
  if (empresa.ats === "greenhouse") return leerGreenhouse(empresa.atsId, pedir);
  if (empresa.ats === "lever") return leerLever(empresa.atsId, empresa.atsRegion, pedir);
  return leerAshby(empresa.atsId, pedir);
}

/* ───────────────────────────── Filtros ───────────────────────────── */

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const REMOTO = /\b(remote|remoto|remota|anywhere|work from home|wfh|distributed|teletrabajo)\b/;
const HIBRIDO = /\b(hybrid|hibrido|hibrida)\b/;

/** ¿Es 100 % remota? Si el ATS lo dice, eso manda; si no (Greenhouse), se mira la ubicación. */
export function esRemoto(o: Pick<OfertaAts, "modalidad" | "ubicaciones" | "titulo">): boolean {
  if (o.modalidad) return o.modalidad === "remoto";
  const texto = sinAcentos([...o.ubicaciones, o.titulo].join(" | "));
  return REMOTO.test(texto) && !HIBRIDO.test(texto);
}

/** Puestos que no son técnicos aunque el título diga "engineer" o "data". */
const NO_TECNICO = new RegExp(
  "\\b(" +
    [
      "sales",
      "ventas",
      "account (executive|manager|director)",
      "business development",
      "bdr",
      "sdr",
      "recruit\\w*",
      "talent acquisition",
      "sourcer",
      "legal",
      "counsel",
      "paralegal",
      "finance",
      "financial",
      "accountant",
      "accounting",
      "payroll",
      "tax",
      "customer success",
      "executive assistant",
      "office manager",
    ].join("|") +
    ")\\b",
  "i",
);
/** Estos solo cuentan si el título no es claramente técnico ("Marketing Manager" no; "Growth Engineer" sí). */
const NO_TECNICO_SALVO_INGENIERIA = /\b(marketing|growth|content|copywriter|brand|communications|people|hr|human resources|partnerships?|community)\b/i;
const INGENIERIA = /\b(engineer|engineering|developer|desarrollador[a]?|ingenier[oa]|programador[a]?|scientist|architect)\b/i;

/** ¿Es un puesto técnico de los que salen en la bolsa? */
export function esTecnica(titulo: string): boolean {
  if (NO_TECNICO.test(titulo)) return false;
  if (NO_TECNICO_SALVO_INGENIERIA.test(titulo) && !INGENIERIA.test(titulo)) return false;
  return adivinarPuesto(titulo).area !== null;
}

/* Zonas: desde dónde se puede trabajar. */

const ESPANA = ["spain", "espana", "madrid", "barcelona", "valencia", "sevilla", "seville", "malaga", "bilbao", "zaragoza", "canarias", "canary islands"];
const EUROPA = ["europe", "europa", "emea", "eu", "european union", "union europea", "cet", "cest", "european time ?zones?"];
const LATAM = [
  "latam",
  "americas",
  "latin america",
  "latinoamerica",
  "america latina",
  "south america",
  "sudamerica",
  "central america",
  "mexico",
  "argentina",
  "colombia",
  "chile",
  "peru",
  "uruguay",
  "paraguay",
  "bolivia",
  "ecuador",
  "venezuela",
  "costa rica",
  "panama",
  "guatemala",
  "honduras",
  "el salvador",
  "nicaragua",
  "dominican republic",
  "republica dominicana",
  "puerto rico",
  "brazil",
  "brasil",
  "buenos aires",
  "bogota",
  "medellin",
  "ciudad de mexico",
  "mexico city",
  "santiago",
  "lima",
  "montevideo",
];
const MUNDO = ["anywhere", "worldwide", "global", "globally", "world", "international", "any location", "cualquier lugar", "todo el mundo"];

const lista = (palabras: string[]) => new RegExp(`\\b(${palabras.join("|")})\\b`);
const RE_ESPANA = lista(ESPANA);
const RE_EUROPA = lista(EUROPA);
const RE_LATAM = lista(LATAM);
const RE_MUNDO = lista(MUNDO);
/** Lo que queda tras quitar "Remote", separadores y palabras de relleno: si queda algo, es un sitio. */
const RELLENO = /\b(remote|remoto|remota|fully|full|time|100|only|first|work|from|home|wfh|distributed|teletrabajo|based|in|or|and|y|o|the|any|location|locations|timezone|time ?zones?|friendly|countries|country|region|team|en)\b/g;

/**
 * Desde dónde se puede trabajar, según las ubicaciones de la oferta.
 *
 * - "mundo": anywhere / worldwide;
 * - "eu": Europa / EMEA (incluye España);
 * - "es": solo España;
 * - "latam": Latinoamérica;
 * - null: no se sabe (solo pone "Remote"): la oferta entra y el staff lo rellena;
 * - "fuera": solo otros sitios (EE. UU., Reino Unido, Alemania…): la oferta no entra.
 */
export function zonaRemoto(ubicaciones: string[]): ZonaRemoto | null | "fuera" {
  const zonas = new Set<ZonaRemoto>();
  let otroSitio = false;
  for (const ubicacion of ubicaciones) {
    // "Remote - Spain, Portugal" se mira por trozos: "spain", "portugal".
    for (const trozo of sinAcentos(ubicacion).split(/[,;/|()\-–—·]+|\bor\b|\bo\b/)) {
      const t = trozo.trim();
      if (!t) continue;
      let encontrado = false;
      if (RE_MUNDO.test(t)) (zonas.add("mundo"), (encontrado = true));
      if (RE_EUROPA.test(t)) (zonas.add("eu"), (encontrado = true));
      if (RE_ESPANA.test(t)) (zonas.add("es"), (encontrado = true));
      if (RE_LATAM.test(t)) (zonas.add("latam"), (encontrado = true));
      if (!encontrado && t.replace(RELLENO, "").replace(/[^a-z]/g, "")) otroSitio = true;
    }
  }
  if (zonas.has("mundo")) return "mundo";
  const europa = zonas.has("eu") || zonas.has("es");
  // España/Europa y Latinoamérica a la vez: lo decide el staff.
  if (europa && zonas.has("latam")) return null;
  if (zonas.has("eu")) return "eu";
  if (zonas.has("es")) return "es";
  if (zonas.has("latam")) return "latam";
  return otroSitio ? "fuera" : null;
}

export type OfertaFiltrada = OfertaAts & { remotoDesde: ZonaRemoto | null };

/** Se queda con las técnicas y 100 % remotas desde España, Europa, Latinoamérica o cualquier sitio. */
export function filtrar(ofertas: OfertaAts[]): OfertaFiltrada[] {
  return ofertas.flatMap((o) => {
    if (!esTecnica(o.titulo) || !esRemoto(o)) return [];
    const zona = zonaRemoto(o.ubicaciones);
    return zona === "fuera" ? [] : [{ ...o, remotoDesde: zona }];
  });
}
