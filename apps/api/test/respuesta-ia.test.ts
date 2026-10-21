import { leerRespuestaIA, tieneTextoPublicable, validarOferta } from "@techtojob/shared";
import { describe, expect, it } from "vitest";

describe("leer la respuesta de la IA", () => {
  it("reparte cada apartado en su campo, aunque venga con negritas, emojis o viñetas distintas", () => {
    const r = leerRespuestaIA(`**RESUMEN:** Asistente ejecutivo a media jornada para una startup fintech.

RESPONSABILIDADES:
• Realizar tareas de contabilidad.
- Gestionar activos.
3. Ayudar con las transacciones.

Requisitos:
• Inglés fluido
• 2 años de experiencia

🎯 NIVEL: Junior
IDIOMAS: Inglés (C1), Español (nativo)
TECNOLOGÍAS: Excel, SQL, Python`);
    expect(r).toEqual({
      resumen: "Asistente ejecutivo a media jornada para una startup fintech.",
      responsabilidades: ["Realizar tareas de contabilidad.", "Gestionar activos.", "Ayudar con las transacciones."],
      requisitos: ["Inglés fluido", "2 años de experiencia"],
      seniority: "junior",
      idiomas: [{ idioma: "en", nivel: "c1" }, { idioma: "es", nivel: "nativo" }],
      tecnologias: ["python", "sql"],
    });
  });

  it("lo que no viene, no se toca; un texto cualquiera no rellena nada", () => {
    expect(leerRespuestaIA("RESUMEN: Solo esto.")).toEqual({ resumen: "Solo esto." });
    expect(leerRespuestaIA("Hola, ¿en qué te ayudo?")).toEqual({});
  });
});

describe("qué se puede publicar", () => {
  it("hace falta resumen y responsabilidades, o la descripción si la empresa nos autoriza", () => {
    const base = { resumen: null, responsabilidades: [], descripcion: "Texto de la empresa", autorizada: false };
    expect(tieneTextoPublicable(base)).toBe(false);
    expect(tieneTextoPublicable({ ...base, resumen: "Resumen", responsabilidades: ["Algo"] })).toBe(true);
    expect(tieneTextoPublicable({ ...base, resumen: "Resumen" })).toBe(false);
    expect(tieneTextoPublicable({ ...base, autorizada: true })).toBe(true);
  });

  it("los puntos se guardan limpios (sin viñetas, vacíos ni repetidos)", () => {
    const r = validarOferta({
      empresaId: "e", titulo: "Data Engineer", idioma: "es", urlOriginal: "https://e.com/1", area: "datos", seniority: "mid",
      modalidad: "remoto", remotoMundo: true, idiomasRequeridos: [{ idioma: "es" }],
      responsabilidades: "• Uno\n\n- Dos\n• Uno", requisitos: ["1. Tres", ""],
    });
    expect(r.datos).toMatchObject({ responsabilidades: ["Uno", "Dos"], requisitos: ["Tres"] });
  });
});
