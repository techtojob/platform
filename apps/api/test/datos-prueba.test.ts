import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { empresas, ofertas, perfiles } from "../src/db/esquema";
import { quitarDatosPrueba } from "../src/db/datos-prueba";
import { crearEmpresa } from "../src/servicios/ofertas-staff";
import { crearDbPrueba } from "./db";

describe("quitar los datos de prueba", () => {
  it("quita lo inventado y deja lo real", async () => {
    const db = await crearDbPrueba();
    const real = await crearEmpresa(db, { nombre: "Empresa Real", paginaEmpleo: "https://jobs.ashbyhq.com/real" });
    await db.insert(ofertas).values({
      id: "real0001", slug: "real", empresaId: real.id, titulo: "Backend Engineer", idioma: "en", urlOriginal: "https://jobs.ashbyhq.com/real/1",
      area: "desarrollo", seniority: "mid", modalidad: "remoto", remotoMundo: true, origen: "automatica", estado: "pendiente",
    });
    const r = await quitarDatosPrueba(db);
    expect(r.ofertas).toBeGreaterThan(0);
    expect(r.empresas).toBe(5);
    expect(r.perfiles).toBeGreaterThan(0);
    expect((await db.select().from(ofertas)).map((o) => o.id)).toEqual(["real0001"]);
    expect((await db.select().from(empresas)).map((e) => e.nombre)).toEqual(["Empresa Real"]);
    expect(await db.select().from(perfiles)).toEqual([]);
    // Se puede repetir sin problema.
    expect(await quitarDatosPrueba(db)).toEqual({ ofertas: 0, empresas: 0, perfiles: 0 });
    expect((await db.select().from(empresas).where(eq(empresas.id, real.id))).length).toBe(1);
  });
});
