import { AREAS, esIdioma, MODALIDADES, SENIORITY, TECNOLOGIAS, type Idioma } from "@techtojob/shared";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Entorno } from "../app";
import { listarOfertas, obtenerOferta } from "../servicios/ofertas";

const idsTecnologias = new Set<string>(TECNOLOGIAS.map((t) => t.id));

/** "a,b,c" → ["a","b","c"], comprobando que cada valor está en la lista permitida. */
function lista<T extends string>(valor: string | undefined, permitidos: readonly T[], nombre: string): T[] {
  if (!valor) return [];
  const valores = valor.split(",").map((v) => v.trim()).filter(Boolean);
  const malos = valores.filter((v) => !(permitidos as readonly string[]).includes(v));
  if (malos.length) throw new HTTPException(400, { message: `Valor no válido en "${nombre}": ${malos.join(", ")}.` });
  return valores as T[];
}

/**
 * GET /ofertas?idiomas=es,en&area=desarrollo&nivel=junior&modalidad=remoto&tec=python,react&limite=20&despues=…
 *
 * `idiomas` es obligatorio: los idiomas que habla quien busca (los manda la web,
 * sacados del navegador o del perfil).
 */
export const rutasOfertas = new Hono<Entorno>().get("/", async (c) => {
  const q = c.req.query();

  const idiomas = (q.idiomas ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (!idiomas.length) throw new HTTPException(400, { message: 'Falta "idiomas": los idiomas que hablas, por ejemplo idiomas=es,en.' });
  const malos = idiomas.filter((i) => !esIdioma(i));
  if (malos.length) throw new HTTPException(400, { message: `Idioma no válido: ${malos.join(", ")}.` });

  const tecnologias = lista(q.tec, [...idsTecnologias], "tec");
  const limite = q.limite ? Number(q.limite) : undefined;
  if (limite !== undefined && !Number.isInteger(limite)) {
    throw new HTTPException(400, { message: '"limite" tiene que ser un número entero.' });
  }

  const resultado = await listarOfertas(c.var.db, {
    idiomas: idiomas as Idioma[],
    areas: lista(q.area, AREAS, "area"),
    seniority: lista(q.nivel, SENIORITY, "nivel"),
    modalidades: lista(q.modalidad, MODALIDADES, "modalidad"),
    tecnologias,
    limite,
    despues: q.despues ?? null,
  });

  return c.json(resultado);
})
  /** GET /ofertas/:id → la oferta entera, o 404 si no existe o aún no está publicada. */
  .get("/:id", async (c) => {
    const oferta = await obtenerOferta(c.var.db, c.req.param("id"));
    if (!oferta) {
      return c.json({ error: { codigo: "no_encontrado", mensaje: "Esta oferta no existe o ya no está publicada." } }, 404);
    }
    return c.json(oferta);
  });
