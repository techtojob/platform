/**
 * Programas de selección (ATS) de los que la bolsa lee ofertas automáticamente.
 * Cada empresa tiene su página de empleo pública en uno de ellos.
 */
export const ATS = ["greenhouse", "lever", "ashby", "teamtailor", "personio", "workable", "recruitee", "smartrecruiters"] as const;
export type Ats = (typeof ATS)[number];

export const NOMBRES_ATS: Record<Ats, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  teamtailor: "Teamtailor",
  personio: "Personio",
  workable: "Workable",
  recruitee: "Recruitee",
  smartrecruiters: "SmartRecruiters",
};

/**
 * La página de empleo de una empresa → qué ATS usa y su identificador.
 *
 * @example detectarAts("https://boards.greenhouse.io/cabify") // { ats: "greenhouse", id: "cabify" }
 * @example detectarAts("https://jobs.eu.lever.co/empresa/123") // { ats: "lever", id: "empresa", region: "eu" }
 * @example detectarAts("https://jobs.ashbyhq.com/empresa") // { ats: "ashby", id: "empresa" }
 * @example detectarAts("https://empresa.teamtailor.com/jobs") // { ats: "teamtailor", id: "empresa" }
 * @example detectarAts("https://empresa.jobs.personio.de") // { ats: "personio", id: "empresa" }
 * @example detectarAts("https://apply.workable.com/empresa/j/ABC123") // { ats: "workable", id: "empresa" }
 * @example detectarAts("https://empresa.recruitee.com/o/backend") // { ats: "recruitee", id: "empresa" }
 * @example detectarAts("https://jobs.smartrecruiters.com/Empresa/7440001") // { ats: "smartrecruiters", id: "Empresa" }
 */
export function detectarAts(enlace: string): { ats: Ats; id: string; region?: "eu" | "com" } | null {
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
  // empresa.teamtailor.com (o empresa.na.teamtailor.com, las de Norteamérica)
  const tt = host.match(/^([a-z0-9-]+(?:\.na)?)\.teamtailor\.com$/);
  if (tt && !["www", "app", "career", "api"].includes(tt[1]!)) return { ats: "teamtailor", id: tt[1]! };
  // empresa.jobs.personio.de o empresa.jobs.personio.com
  const pe = host.match(/^([a-z0-9-]+)\.jobs\.personio\.(de|com)$/);
  if (pe) return { ats: "personio", id: pe[1]!, ...(pe[2] === "com" && { region: "com" as const }) };
  // apply.workable.com/empresa (no apply.workable.com/j/CODIGO: ese enlace no dice la empresa) o empresa.workable.com
  if (host === "apply.workable.com") {
    const id = valido(partes[0]?.toLowerCase());
    return id && !["j", "api", "careers"].includes(id) ? { ats: "workable", id } : null;
  }
  const wk = host.match(/^([a-z0-9-]+)\.workable\.com$/);
  if (wk && !["www", "apply", "jobs", "help", "resources", "api"].includes(wk[1]!)) return { ats: "workable", id: wk[1]! };
  // empresa.recruitee.com
  const rc = host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
  if (rc && !["www", "app", "api", "support", "blog", "careers", "status"].includes(rc[1]!)) return { ats: "recruitee", id: rc[1]! };
  // jobs.smartrecruiters.com/Empresa/... o careers.smartrecruiters.com/Empresa (el identificador distingue mayúsculas)
  if (host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") {
    const id = valido(partes[0]);
    return id && !["oneclick-ui", "sr-jobs", "api", "ni", "public", "embed"].includes(id.toLowerCase()) ? { ats: "smartrecruiters", id } : null;
  }
  return null;
}

/** El enlace público de la página de empleo, para enseñarlo en el panel. */
export function enlaceAts(ats: Ats, id: string, region?: string | null): string {
  if (ats === "greenhouse") return `https://job-boards.greenhouse.io/${id}`;
  if (ats === "lever") return `https://jobs.${region === "eu" ? "eu." : ""}lever.co/${id}`;
  if (ats === "teamtailor") return `https://${id}.teamtailor.com/jobs`;
  if (ats === "personio") return `https://${id}.jobs.personio.${region === "com" ? "com" : "de"}`;
  if (ats === "workable") return `https://apply.workable.com/${id}/`;
  if (ats === "recruitee") return `https://${id}.recruitee.com/`;
  if (ats === "smartrecruiters") return `https://jobs.smartrecruiters.com/${id}`;
  return `https://jobs.ashbyhq.com/${id}`;
}
