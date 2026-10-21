import { detectarIdiomasPedidos, detectarTecnologias } from "./analizar-oferta";
import type { Idioma, NivelIdioma } from "./idiomas";
import type { Seniority } from "./listas";

/**
 * Lee la respuesta de la IA (ver el prompt del panel de staff) y la reparte en los campos de la oferta.
 * La IA contesta con apartados fijos:
 *
 *   RESUMEN: una o dos frases
 *   RESPONSABILIDADES:
 *   • …
 *   REQUISITOS:
 *   • …
 *   NIVEL: Junior
 *   IDIOMAS: Inglés (B2)
 *   TECNOLOGÍAS: Python, SQL
 *
 * Lo que no venga, no se toca. Acepta mayúsculas o minúsculas, con o sin tildes, y viñetas •, -, * o números.
 */
export type RespuestaIA = {
  resumen?: string;
  responsabilidades?: string[];
  requisitos?: string[];
  seniority?: Seniority;
  idiomas?: Array<{ idioma: Idioma; nivel: NivelIdioma | null }>;
  tecnologias?: string[];
};

const APARTADOS = {
  resumen: /^resumen$/,
  responsabilidades: /^(responsabilidades|funciones|tareas)$/,
  requisitos: /^(requisitos|requerimientos)$/,
  nivel: /^nivel$/,
  idiomas: /^idiomas?$/,
  tecnologias: /^(tecnologias|stack)$/,
} as const;
type Apartado = keyof typeof APARTADOS;

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const NIVELES: Array<[RegExp, Seniority]> = [
  [/sin experiencia|trainee|becari|practicas|intern/, "sin-experiencia"],
  [/junior|jr\b/, "junior"],
  [/mid|semi|intermedio/, "mid"],
  [/senior|sr\b/, "senior"],
  [/lead|lider|principal|staff/, "lead"],
];

export function leerRespuestaIA(texto: string): RespuestaIA {
  const partes: Partial<Record<Apartado, string[]>> = {};
  let actual: Apartado | null = null;
  for (const linea of texto.split(/\r?\n/)) {
    const limpia = linea.replace(/\*\*/g, "").trim();
    if (!limpia) continue;
    // "RESUMEN: texto" o "RESPONSABILIDADES:" (con o sin dos puntos, con o sin emoji delante).
    const m = /^[^\p{L}]*([\p{L} ]{3,20}?)\s*:\s*(.*)$/u.exec(limpia) ?? /^[^\p{L}]*([\p{L} ]{3,20})$/u.exec(limpia);
    const nombre = m ? (Object.keys(APARTADOS) as Apartado[]).find((k) => APARTADOS[k].test(sinTildes(m[1]!.trim()))) : undefined;
    if (nombre) {
      actual = nombre;
      partes[nombre] ??= [];
      if (m![2]?.trim()) partes[nombre]!.push(m![2].trim());
      continue;
    }
    if (actual) (partes[actual] ??= []).push(limpia);
  }

  const puntos = (lineas?: string[]) =>
    lineas
      ?.map((l) => l.replace(/^\s*(?:[•·▪◦*-]|\d+[.)])\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
  const r: RespuestaIA = {};
  if (partes.resumen?.length) r.resumen = partes.resumen.join(" ").slice(0, 300);
  const resp = puntos(partes.responsabilidades);
  if (resp?.length) r.responsabilidades = resp;
  const req = puntos(partes.requisitos);
  if (req?.length) r.requisitos = req;
  const nivel = partes.nivel?.join(" ");
  if (nivel) r.seniority = NIVELES.find(([re]) => re.test(sinTildes(nivel)))?.[1];
  if (!r.seniority) delete r.seniority;
  // "Inglés (C1), Español (nativo)": cada idioma con su nivel, si lo dice.
  const idiomas: NonNullable<RespuestaIA["idiomas"]> = [];
  for (const trozo of (partes.idiomas?.join(", ") ?? "").split(/[,;]| y /)) {
    const [idioma] = detectarIdiomasPedidos(trozo.replace(/\(.*\)/, ""));
    if (!idioma || idiomas.some((i) => i.idioma === idioma.idioma)) continue;
    const t = sinTildes(trozo);
    const nivel = /nativ|materna|bilingue/.test(t) ? "nativo" : ((/\b([abc][12])\b/.exec(t)?.[1] as NivelIdioma | undefined) ?? idioma.nivel);
    idiomas.push({ idioma: idioma.idioma, nivel: nivel ?? null });
  }
  if (idiomas.length) r.idiomas = idiomas;
  const tecnologias = partes.tecnologias?.join(", ");
  if (tecnologias) {
    const ids = detectarTecnologias(tecnologias);
    if (ids.length) r.tecnologias = ids;
  }
  return r;
}
