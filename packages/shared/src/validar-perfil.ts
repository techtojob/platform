import { FOTOS_PERFIL, MAXIMO_ANOS_EXPERIENCIA, nivelPorExperiencia } from "./experiencia";
import type { DatosPerfil } from "./contratos";
import { esIdioma, NIVELES_IDIOMA } from "./idiomas";
import { AREAS, DISPONIBILIDAD, MODALIDADES, VISIBILIDAD_PERFIL } from "./listas";
import { TECNOLOGIAS } from "./tecnologias";

/**
 * Comprueba lo que escribe una persona en "Mi perfil". La usa el API antes de guardar
 * y la web para avisar mientras se escribe. Devuelve los datos limpios o un código por campo.
 */

export const LIMITES_PERFIL = {
  alias: { min: 3, max: 30 },
  nombre: { min: 2, max: 60 },
  titular: { min: 5, max: 80 },
  sobreMi: { max: 2000 },
  ciudad: { max: 80 },
  tecnologias: { max: 15 },
  idiomas: { max: 6 },
} as const;

/** Alias que no se pueden usar (chocan con páginas o confunden). */
const ALIAS_RESERVADOS = new Set([
  "admin", "administrador", "staff", "moderador", "moderator", "techtojob", "soporte", "support",
  "ayuda", "help", "api", "cuenta", "account", "perfil", "profile", "talento", "talent", "empleo",
  "jobs", "ofertas", "offers", "nueva", "nuevo", "new", "editar", "edit", "entrar", "login", "mapa",
]);

const idsTecnologias = new Set<string>(TECNOLOGIAS.map((t) => t.id));

type Resultado = { datos: DatosPerfil; errores?: undefined } | { datos?: undefined; errores: Record<string, string> };

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const de = <T extends string>(lista: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (lista as readonly string[]).includes(v) ? (v as T) : null;

/** "Pablo Pío Ramos" → "pablo-pio-ramos". Para proponer un alias. */
export function aliasDesde(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITES_PERFIL.alias.max)
    .replace(/-+$/g, "");
}

export function aliasValido(alias: string): string | null {
  if (alias.length < LIMITES_PERFIL.alias.min) return "corto";
  if (alias.length > LIMITES_PERFIL.alias.max) return "largo";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(alias)) return "formato";
  if (ALIAS_RESERVADOS.has(alias)) return "reservado";
  return null;
}

/**
 * Enlace a un perfil de una web concreta. Acepta "linkedin.com/in/x" sin https y lo completa.
 * Devuelve el enlace limpio, o null si no es de esa web.
 */
function enlaceDe(valor: string, dominios: string[] | null): string | null {
  const conProtocolo = /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
  try {
    const url = new URL(conProtocolo);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (dominios && !dominios.some((d) => host === d || host.endsWith(`.${d}`))) return null;
    if (!dominios && !host.includes(".")) return null;
    if (dominios && url.pathname.replace(/\/+$/, "") === "") return null;
    url.protocol = "https:";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function validarPerfil(entrada: unknown): Resultado {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  const errores: Record<string, string> = {};

  const alias = (texto(e.alias) ?? "").toLowerCase();
  const errorAlias = alias ? aliasValido(alias) : "falta";
  if (errorAlias) errores.alias = errorAlias;

  const nombre = texto(e.nombre);
  if (!nombre) errores.nombre = "falta";
  else if (nombre.length < LIMITES_PERFIL.nombre.min) errores.nombre = "corto";
  else if (nombre.length > LIMITES_PERFIL.nombre.max) errores.nombre = "largo";

  const titular = texto(e.titular);
  if (!titular) errores.titular = "falta";
  else if (titular.length < LIMITES_PERFIL.titular.min) errores.titular = "corto";
  else if (titular.length > LIMITES_PERFIL.titular.max) errores.titular = "largo";

  const sobreMi = texto(e.sobreMi);
  if (sobreMi && sobreMi.length > LIMITES_PERFIL.sobreMi.max) errores.sobreMi = "largo";

  const area = de(AREAS, e.area);
  if (!area) errores.area = "falta";
  // El nivel no se elige: sale de los años de experiencia (y de si ha liderado).
  const anos = typeof e.anosExperiencia === "number" ? e.anosExperiencia : Number.parseInt(String(e.anosExperiencia ?? ""), 10);
  const anosExperiencia = Number.isInteger(anos) && anos >= 0 && anos <= MAXIMO_ANOS_EXPERIENCIA ? anos : null;
  if (anosExperiencia === null) errores.anosExperiencia = "falta";
  const lidera = e.lidera === true;
  const foto = de(FOTOS_PERFIL, e.foto) ?? "ninguna";
  const disponibilidad = de(DISPONIBILIDAD, e.disponibilidad);
  if (!disponibilidad) errores.disponibilidad = "falta";
  const visibilidad = de(VISIBILIDAD_PERFIL, e.visibilidad);
  if (!visibilidad) errores.visibilidad = "falta";

  const modalidades = Array.isArray(e.modalidades)
    ? [...new Set(e.modalidades.map((m) => de(MODALIDADES, m)).filter((m) => m !== null))]
    : [];
  if (!modalidades.length) errores.modalidades = "falta";

  const pais = texto(e.pais)?.toUpperCase() ?? null;
  if (pais && !/^[A-Z]{2}$/.test(pais)) errores.pais = "codigo";
  const ciudad = texto(e.ciudad);
  if (ciudad && ciudad.length > LIMITES_PERFIL.ciudad.max) errores.ciudad = "largo";

  const tecnologias = Array.isArray(e.tecnologias)
    ? [...new Set(e.tecnologias.filter((t): t is string => typeof t === "string"))]
    : [];
  if (tecnologias.some((t) => !idsTecnologias.has(t))) errores.tecnologias = "desconocida";
  else if (tecnologias.length > LIMITES_PERFIL.tecnologias.max) errores.tecnologias = "demasiadas";

  const idiomas: DatosPerfil["idiomas"] = [];
  if (Array.isArray(e.idiomas)) {
    for (const fila of e.idiomas) {
      const f = (fila && typeof fila === "object" ? fila : {}) as Record<string, unknown>;
      if (typeof f.idioma !== "string" || !esIdioma(f.idioma)) {
        errores.idiomas = "idioma";
        continue;
      }
      const nivel = texto(f.nivel) ? de(NIVELES_IDIOMA, f.nivel) : null;
      if (texto(f.nivel) && !nivel) errores.idiomas = "nivel";
      if (!idiomas.some((x) => x.idioma === f.idioma)) idiomas.push({ idioma: f.idioma, nivel });
    }
  }
  if (!idiomas.length && !errores.idiomas) errores.idiomas = "falta";
  else if (idiomas.length > LIMITES_PERFIL.idiomas.max) errores.idiomas = "demasiados";

  const enlace = (campo: string, dominios: string[] | null) => {
    const valor = texto(e[campo]);
    if (!valor) return null;
    const limpio = enlaceDe(valor, dominios);
    if (!limpio) errores[campo] = "url";
    return limpio;
  };
  const linkedin = enlace("linkedin", ["linkedin.com"]);
  const github = enlace("github", ["github.com"]);
  const portfolio = enlace("portfolio", null);

  if (Object.keys(errores).length) return { errores };
  return {
    datos: {
      alias,
      nombre: nombre!,
      titular: titular!,
      sobreMi,
      area: area!,
      anosExperiencia: anosExperiencia!,
      lidera,
      seniority: nivelPorExperiencia(anosExperiencia!, lidera),
      ciudad,
      pais,
      modalidades,
      disponibilidad: disponibilidad!,
      tecnologias,
      idiomas,
      linkedin,
      github,
      portfolio,
      foto,
      visibilidad: visibilidad!,
    },
  };
}
