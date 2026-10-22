import { leerFiltrosProyectos as leerDeShared, type Area, type FiltrosProyectos } from "@techtojob/shared";

/**
 * Filtros de la página de proyectos, en la dirección: /empleo/proyectos?orden=tendencia&area=datos&tec=python
 * Con "ver=portfolios" se ven los portfolios (mismos órdenes y áreas, sin tecnologías) y "juicio=1" deja
 * solo los que pasaron por "Tu portfolio a juicio". Mismos nombres que el API (GET /proyectos y GET /portfolios).
 */
export type FiltrosVista = FiltrosProyectos & { ver?: "portfolios"; soloJuicio?: boolean };

export function leerFiltrosProyectos(p: Record<string, string | string[] | undefined>): FiltrosVista {
  const uno = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  const f: FiltrosVista = leerDeShared(p);
  if (uno(p.ver) === "portfolios") {
    f.ver = "portfolios";
    f.tecnologias = [];
    if (uno(p.juicio) === "1") f.soloJuicio = true;
  }
  return f;
}

export function aParametrosProyectos(f: FiltrosVista): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.ver) q.ver = f.ver;
  if (f.orden !== "mes") q.orden = f.orden;
  if (f.mes) q.mes = f.mes;
  if (f.areas.length) q.area = f.areas.join(",");
  if (f.tecnologias.length) q.tec = f.tecnologias.join(",");
  if (f.soloJuicio) q.juicio = "1";
  if (f.q) q.q = f.q;
  if (f.pagina > 1) q.pagina = String(f.pagina);
  return q;
}

/** Cambia algo y vuelve a la primera página. */
export function cambiarProyectos(f: FiltrosVista, cambios: Partial<FiltrosVista>): FiltrosVista {
  const nuevos = { ...f, pagina: 1, ...cambios };
  if (nuevos.orden !== "mes" || !nuevos.mes) delete nuevos.mes;
  if (!nuevos.q) delete nuevos.q;
  if (!nuevos.ver) delete nuevos.ver;
  if (!nuevos.soloJuicio || !nuevos.ver) delete nuevos.soloJuicio;
  if (nuevos.ver) nuevos.tecnologias = [];
  return nuevos;
}

export function alternarArea(f: FiltrosVista, area: Area): FiltrosVista {
  return cambiarProyectos(f, { areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area] });
}

export function alternarTecnologia(f: FiltrosVista, tec: string): FiltrosVista {
  return cambiarProyectos(f, { tecnologias: f.tecnologias.includes(tec) ? f.tecnologias.filter((t) => t !== tec) : [...f.tecnologias, tec] });
}

/** Los meses que se pueden ver en el ranking: desde el lanzamiento (octubre de 2026) hasta este. */
export function mesesDelRanking(actual: string, desde = "2026-10"): string[] {
  const meses: string[] = [];
  let [a, m] = actual.split("-").map(Number) as [number, number];
  for (let i = 0; i < 36; i++) {
    const mes = `${a}-${String(m).padStart(2, "0")}`;
    if (mes < desde) break;
    meses.push(mes);
    m -= 1;
    if (m === 0) {
      m = 12;
      a -= 1;
    }
  }
  return meses;
}

/** "/empleo/proyectos/lakehouse-canarias-k7x2m9qa" */
export function slugDeProyecto(p: { slug: string; id: string }): string {
  return `${p.slug}-${p.id}`;
}
