import { AREAS } from "@techtojob/shared";

// Página provisional. Se sustituye por el listado de ofertas cuando el equipo
// de diseño tenga las pantallas aprobadas.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        TechToJob · Fase 0
      </p>
      <h1 className="text-4xl font-bold leading-tight">
        La bolsa de empleo tech está en construcción.
      </h1>
      <p className="text-lg text-white/70">
        Ofertas revisadas por el staff y perfiles de talento de la comunidad.
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Áreas">
        {AREAS.map((area) => (
          <li
            key={area.id}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm"
          >
            {area.nombre}
          </li>
        ))}
      </ul>
    </main>
  );
}
