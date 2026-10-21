/**
 * Prompt para que el staff resuma ofertas con una IA (ChatGPT, Claude…). La IA contesta con apartados
 * fijos (RESUMEN, RESPONSABILIDADES…) que el formulario sabe repartir solo (ver leerRespuestaIA en shared).
 * Lo que escribimos nosotros siempre se publica; el texto de la empresa, solo si nos autoriza.
 */

const FORMATO = `RESUMEN: [una o dos frases, como mucho 280 caracteres: qué es el puesto y qué hace la empresa]

RESPONSABILIDADES:
• [responsabilidad]
• [responsabilidad]
• [responsabilidad]

REQUISITOS:
• [requisito]
• [requisito]
• [requisito]

NIVEL: [Sin experiencia / Junior / Mid / Senior / Lead]
IDIOMAS: [idioma (nivel), por ejemplo: Inglés (B2), Español (nativo)]
TECNOLOGÍAS: [las principales, separadas por comas]`;

const REGLAS = `Reglas:
- Usa solo lo que dice la oferta. No inventes nada. Si un dato no aparece, borra esa línea entera.
- Escribe con tus propias palabras: no copies frases de la oferta.
- RESPONSABILIDADES y REQUISITOS: entre 2 y 5 de cada, los más importantes. Frases cortas que empiecen
  por un verbo en infinitivo ("Diseñar…", "Mantener…"), sin relleno.
- Aunque la oferta esté en inglés u otro idioma, todo va en español.
- Respeta los nombres de los apartados (RESUMEN:, RESPONSABILIDADES:…) tal cual: se leen solos.
- Sin negritas, sin asteriscos y sin nada antes ni después.`;

/** Para pegar una vez al empezar la conversación: luego se le pasan ofertas una tras otra. */
export const PROMPT_RESUMEN = `Vas a ayudar al staff de TechToJob, una bolsa de empleo tech para España y Latinoamérica,
a resumir ofertas de trabajo.

Cómo funciona:
1. Ahora responde solo con: "Pega aquí la oferta (el texto completo)."
2. Cada vez que te pegue una oferta, contesta SOLO con esto:

${FORMATO}

${REGLAS}`;

/** Lo mismo, de una vez y con una oferta ya dentro (botón del formulario y de la ficha del panel). */
export function promptConOferta(o: { titulo: string; empresa: string; texto: string | null }): string {
  return `Eres el editor de ofertas de TechToJob, una bolsa de empleo tech para España y Latinoamérica.
Resume esta oferta de trabajo. Contesta SOLO con esto:

${FORMATO}

${REGLAS}

Oferta:
${o.titulo} — ${o.empresa}

${o.texto?.trim() || "(sin descripción)"}`;
}

/** "Remoto desde España, México" o "Híbrido en Madrid, España". */
export function dondeEnTexto(o: { modalidad: string; remotoMundo: boolean; remotoPaises: string[]; ciudad: string | null; pais: string | null }): string | null {
  const pais = (c: string) => new Intl.DisplayNames(["es"], { type: "region" }).of(c) ?? c;
  if (o.modalidad === "remoto") {
    if (o.remotoMundo) return "Cualquier país";
    return o.remotoPaises.length ? o.remotoPaises.map(pais).join(", ") : null;
  }
  return [o.ciudad, o.pais && pais(o.pais)].filter(Boolean).join(", ") || null;
}

const MODALIDAD: Record<string, string> = { remoto: "Remoto", hibrido: "Híbrido", presencial: "Presencial" };
const NIVEL: Record<string, string> = { "sin-experiencia": "Sin experiencia", junior: "Junior", mid: "Mid", senior: "Senior", lead: "Lead" };
const NIVEL_IDIOMA: Record<string, string> = { nativo: "nativo" };

/**
 * El texto para publicar la oferta en Discord, LinkedIn… (sin IA: con los datos de la ficha).
 *   Data Engineer - Remoto
 *   📍 Desde dónde: España, México
 *   …
 */
export function textoParaRedes(o: {
  titulo: string;
  empresa: string;
  modalidad: string;
  remotoMundo: boolean;
  remotoPaises: string[];
  ciudad: string | null;
  pais: string | null;
  seniority: string;
  salarioMin: number | null;
  salarioMax: number | null;
  moneda: string | null;
  idiomasRequeridos: Array<{ idioma: string; nivel: string | null }>;
  tecnologias: string[];
  nombresTecnologias: (id: string) => string;
  responsabilidades: string[];
  requisitos: string[];
  enlace: string;
}): string {
  const idioma = (c: string) => new Intl.DisplayNames(["es"], { type: "language" }).of(c) ?? c;
  const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const cifra = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: o.moneda ?? "EUR", maximumFractionDigits: 0 }).format(n);
  const salario = [o.salarioMin, o.salarioMax].filter((n): n is number => n != null).map(cifra).join(" – ");
  const donde = dondeEnTexto(o);
  const lineas = [
    `${o.titulo} (${o.empresa}) - ${MODALIDAD[o.modalidad] ?? o.modalidad}`,
    "",
    donde && `📍 ${o.modalidad === "remoto" ? "Desde dónde" : "Dónde"}: ${donde}`,
    NIVEL[o.seniority] && `🎯 Nivel: ${NIVEL[o.seniority]}`,
    salario && `💰 Salario: ${salario} al año`,
    o.idiomasRequeridos.length &&
      `🗣️ Idiomas: ${o.idiomasRequeridos.map((i) => `${mayuscula(idioma(i.idioma))}${i.nivel ? ` (${NIVEL_IDIOMA[i.nivel] ?? i.nivel.toUpperCase()})` : ""}`).join(", ")}`,
    o.tecnologias.length && `🛠️ Tecnologías: ${o.tecnologias.map(o.nombresTecnologias).join(", ")}`,
    ...(o.responsabilidades.length ? ["", "Responsabilidades", "", ...o.responsabilidades.map((r) => `• ${r}`)] : []),
    ...(o.requisitos.length ? ["", "Requisitos", "", ...o.requisitos.map((r) => `• ${r}`)] : []),
    "",
    o.enlace,
  ];
  return lineas.filter((l): l is string => typeof l === "string").join("\n");
}
