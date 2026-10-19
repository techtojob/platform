import type { Idioma, NivelIdioma } from "./idiomas";
import type { Area, Seniority } from "./listas";
import { TECNOLOGIAS } from "./tecnologias";

/**
 * Pistas que se sacan del texto de una oferta para rellenar el formulario del staff.
 * Son sugerencias: el staff siempre las revisa. Se usan en el API (al importar un enlace)
 * y en la web (al pegar el texto de una oferta).
 */

const quitarAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Alias que son palabras normales en otros contextos ("go", "next"…).
 * - null: no se buscan en el texto.
 * - "mayuscula": solo cuentan escritos como el nombre ("Go", "Rust"), no "go" o "rust".
 */
const ALIAS_DUDOSOS: Record<string, null | "mayuscula"> = {
  go: "mayuscula",
  ts: null,
  tf: null,
  py: null,
  next: null,
  torch: null,
  rust: "mayuscula",
  swift: "mayuscula",
  spark: "mayuscula",
  spring: "mayuscula",
  tailwind: "mayuscula",
  react: "mayuscula",
  pandas: "mayuscula",
};

/** Una palabra suelta: ni pegada a letras, ni a "." / "#" / "+" (para no ver "sql" dentro de "PostgreSQL"). */
const palabra = (termino: string, flags: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}.#+_-])${escapar(termino)}(?![\\p{L}\\p{N}#+_]|\\.[\\p{L}])`, flags);

const BUSQUEDAS = TECNOLOGIAS.map((t) => {
  const terminos = [...new Set([t.nombre, t.id, ...t.alias].map((x) => x.toLowerCase()))];
  const patrones: RegExp[] = [];
  for (const termino of terminos) {
    const dudoso = ALIAS_DUDOSOS[termino];
    if (dudoso === null) continue;
    if (dudoso === "mayuscula") {
      patrones.push(palabra(termino.charAt(0).toUpperCase() + termino.slice(1), "u"));
      if (t.nombre.toLowerCase() === termino) patrones.push(palabra(t.nombre, "u"));
    } else {
      patrones.push(palabra(termino, "iu"));
    }
  }
  return { id: t.id, patrones };
});

/** Tecnologías de la lista que aparecen en el texto, en el orden de la lista. */
export function detectarTecnologias(texto: string): string[] {
  if (!texto) return [];
  return BUSQUEDAS.filter(({ patrones }) => patrones.some((p) => p.test(texto))).map(({ id }) => id);
}

/** Palabras muy frecuentes de cada idioma: la que más aparezca dice en qué idioma está escrito. */
const PALABRAS_FRECUENTES: Partial<Record<Idioma, string[]>> = {
  es: ["de", "la", "que", "el", "en", "y", "los", "para", "con", "una", "del", "las", "por", "experiencia", "buscamos"],
  en: ["the", "and", "to", "of", "you", "with", "for", "our", "we", "will", "are", "experience", "your"],
  pt: ["de", "que", "os", "uma", "para", "com", "não", "experiência", "você", "nossa", "das", "dos"],
  fr: ["le", "les", "des", "et", "pour", "une", "vous", "nous", "avec", "est", "expérience", "du"],
  de: ["und", "die", "der", "mit", "für", "sie", "wir", "ist", "das", "erfahrung", "ein", "eine"],
  it: ["di", "il", "che", "per", "con", "una", "gli", "esperienza", "della", "sono", "nel"],
};

/** En qué idioma está escrito un texto, o null si es demasiado corto para saberlo. */
export function detectarIdiomaTexto(texto: string): Idioma | null {
  const palabras = texto.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (palabras.length < 8) return null;
  let mejor: Idioma | null = null;
  let maximo = 0;
  for (const [idioma, frecuentes] of Object.entries(PALABRAS_FRECUENTES) as Array<[Idioma, string[]]>) {
    const lista = new Set(frecuentes);
    const cuenta = palabras.filter((p) => lista.has(p)).length;
    if (cuenta > maximo) [mejor, maximo] = [idioma, cuenta];
  }
  return maximo >= 3 ? mejor : null;
}

/** Cómo se nombra cada idioma en las ofertas (en español, inglés y en el propio idioma). */
const NOMBRES_IDIOMAS: Partial<Record<Idioma, string[]>> = {
  es: ["español", "castellano", "spanish", "espanol"],
  en: ["inglés", "ingles", "english"],
  de: ["alemán", "aleman", "german", "deutsch"],
  fr: ["francés", "frances", "french", "français"],
  pt: ["portugués", "portugues", "portuguese", "português"],
  it: ["italiano", "italian"],
  ca: ["catalán", "catalan", "català"],
  nl: ["neerlandés", "holandés", "dutch", "nederlands"],
};

const NIVELES_TEXTO: Array<[RegExp, NivelIdioma]> = [
  [/\b(nativo|nativa|native|lengua materna|mother tongue)\b/i, "nativo"],
  [/\bc2\b/i, "c2"],
  [/\bc1\b|\b(fluido|fluida|fluent|fluency|avanzado|advanced|proficient)\b/i, "c1"],
  [/\bb2\b|\b(upper[- ]intermediate)\b/i, "b2"],
  [/\bb1\b|\b(intermedio|intermediate)\b/i, "b1"],
  [/\ba2\b/i, "a2"],
  [/\ba1\b|\b(básico|basico|basic)\b/i, "a1"],
];

/**
 * Idiomas que pide la oferta según el texto ("inglés B2", "fluent German"…), con su nivel si lo dice.
 * Mira el nivel cerca del nombre del idioma (unas palabras antes o después).
 */
export function detectarIdiomasPedidos(texto: string): Array<{ idioma: Idioma; nivel: NivelIdioma | null }> {
  const resultado: Array<{ idioma: Idioma; nivel: NivelIdioma | null }> = [];
  for (const [idioma, nombres] of Object.entries(NOMBRES_IDIOMAS) as Array<[Idioma, string[]]>) {
    for (const nombre of nombres) {
      const encontrado = palabra(nombre, "iu").exec(texto);
      if (!encontrado) continue;
      // El nivel suele ir justo después ("inglés B2") o justo antes ("fluent English"),
      // sin pasar de una coma o de un "y" (si no, "inglés B2 y español nativo" mezclaría niveles).
      const corte = /[,;.\n(]|\s(?:y|e|and|or|o)\s/i;
      const despues = texto.slice(encontrado.index + encontrado[0].length, encontrado.index + encontrado[0].length + 30).split(corte)[0]!;
      const trozos = texto.slice(Math.max(0, encontrado.index - 25), encontrado.index).split(corte);
      const antes = trozos[trozos.length - 1]!;
      const nivelEn = (trozo: string) => NIVELES_TEXTO.find(([patron]) => patron.test(trozo))?.[1] ?? null;
      const nivel = nivelEn(despues) ?? nivelEn(antes);
      resultado.push({ idioma, nivel });
      break;
    }
  }
  return resultado;
}

const REGLAS_AREA: Array<[RegExp, Area]> = [
  [/\b(soc|ciberseguridad|cybersecurity|security|seguridad|pentest\w*|red team|blue team)\b/i, "ciberseguridad"],
  [/\b(data|datos|machine learning|ml|ia|ai|analyst|analista|bi|scientist|cient[ií]fic[oa])\b/i, "datos-ia"],
  [/\b(devops|sre|cloud|infraestructura|infrastructure|platform|plataforma|sysadmin|sistemas|systems)\b/i, "infra-devops"],
  [/\b(soporte|support|helpdesk|help desk|service desk|t[eé]cnic[oa] it|it technician)\b/i, "soporte-it"],
  [/\b(dise[ñn]ador[a]?|designer|ux|ui|product manager|product owner|producto)\b/i, "producto-diseno"],
  [/\b(developer|desarrollador[a]?|programador[a]?|engineer|ingenier[oa]|frontend|backend|full[- ]?stack|software|qa|tester|mobile)\b/i, "desarrollo"],
];

const REGLAS_NIVEL: Array<[RegExp, Seniority]> = [
  [/\b(becari[oa]|intern(ship)?|pr[aá]cticas|trainee|graduate|sin experiencia)\b/i, "sin-experiencia"],
  [/\b(lead|l[ií]der|principal|head|staff engineer|manager|jef[ea])\b/i, "lead"],
  [/\b(senior|sr\.?|s[eé]nior)\b/i, "senior"],
  [/\b(junior|jr\.?|j[uú]nior)\b/i, "junior"],
  [/\b(mid|middle|semi[- ]?senior|ssr)\b/i, "mid"],
];

/** Área y nivel a partir del título ("Junior Data Engineer" → datos-ia, junior). */
export function adivinarPuesto(titulo: string): { area: Area | null; seniority: Seniority | null } {
  const t = quitarAcentos(titulo);
  return {
    area: REGLAS_AREA.find(([r]) => r.test(titulo) || r.test(t))?.[1] ?? null,
    seniority: REGLAS_NIVEL.find(([r]) => r.test(titulo) || r.test(t))?.[1] ?? null,
  };
}

/** "Teide Software, S.L." y "teide software" son la misma empresa. */
export function nombreEmpresaComparable(nombre: string): string {
  return quitarAcentos(nombre.toLowerCase())
    .replace(/[.,]/g, " ")
    .replace(/\b(s ?l ?u?|s ?a ?u?|sociedad limitada|inc|ltd|llc|gmbh|bv|sas|srl|ltda|corp|co)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "35k", "35.000 €", "35 000" → 35000. null si no es un número. */
export function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().toLowerCase().replace(/[€$£\s]/g, "");
  if (!limpio) return null;
  const k = /^(\d+(?:[.,]\d+)?)k$/.exec(limpio);
  if (k) return Math.round(Number(k[1]!.replace(",", ".")) * 1000);
  const n = Number(limpio.replace(/[.,](?=\d{3}(\D|$))/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Quita el rastreo y lo que no cambia la página, para saber si dos enlaces son la misma oferta. */
export function enlaceComparable(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    for (const clave of [...u.searchParams.keys()]) {
      if (/^(utm_|ref|refid|trk|tracking|source|src|fbclid|gclid|mc_)/i.test(clave)) u.searchParams.delete(clave);
    }
    u.searchParams.sort();
    const ruta = u.pathname.replace(/\/+$/, "");
    const consulta = u.searchParams.toString();
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${ruta}${consulta ? `?${consulta}` : ""}`;
  } catch {
    return null;
  }
}
