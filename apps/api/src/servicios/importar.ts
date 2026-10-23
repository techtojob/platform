import {
  adivinarPuesto,
  codigoPais,
  detectarIdiomaTexto,
  detectarIdiomasPedidos,
  detectarTecnologias,
  enlaceComparable,
  MONEDAS,
  ordenarPaises,
  PAISES,
  nombreEmpresaComparable,
  type Moneda,
  type OfertaImportada,
  type OfertaRepetida,
} from "@techtojob/shared";
import { eq, ilike } from "drizzle-orm";
import type { Db } from "../db/cliente";
import { empresas, ofertas } from "../db/esquema";

/**
 * Importar una oferta desde su enlace: abre la página y saca lo que pueda.
 *
 * Muchas webs de empleo llevan dentro los datos de la oferta preparados para Google
 * (un JobPosting de schema.org, en un <script type="application/ld+json">). Si están,
 * se usan. Si no, solo el título y la descripción de la página. Con todo el texto,
 * se adivinan las tecnologías, los idiomas que pide, el área y el nivel.
 */

export type Pedir = (url: string, init: RequestInit) => Promise<Response>;

/** Como mucho, 2 MB de página y 8 segundos. */
const MAXIMO_BYTES = 2_000_000;
const ESPERA_MS = 8_000;

/** ¿Ya hay una oferta con este enlace (sin contar el rastreo tipo ?utm_source)? */
export async function buscarRepetida(db: Db, url: string, sinContar?: string): Promise<OfertaRepetida | null> {
  const buscado = enlaceComparable(url);
  if (!buscado) return null;
  const host = buscado.split("/")[0]!;
  const candidatas = await db
    .select({ id: ofertas.id, titulo: ofertas.titulo, estado: ofertas.estado, url: ofertas.urlOriginal, empresa: empresas.nombre })
    .from(ofertas)
    .innerJoin(empresas, eq(empresas.id, ofertas.empresaId))
    .where(ilike(ofertas.urlOriginal, `%${host.replace(/[%_]/g, "")}%`));
  const igual = candidatas.find((c) => c.id !== sinContar && enlaceComparable(c.url) === buscado);
  return igual ? { id: igual.id, titulo: igual.titulo, estado: igual.estado, empresa: igual.empresa } : null;
}

/** Solo direcciones públicas: nada de localhost ni redes internas. */
function esDireccionPublica(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (url.username || url.password) return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  // Direcciones IP privadas, de bucle local, de enlace local o de "esta red" (también el 100.64/10 de los operadores).
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(host)) return false;
  // IP sin puntos (http://2130706433 = 127.0.0.1) o IPv6: no son webs de empleo.
  if (/^\d+$/.test(host) || host.startsWith("[")) return false;
  return true;
}

/** Como mucho, 5 redirecciones (las webs de empleo a veces pasan por varias). */
const MAXIMO_SALTOS = 5;

/**
 * Lee la página. Las redirecciones se siguen a mano para comprobar cada dirección:
 * si no, una web pública podría mandar a una interna.
 */
/**
 * El texto de la respuesta, como mucho `maximo` bytes: deja de leer al llegar (no carga entera
 * una página enorme en memoria; un Worker tiene 128 MB).
 */
export async function leerHasta(res: Response, maximo: number): Promise<string> {
  if (!res.body) return "";
  const lector = res.body.getReader();
  const decodificador = new TextDecoder();
  let texto = "";
  let leidos = 0;
  try {
    while (leidos < maximo) {
      const { done, value } = await lector.read();
      if (done) break;
      const trozo = value.byteLength > maximo - leidos ? value.subarray(0, maximo - leidos) : value;
      leidos += trozo.byteLength;
      texto += decodificador.decode(trozo, { stream: true });
    }
  } finally {
    // Lo que queda sin leer, se descarta.
    await lector.cancel().catch(() => {});
  }
  return texto + decodificador.decode();
}

export async function leerPagina(url: URL, pedir: Pedir): Promise<string | null> {
  let actual = url;
  try {
    for (let salto = 0; salto <= MAXIMO_SALTOS; salto++) {
      if (!esDireccionPublica(actual)) return null;
      const res = await pedir(actual.toString(), {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; TechToJobBot/1.0; +https://techtojob.com)",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "es,en;q=0.8",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(ESPERA_MS),
      });
      if (res.status >= 300 && res.status < 400) {
        const destino = res.headers.get("location");
        if (!destino) return null;
        actual = new URL(destino, actual);
        continue;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "text/html").includes("html")) return null;
      return await leerHasta(res, MAXIMO_BYTES);
    }
    return null;
  } catch {
    return null;
  }
}

const ENTIDADES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ",
  ccedil: "ç", agrave: "à", egrave: "è", ograve: "ò", iexcl: "¡", iquest: "¿", euro: "€",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…", mdash: "—", ndash: "–", middot: "·", bull: "•",
};

function decodificar(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, e: string) => {
    if (e[0] === "#") {
      const n = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : todo;
    }
    return ENTIDADES[e] ?? ENTIDADES[e.toLowerCase()] ?? todo;
  });
}

/** HTML de una descripción → texto con párrafos separados por una línea en blanco y listas con "•". */
export function htmlATexto(html: string): string {
  const conSaltos = decodificar(html) // a veces el HTML viene escapado dentro del JSON
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|section)\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  return decodificar(conSaltos)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Json = Record<string, unknown>;
const esObjeto = (v: unknown): v is Json => !!v && typeof v === "object" && !Array.isArray(v);
const texto = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? decodificar(v.trim()) : undefined);
const primero = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
const numero = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
};

/** Busca un JobPosting dentro de los <script type="application/ld+json"> de la página. */
export function buscarJobPosting(html: string): Json | null {
  const bloques = html.matchAll(/<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, contenido] of bloques) {
    let datos: unknown;
    try {
      datos = JSON.parse(contenido!.trim());
    } catch {
      continue;
    }
    const pendientes: unknown[] = [datos];
    while (pendientes.length) {
      const actual = pendientes.shift();
      if (Array.isArray(actual)) pendientes.push(...actual);
      else if (esObjeto(actual)) {
        const tipo = actual["@type"];
        if (tipo === "JobPosting" || (Array.isArray(tipo) && tipo.includes("JobPosting"))) return actual;
        if (actual["@graph"]) pendientes.push(actual["@graph"]);
      }
    }
  }
  return null;
}

export function meta(html: string, nombre: string): string | undefined {
  const r = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${nombre}["'][^>]*>`, "i").exec(html);
  const contenido = r && /content\s*=\s*["']([^"']*)["']/i.exec(r[0]);
  return texto(contenido?.[1]);
}

/** Lo que dice el JobPosting, pasado a los campos del formulario. */
function desdeJobPosting(job: Json): Partial<OfertaImportada> & { empresaNombre?: string; empresaWeb?: string } {
  const r: Partial<OfertaImportada> & { empresaNombre?: string; empresaWeb?: string } = {};
  r.titulo = texto(job.title);
  const empresa = primero(job.hiringOrganization);
  if (esObjeto(empresa)) {
    r.empresaNombre = texto(empresa.name);
    r.empresaWeb = texto(primero(empresa.sameAs)) ?? texto(empresa.url);
  } else r.empresaNombre = texto(empresa);
  const descripcion = texto(job.description);
  if (descripcion) r.descripcion = htmlATexto(descripcion);

  const remoto = [job.jobLocationType].flat().some((t) => typeof t === "string" && /telecommute/i.test(t));
  const lugar = primero(job.jobLocation);
  const direccion = esObjeto(lugar) ? (esObjeto(lugar.address) ? lugar.address : null) : null;
  if (direccion) {
    r.ciudad = texto(direccion.addressLocality);
    const pais = esObjeto(direccion.addressCountry) ? direccion.addressCountry.name : direccion.addressCountry;
    r.pais = codigoPais(texto(pais)) ?? undefined;
  }
  if (remoto) {
    r.modalidad = "remoto";
    // Desde dónde se puede trabajar: los países que diga (applicantLocationRequirements).
    const requisitos = [job.applicantLocationRequirements].flat().filter(Boolean);
    const paises = requisitos
      .map((q) => codigoPais(texto(esObjeto(q) ? q.name : q)))
      .filter((p): p is string => !!p && (PAISES as readonly string[]).includes(p));
    if (paises.length) r.remoto = { mundo: false, paises: ordenarPaises(paises) };
    else if (!requisitos.length && r.pais) r.remoto = { mundo: false, paises: [r.pais] };
  } else if (direccion) {
    r.modalidad = /h[ií]brid|hybrid/i.test(`${r.titulo} ${r.descripcion ?? ""}`) ? "hibrido" : "presencial";
  }

  const salario = esObjeto(job.baseSalary) ? job.baseSalary : null;
  if (salario) {
    const valor = esObjeto(salario.value) ? salario.value : { value: salario.value };
    const unidad = String(valor.unitText ?? salario.unitText ?? "YEAR").toUpperCase();
    const porAno = unidad === "MONTH" ? 12 : unidad === "YEAR" ? 1 : null;
    const moneda = texto(salario.currency)?.toUpperCase();
    if (porAno && moneda && (MONEDAS as readonly string[]).includes(moneda)) {
      const min = numero(valor.minValue) ?? numero(valor.value);
      const max = numero(valor.maxValue);
      if (min) r.salarioMin = min * porAno;
      if (max) r.salarioMax = max * porAno;
      if (min || max) r.moneda = moneda as Moneda;
    }
  }
  return r;
}

/** Abre el enlace y devuelve lo que se ha podido sacar. Nunca falla: como mucho, fuente "nada". */
export async function importarOferta(db: Db, url: string, pedir: Pedir = fetch): Promise<OfertaImportada> {
  const repetida = await buscarRepetida(db, url);
  const vacia: OfertaImportada = { fuente: "nada", repetida, tecnologias: [], idiomasRequeridos: [] };
  let direccion: URL;
  try {
    direccion = new URL(url.trim());
  } catch {
    return vacia;
  }
  const html = await leerPagina(direccion, pedir);
  if (!html) return vacia;

  const job = buscarJobPosting(html);
  let datos: ReturnType<typeof desdeJobPosting>;
  let fuente: OfertaImportada["fuente"];
  if (job) {
    datos = desdeJobPosting(job);
    fuente = "datos";
  } else {
    const titulo = meta(html, "og:title") ?? texto(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]);
    const descripcion = meta(html, "og:description") ?? meta(html, "description");
    if (!titulo && !descripcion) return vacia;
    datos = { titulo, descripcion, empresaNombre: meta(html, "og:site_name") };
    fuente = "pagina";
  }

  // Con todo el texto, las pistas: tecnologías, idiomas, área y nivel.
  const todo = `${datos.titulo ?? ""}\n${datos.descripcion ?? ""}`;
  const puesto = adivinarPuesto(datos.titulo ?? "");
  const idioma = detectarIdiomaTexto(datos.descripcion ?? "") ?? undefined;
  const pedidos = detectarIdiomasPedidos(todo);
  if (idioma && !pedidos.some((p) => p.idioma === idioma)) pedidos.unshift({ idioma, nivel: null });

  // ¿La empresa ya está en la bolsa? (sin contar "S.L.", mayúsculas ni acentos)
  let empresa: OfertaImportada["empresa"];
  if (datos.empresaNombre) {
    const comparable = nombreEmpresaComparable(datos.empresaNombre);
    const todas = await db.select({ id: empresas.id, nombre: empresas.nombre, web: empresas.web }).from(empresas);
    const existente = todas.find((e) => nombreEmpresaComparable(e.nombre) === comparable);
    empresa = existente
      ? { id: existente.id, nombre: existente.nombre, web: existente.web }
      : { id: null, nombre: datos.empresaNombre, web: datos.empresaWeb ?? null };
  }

  // El resumen: el primer párrafo, si es corto.
  const primerParrafo = datos.descripcion?.split(/\n\s*\n/)[0]?.trim();
  const resumen = primerParrafo && primerParrafo.length <= 280 && !primerParrafo.startsWith("•") ? primerParrafo : undefined;

  const { empresaNombre: _n, empresaWeb: _w, ...resto } = datos;
  return {
    ...resto,
    fuente,
    repetida,
    empresa,
    resumen,
    idioma,
    area: puesto.area ?? undefined,
    seniority: puesto.seniority ?? undefined,
    tecnologias: detectarTecnologias(todo),
    idiomasRequeridos: pedidos,
    ...(resto.titulo ? { titulo: resto.titulo.slice(0, 120) } : {}),
  };
}
