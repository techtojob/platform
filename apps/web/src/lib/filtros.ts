import { AREAS, MODALIDADES, SENIORITY, TECNOLOGIAS, type Area, type Modalidad, type Seniority } from "@techtojob/shared";

/**
 * Filtros del listado, guardados en la dirección: /empleo?area=desarrollo&nivel=junior&tec=react
 * Así se pueden compartir, guardar en favoritos y usar con los botones de atrás/adelante.
 * Los nombres de los parámetros son los mismos que usa el API.
 */

export type Filtros = {
  areas: Area[];
  seniority: Seniority[];
  modalidades: Modalidad[];
  tecnologias: string[];
  /** Página siguiente (código que devuelve el API). */
  despues?: string;
};

/** Cada filtro, el nombre de su parámetro en la dirección y los valores que admite. */
export const PARAMETROS = {
  areas: { nombre: "area", valores: AREAS },
  seniority: { nombre: "nivel", valores: SENIORITY },
  modalidades: { nombre: "modalidad", valores: MODALIDADES },
  tecnologias: { nombre: "tec", valores: TECNOLOGIAS.map((t) => t.id) },
} as const;

export type GrupoFiltro = keyof typeof PARAMETROS;

type ParametrosUrl = Record<string, string | string[] | undefined>;

function leerLista<T extends string>(valor: string | string[] | undefined, permitidos: readonly T[]): T[] {
  const texto = Array.isArray(valor) ? valor.join(",") : (valor ?? "");
  const lista = texto
    .split(",")
    .map((v) => v.trim())
    .filter((v): v is T => (permitidos as readonly string[]).includes(v));
  return [...new Set(lista)];
}

/** Lee los filtros de la dirección. Lo que no se reconoce se ignora (no da error). */
export function leerFiltros(parametros: ParametrosUrl): Filtros {
  const despues = typeof parametros.despues === "string" && parametros.despues ? parametros.despues : undefined;
  return {
    areas: leerLista(parametros[PARAMETROS.areas.nombre], PARAMETROS.areas.valores),
    seniority: leerLista(parametros[PARAMETROS.seniority.nombre], PARAMETROS.seniority.valores),
    modalidades: leerLista(parametros[PARAMETROS.modalidades.nombre], PARAMETROS.modalidades.valores),
    tecnologias: leerLista(parametros[PARAMETROS.tecnologias.nombre], PARAMETROS.tecnologias.valores),
    ...(despues && { despues }),
  };
}

/** Filtros → parámetros de la dirección. Sin los vacíos, para que quede limpia. */
export function aParametros(f: Filtros): Record<string, string> {
  const q: Record<string, string> = {};
  for (const grupo of Object.keys(PARAMETROS) as GrupoFiltro[]) {
    if (f[grupo].length) q[PARAMETROS[grupo].nombre] = f[grupo].join(",");
  }
  if (f.despues) q.despues = f.despues;
  return q;
}

/** Pone o quita un valor de un filtro. Al cambiar un filtro se vuelve a la primera página. */
export function alternar(f: Filtros, grupo: GrupoFiltro, valor: string): Filtros {
  const actual = f[grupo] as string[];
  const nueva = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor];
  return { ...f, [grupo]: nueva, despues: undefined };
}

export function hayFiltros(f: Filtros): boolean {
  return (Object.keys(PARAMETROS) as GrupoFiltro[]).some((g) => f[g].length > 0);
}

export const SIN_FILTROS: Filtros = { areas: [], seniority: [], modalidades: [], tecnologias: [] };
