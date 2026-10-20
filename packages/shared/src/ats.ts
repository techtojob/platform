/**
 * Programas de selección (ATS) de los que la bolsa lee ofertas automáticamente.
 * Cada empresa tiene su página de empleo pública en uno de ellos.
 */
export const ATS = ["greenhouse", "lever", "ashby"] as const;
export type Ats = (typeof ATS)[number];

export const NOMBRES_ATS: Record<Ats, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

/**
 * La página de empleo de una empresa → qué ATS usa y su identificador.
 *
 * @example detectarAts("https://boards.greenhouse.io/cabify") // { ats: "greenhouse", id: "cabify" }
 * @example detectarAts("https://jobs.eu.lever.co/empresa/123") // { ats: "lever", id: "empresa", region: "eu" }
 * @example detectarAts("https://jobs.ashbyhq.com/empresa") // { ats: "ashby", id: "empresa" }
 */
export function detectarAts(enlace: string): { ats: Ats; id: string; region?: "eu" } | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(enlace.trim()) ? enlace.trim() : `https://${enlace.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const partes = url.pathname.split("/").filter(Boolean);
  const valido = (id: string | undefined) => (id && /^[A-Za-z0-9._-]{1,100}$/.test(id) ? id : null);

  // boards.greenhouse.io/empresa, job-boards.greenhouse.io/empresa, job-boards.eu.greenhouse.io/empresa,
  // o boards.greenhouse.io/embed/job_board?for=empresa
  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const id = valido(url.searchParams.get("for") ?? (partes[0] === "embed" ? undefined : partes[0]));
    return id ? { ats: "greenhouse", id } : null;
  }
  // jobs.lever.co/empresa o jobs.eu.lever.co/empresa
  if (/(^|\.)lever\.co$/.test(host)) {
    const id = valido(partes[0]);
    return id ? { ats: "lever", id, ...(host.includes(".eu.") && { region: "eu" as const }) } : null;
  }
  // jobs.ashbyhq.com/empresa
  if (/(^|\.)ashbyhq\.com$/.test(host)) {
    const id = valido(partes[0]);
    return id ? { ats: "ashby", id } : null;
  }
  return null;
}

/** El enlace público de la página de empleo, para enseñarlo en el panel. */
export function enlaceAts(ats: Ats, id: string, region?: string | null): string {
  if (ats === "greenhouse") return `https://job-boards.greenhouse.io/${id}`;
  if (ats === "lever") return `https://jobs.${region === "eu" ? "eu." : ""}lever.co/${id}`;
  return `https://jobs.ashbyhq.com/${id}`;
}
