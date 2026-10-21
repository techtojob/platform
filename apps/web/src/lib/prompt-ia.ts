/**
 * Prompt para que el staff resuma ofertas con una IA (ChatGPT, Claude…): se pega una vez
 * y luego se le van pasando ofertas. Siempre en español: las ofertas de la bolsa se resumen en español.
 */

const FORMATO = `[Puesto] - [Jornada] - [Modalidad]

📍 Desde dónde: [países o regiones desde los que se puede trabajar]
🎯 Nivel: [Junior / Mid / Senior / Lead]
💰 Salario: [rango y moneda, al año]
🗣️ Idiomas: [idiomas y nivel que pide]
🛠️ Tecnologías: [las principales, separadas por comas]

Responsabilidades

• [responsabilidad]
• [responsabilidad]
• [responsabilidad]

Requisitos

• [requisito]
• [requisito]
• [requisito]

[enlace de la oferta]`;

const REGLAS = `Reglas:
- Usa solo lo que dice la oferta. No inventes nada. Si un dato no aparece, borra esa línea entera.
- Si no te pego el enlace, pon al final: "⚠️ Falta el enlace de la oferta".
- Puesto: en español si es lo habitual ("Executive Assistant" → "Asistente Ejecutivo";
  "Data Engineer" se queda igual). Sin el nombre de la empresa.
- Jornada: "Jornada completa", "Part Time", "Freelance" o "Prácticas".
- Modalidad: "Remoto", "Híbrido (ciudad)" o "Presencial (ciudad)".
- Desde dónde: concreto y en español. "Cualquier país", "Solo España", "Latinoamérica",
  "México, Colombia y Argentina", "Europa (UE)"… "Remote - EMEA" → "Europa, Oriente Medio y África".
  Si es remoto y no dice desde dónde, pon "No lo especifica".
- Responsabilidades y requisitos: como mucho 4 de cada. Frases cortas que empiecen por un verbo
  en infinitivo ("Diseñar…", "Mantener…"), sin relleno.
- Aunque la oferta esté en inglés u otro idioma, el resumen va siempre en español.
- Sin negritas ni asteriscos.`;

/** Para pegar una vez al empezar la conversación: luego se le pasan ofertas una tras otra. */
export const PROMPT_RESUMEN = `Vas a ayudar al staff de TechToJob, una bolsa de empleo tech para España y Latinoamérica,
a resumir ofertas de trabajo.

Cómo funciona:
1. Ahora responde solo con: "Pega aquí la oferta (el texto completo y el enlace)."
2. Cada vez que te pegue una oferta, contesta SOLO con el resumen, con este formato exacto:

${FORMATO}

3. Después del resumen escribe una línea en blanco y: "Pega la siguiente oferta."

${REGLAS}`;

/** Lo mismo, pero de una vez y con una oferta ya dentro (botón de la ficha de una oferta en el panel). */
export function promptConOferta(o: {
  titulo: string;
  empresa: string;
  texto: string | null;
  enlace: string;
  /** Lo que ya sabemos de la ficha: "Remoto desde: España, México". */
  donde: string | null;
}): string {
  return `Eres el editor de ofertas de TechToJob, una bolsa de empleo tech para España y Latinoamérica.
Resume esta oferta de trabajo. Contesta SOLO con el resumen, con este formato exacto:

${FORMATO}

${REGLAS}
${o.donde ? `- Dónde (ya comprobado en nuestra ficha, úsalo tal cual): ${o.donde}.\n` : ""}
Oferta:
${o.titulo} — ${o.empresa}

${o.texto?.trim() || "(sin descripción)"}

Enlace: ${o.enlace}`;
}
