import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { crearDbPrueba } from "./db";

/** La migración 0010 reparte lo que había en "Datos e IA" entre "Datos" e "IA" según el título. */
describe("migración: Datos e IA → Datos / IA", () => {
  it("cada oferta va a su área por el título", async () => {
    const db = await crearDbPrueba();
    const titulos = ["Machine Learning Engineer", "Data Scientist", "Junior Data Engineer", "AI Engineer", "Analista de BI", "Ingeniero/a de IA"];
    for (const [i, titulo] of titulos.entries()) {
      await db.execute(sql`insert into ofertas (id, slug, empresa_id, titulo, idioma, url_original, area, seniority, modalidad, origen)
        values (${`mig${i}`}, ${`m${i}`}, 'emp-marea', ${titulo}, 'en', 'https://example.com', 'datos-ia', 'mid', 'remoto', 'manual')`);
    }
    const migracion = readFileSync(new URL("../migraciones/0010_areas-datos-ia.sql", import.meta.url), "utf8");
    for (const sentencia of migracion.split("--> statement-breakpoint")) await db.execute(sql.raw(sentencia));
    const filas = (await db.execute(sql`select titulo, area from ofertas where id like 'mig%' order by id`)) as unknown as { rows: Array<{ titulo: string; area: string }> };
    expect(filas.rows.map((f) => `${f.titulo} → ${f.area}`)).toEqual([
      "Machine Learning Engineer → ia",
      "Data Scientist → datos",
      "Junior Data Engineer → datos",
      "AI Engineer → ia",
      "Analista de BI → datos",
      "Ingeniero/a de IA → ia",
    ]);
  });
});
