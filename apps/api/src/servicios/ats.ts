import { adivinarPuesto, type Ats, type ZonaRemoto } from "@techtojob/shared";
import { htmlATexto, type Pedir } from "./importar";

/**
 * Lectores de las páginas de empleo públicas de Greenhouse, Lever, Ashby, Teamtailor y Personio.
 *
 * Todos tienen una API o un feed público (sin claves) pensado justo para esto: que otras webs
 * muestren las ofertas de la empresa (Teamtailor y Personio se usan mucho en España).
 * Cada lector devuelve las ofertas en el mismo formato, y luego `filtrar` se queda con las
 * que nos interesan (técnicas y 100 % remotas).
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

export class ErrorAts extends Error {
  /** Código HTTP, si la página respondió (404: esa página de empleo no existe). */
  constructor(mensaje: string, public readonly estado?: number) {
    super(mensaje);
  }
}

type Json = Record<string, unknown>;
const esObjeto = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const cadena = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const fecha = (v: unknown): Date | null => {
  if (typeof v !== "number" && typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function pedirTexto(url: string, pedir: Pedir, tipo: string): Promise<string> {
  let respuesta: Response;
  try {
    respuesta = await pedir(url, {
      headers: { accept: tipo, "user-agent": AGENTE },
      // Sin seguir redirecciones: cuando una página de empleo no existe, algunos ATS mandan a su web.
      redirect: "manual",
      signal: AbortSignal.timeout(ESPERA_MS),
    });
  } catch {
    throw new ErrorAts("No se pudo conectar con la página de empleo.");
  }
  if (respuesta.status === 404 || (respuesta.status >= 300 && respuesta.status < 400)) {
    throw new ErrorAts("La página de empleo no existe (404). ¿Ha cambiado el enlace?", 404);
  }
  if (!respuesta.ok) throw new ErrorAts(`La página de empleo respondió con un error (${respuesta.status}).`, respuesta.status);
  const texto = await respuesta.text();
  if (texto.length > MAXIMO_BYTES) throw new ErrorAts("La respuesta es demasiado grande.");
  return texto;
}

async function pedirJson(url: string, pedir: Pedir): Promise<unknown> {
  const texto = await pedirTexto(url, pedir, "application/json");
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorAts("La respuesta no es válida.");
  }
}

/* XML sencillo (RSS de Teamtailor, feed de Personio): sin librerías, solo lo que hace falta. */

const sinCdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
/** Bloques <etiqueta>…</etiqueta> (con o sin prefijo, "tt:location"). */
function bloques(xml: string, etiqueta: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${etiqueta}>`, "gi");
  return [...xml.matchAll(re)].map((m) => m[1]!);
}
/** El texto de la primera <etiqueta> (sin CDATA, entidades decodificadas y sin HTML). */
function campo(xml: string, etiqueta: string): string {
  const b = bloques(xml, etiqueta)[0];
  return b === undefined ? "" : htmlATexto(sinCdata(b));
}
/** Para leer un XML hay que saber que lo es: si no, la "página" es otra cosa. */
function comprobarXml(texto: string, raiz: string, nombre: string) {
  if (!new RegExp(`<(?:[\\w-]+:)?${raiz}[\\s>]`, "i").test(texto)) throw new ErrorAts(`${nombre} devolvió algo inesperado.`);
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

/**
 * Teamtailor: el RSS público de su página de empleo, https://{id}.teamtailor.com/jobs.rss
 * Cada <item> trae título, descripción (HTML), enlace, fecha, <remoteStatus> (fully, hybrid, temporary, none)
 * y las ubicaciones en <tt:locations>.
 */
async function leerTeamtailor(id: string, pedir: Pedir): Promise<OfertaAts[]> {
  const xml = await pedirTexto(`https://${id}.teamtailor.com/jobs.rss?per_page=200`, pedir, "application/rss+xml, application/xml");
  comprobarXml(xml, "rss", "Teamtailor");
  return bloques(xml, "item").flatMap((item) => {
    const titulo = campo(item, "title");
    const url = campo(item, "link");
    const idExterno = campo(item, "guid") || url;
    if (!titulo || !/^https:\/\//.test(url) || !idExterno) return [];
    const remoto = campo(item, "remoteStatus").toLowerCase();
    const ubicaciones = bloques(item, "location")
      .map((l) => [campo(l, "name"), campo(l, "city"), campo(l, "country")].filter(Boolean).join(", "))
      .filter(Boolean);
    return [
      {
        idExterno,
        titulo,
        url,
        descripcion: htmlATexto(sinCdata(bloques(item, "description")[0] ?? "")),
        ubicaciones: [...new Set(ubicaciones)],
        modalidad: remoto === "fully" ? "remoto" : remoto === "hybrid" || remoto === "temporary" ? "hibrido" : remoto === "none" ? "presencial" : null,
        publicadaEn: fecha(campo(item, "pubDate")),
      } satisfies OfertaAts,
    ];
  });
}

/**
 * Personio: el feed XML público, https://{id}.jobs.personio.de/xml (o .com).
 * Cada <position> trae id, nombre, <office> y <additionalOffices>, y la descripción por trozos
 * en <jobDescriptions>. No dice si es remota: se deduce de las oficinas ("Remote", "Remoto"…).
 */
async function leerPersonio(id: string, region: string | null | undefined, pedir: Pedir): Promise<OfertaAts[]> {
  const dominio = region === "com" ? "com" : "de";
  const xml = await pedirTexto(`https://${id}.jobs.personio.${dominio}/xml`, pedir, "application/xml");
  comprobarXml(xml, "workzag-jobs", "Personio");
  return bloques(xml, "position").flatMap((p) => {
    const idExterno = campo(p, "id");
    const titulo = campo(p, "name");
    if (!idExterno || !titulo) return [];
    const extra = bloques(p, "additionalOffices")[0] ?? "";
    // La primera <office> es la principal; las de <additionalOffices>, las demás.
    const principal = campo(p.replace(/<additionalOffices>[\s\S]*?<\/additionalOffices>/i, ""), "office");
    const ubicaciones = [principal, ...bloques(extra, "office").map((o) => htmlATexto(sinCdata(o)))].filter(Boolean);
    const descripcion = bloques(p, "jobDescription")
      .map((d) => [campo(d, "name"), htmlATexto(sinCdata(bloques(d, "value")[0] ?? ""))].filter(Boolean).join("\n"))
      .join("\n\n");
    return [
      {
        idExterno,
        titulo,
        url: `https://${id}.jobs.personio.${dominio}/job/${encodeURIComponent(idExterno)}`,
        descripcion,
        ubicaciones,
        modalidad: null,
        publicadaEn: fecha(campo(p, "createdAt")),
      } satisfies OfertaAts,
    ];
  });
}

/** Todas las ofertas publicadas en la página de empleo de una empresa. Lanza ErrorAts si no se puede leer. */
export async function leerAts(empresa: EmpresaAts, pedir: Pedir = fetch): Promise<OfertaAts[]> {
  if (empresa.ats === "greenhouse") return leerGreenhouse(empresa.atsId, pedir);
  if (empresa.ats === "lever") return leerLever(empresa.atsId, empresa.atsRegion, pedir);
  if (empresa.ats === "teamtailor") return leerTeamtailor(empresa.atsId, pedir);
  if (empresa.ats === "personio") return leerPersonio(empresa.atsId, empresa.atsRegion, pedir);
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
  "latam", "latin america", "latinoamerica", "america latina", "south america", "sudamerica", "central america",
  "mexico", "argentina", "colombia", "chile", "peru", "uruguay", "paraguay", "bolivia", "ecuador", "venezuela",
  "costa rica", "panama", "guatemala", "honduras", "el salvador", "nicaragua", "dominican republic",
  "republica dominicana", "puerto rico", "brazil", "brasil", "buenos aires", "bogota", "medellin",
  "ciudad de mexico", "mexico city", "santiago", "lima", "montevideo",
];
const EEUU = [
  "us", "u\\.s\\.?", "usa", "united states", "estados unidos", "eeuu", "ee\\. ?uu\\.?",
  "new york", "san francisco", "seattle", "austin", "boston", "chicago", "los angeles", "denver", "miami", "atlanta",
  "pst", "est", "pacific time", "eastern time", "central time", "mountain time",
];
const CANADA = ["canada", "toronto", "vancouver", "montreal", "ottawa", "calgary"];
const NORTEAMERICA = ["north america", "norteamerica", "america del norte", "us ?& ?canada", "us and canada"];
/** "Americas": de Canadá a Argentina. */
const AMERICAS = ["americas", "the americas"];
const MUNDO = ["anywhere", "worldwide", "global", "globally", "world", "international", "any location", "cualquier lugar", "todo el mundo"];

const lista = (palabras: string[]) => new RegExp(`(?<![a-z])(${palabras.join("|")})(?![a-z])`);
const RE = {
  es: lista(ESPANA),
  eu: lista(EUROPA),
  latam: lista(LATAM),
  eeuu: lista(EEUU),
  canada: lista(CANADA),
  norteamerica: lista(NORTEAMERICA),
  americas: lista(AMERICAS),
  mundo: lista(MUNDO),
};
/** Lo que queda tras quitar "Remote", separadores y palabras de relleno: si queda algo, es un sitio. */
const RELLENO = /\b(remote|remoto|remota|fully|full|time|100|only|first|work|from|home|wfh|distributed|teletrabajo|based|in|or|and|y|o|the|any|location|locations|timezone|time ?zones?|friendly|countries|country|region|team|en)\b/g;

/**
 * Desde dónde se puede trabajar, según las ubicaciones de la oferta.
 *
 * - "mundo": anywhere / worldwide;
 * - "eu" (Europa / EMEA, incluye España), "es" (solo España);
 * - "latam": Latinoamérica;
 * - "eeuu", "canada" o "norteamerica" (los dos);
 * - null: no se sabe ("Remote" sin más) o mezcla zonas (Europa y Latinoamérica…): la oferta entra y el staff lo decide;
 * - "fuera": solo otros sitios (Reino Unido, Alemania, India…): la oferta no entra.
 */
export function zonaRemoto(ubicaciones: string[]): ZonaRemoto | null | "fuera" {
  const vistas = new Set<keyof typeof RE>();
  let otroSitio = false;
  for (const ubicacion of ubicaciones) {
    // "Remote - Spain, Portugal" se mira por trozos: "spain", "portugal".
    for (const trozo of sinAcentos(ubicacion).split(/[,;/|()\-–—·]+|\bor\b|\bo\b/)) {
      const t = trozo.trim();
      if (!t) continue;
      let encontrado = false;
      for (const [zona, re] of Object.entries(RE) as Array<[keyof typeof RE, RegExp]>) {
        if (re.test(t)) {
          vistas.add(zona);
          encontrado = true;
        }
      }
      if (!encontrado && t.replace(RELLENO, "").replace(/[^a-z]/g, "")) otroSitio = true;
    }
  }
  if (vistas.has("mundo")) return "mundo";
  if (vistas.has("americas")) return null;
  // Grandes zonas: Europa, Latinoamérica y Norteamérica. Si sale más de una, lo decide el staff.
  const europa = vistas.has("eu") ? "eu" : vistas.has("es") ? "es" : null;
  const latam = vistas.has("latam") ? "latam" : null;
  const na =
    vistas.has("norteamerica") || (vistas.has("eeuu") && vistas.has("canada"))
      ? "norteamerica"
      : vistas.has("eeuu")
        ? "eeuu"
        : vistas.has("canada")
          ? "canada"
          : null;
  const zonas = [europa, latam, na].filter((z): z is ZonaRemoto => z !== null);
  if (zonas.length > 1) return null;
  if (zonas.length === 1) return zonas[0]!;
  return otroSitio ? "fuera" : null;
}

export type OfertaFiltrada = OfertaAts & { remotoDesde: ZonaRemoto | null };

/** Se queda con las técnicas y 100 % remotas desde España, Europa, Latinoamérica, EE. UU., Canadá o cualquier sitio. */
export function filtrar(ofertas: OfertaAts[]): OfertaFiltrada[] {
  return ofertas.flatMap((o) => {
    if (!esTecnica(o.titulo) || !esRemoto(o)) return [];
    const zona = zonaRemoto(o.ubicaciones);
    return zona === "fuera" ? [] : [{ ...o, remotoDesde: zona }];
  });
}
