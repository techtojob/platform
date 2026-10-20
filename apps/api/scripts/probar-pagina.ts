// Lee una página de empleo de verdad y enseña lo que sacamos, SIN tocar la base de datos.
// Sirve para comprobar que un lector (sobre todo Teamtailor y Personio) entiende bien una empresa.
//
// Uso: pnpm --filter api ofertas:probar https://empresa.teamtailor.com/jobs
//      pnpm --filter api ofertas:probar https://empresa.jobs.personio.de
import { adivinarPuesto, describirRemoto, detectarAts, detectarTecnologias, NOMBRES_ATS } from "@techtojob/shared";
import { dondeRemoto, esRemoto, esTecnica, filtrar, leerAts } from "../src/servicios/ats";
import { idiomaDe } from "../src/servicios/sincronizar";

const enlace = process.argv[2];
const ats = enlace ? detectarAts(enlace) : null;
if (!ats) {
  console.error("Pásame el enlace de una página de empleo de Greenhouse, Lever, Ashby, Teamtailor, Personio, Workable, Recruitee o SmartRecruiters.");
  console.error("Ejemplo: pnpm --filter api ofertas:probar https://empresa.teamtailor.com/jobs");
  process.exit(1);
}

const corto = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const donde = (r: ReturnType<typeof dondeRemoto>) => {
  if (r === null) return "¿? (solo dice Remote: lo rellena el staff)";
  if (r === "fuera") return "fuera de nuestro público";
  const d = describirRemoto(r);
  return d.mundo ? "cualquier país" : d.partes.map((p) => (p.tipo === "pais" ? p.pais : `${p.region}${p.salvo.length ? ` salvo ${p.salvo.join(",")}` : ""}`)).join(" + ");
};

console.log(`\n${NOMBRES_ATS[ats.ats]} · ${ats.id}${ats.region ? ` (${ats.region})` : ""}\n`);
const todas = await leerAts({ ats: ats.ats, atsId: ats.id, atsRegion: ats.region }, fetch);
const entran = filtrar(todas).filter((o) => idiomaDe(o));
console.log(`Ofertas en su página: ${todas.length} · entrarían en la bolsa: ${entran.length}\n`);

console.log("── Las primeras 15 que hay en su página ──");
for (const o of todas.slice(0, 15)) {
  const motivo = !esTecnica(o.titulo) ? "no es técnica" : !esRemoto(o) ? `no es 100 % remota (${o.modalidad ?? "?"})` : dondeRemoto(o.ubicaciones, o.titulo) === "fuera" ? "zona fuera" : !idiomaDe({ ...o, remoto: null }) ? "idioma" : "ENTRA";
  console.log(`${motivo === "ENTRA" ? "✓" : "·"} ${corto(o.titulo, 50).padEnd(50)} ${corto(o.ubicaciones.join(" | ") || "(sin ubicación)", 40).padEnd(40)} ${motivo}`);
}

console.log("\n── Detalle de las que entrarían (hasta 5) ──");
for (const o of entran.slice(0, 5)) {
  const puesto = adivinarPuesto(o.titulo);
  console.log(`\n${o.titulo}`);
  console.log(`  enlace:      ${o.url}`);
  console.log(`  id:          ${o.idExterno}`);
  console.log(`  ubicaciones: ${o.ubicaciones.join(" | ") || "(ninguna)"}`);
  console.log(`  desde dónde: ${donde(o.remoto ?? null)}`);
  console.log(`  idioma:      ${idiomaDe(o)} · área: ${puesto.area ?? "desarrollo (por defecto)"} · nivel: ${puesto.seniority ?? "mid (por defecto)"}`);
  console.log(`  tecnologías: ${detectarTecnologias(`${o.titulo}\n${o.descripcion}`).join(", ") || "(ninguna)"}`);
  console.log(`  publicada:   ${o.publicadaEn?.toISOString().slice(0, 10) ?? "(sin fecha)"}`);
  console.log(`  texto:       ${corto(o.descripcion.replace(/\s+/g, " "), 200)}`);
}
console.log("");
