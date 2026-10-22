"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LANDING_URL } from "@/lib/sitio";
import { useDesplegable } from "@/lib/use-desplegable";

/**
 * El menú de TechToJob: el mismo en la bolsa (techtojob.com/empleo) y en la landing (techtojob.com),
 * para que se vea como una sola web. Para añadir una entrada: aquí, en la landing
 * (components/site-header.tsx) y su texto en messages.
 */
const DE_LA_BOLSA = [
  { clave: "ofertas", href: "/", activa: (ruta: string) => ruta === "/" || ruta.startsWith("/ofertas") },
  { clave: "talento", href: "/talento", activa: (ruta: string) => ruta.startsWith("/talento") },
  { clave: "proyectos", href: "/proyectos", activa: (ruta: string) => ruta.startsWith("/proyectos") },
] as const;
/** De la landing (en español: la landing solo tiene español). */
const TORNEOS = `${LANDING_URL}/torneos`;
const MAS = [
  { clave: "noticias", href: `${LANDING_URL}/noticias` },
  { clave: "paraEmpresas", href: `${LANDING_URL}/empresas` },
  { clave: "quienesSomos", href: `${LANDING_URL}/quienes-somos` },
] as const;

/** Marca la sección en la que se está; eso depende de la dirección, así que mientras tanto se ve sin marcar. */
export function NavBolsa({ movil = false }: { movil?: boolean }) {
  return (
    <Suspense fallback={<Lista movil={movil} ruta={null} />}>
      <ConRuta movil={movil} />
    </Suspense>
  );
}

function ConRuta({ movil }: { movil: boolean }) {
  return <Lista movil={movil} ruta={usePathname()} />;
}

const claseOrdenador = (actual: boolean) =>
  `relative py-2 text-sm font-bold transition-colors hover:text-enlace ${actual ? "text-enlace after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-acento" : ""}`;
const claseMovil = (actual: boolean) => `block rounded-xl px-4 py-3 text-base font-bold transition-colors hover:bg-hover hover:text-enlace ${actual ? "bg-hover text-enlace" : ""}`;

function Lista({ movil, ruta }: { movil: boolean; ruta: string | null }) {
  const t = useTranslations("navegacion");
  const clase = movil ? claseMovil : claseOrdenador;
  return (
    <ul className={movil ? "grid gap-1" : "flex items-center gap-7"}>
      {DE_LA_BOLSA.map(({ clave, href, activa }) => {
        const actual = ruta !== null && activa(ruta);
        return (
          <li key={clave}>
            <Link href={href} aria-current={actual ? "page" : undefined} className={clase(actual)}>
              {t(clave)}
            </Link>
          </li>
        );
      })}
      <li>
        <a href={TORNEOS} className={clase(false)}>
          {t("torneos")}
        </a>
      </li>
      {movil ? (
        MAS.map(({ clave, href }) => (
          <li key={clave}>
            <a href={href} className={clase(false)}>
              {t(clave)}
            </a>
          </li>
        ))
      ) : (
        <li>
          <Mas />
        </li>
      )}
    </ul>
  );
}

/** "Más ▾": Noticias, Para empresas y Quiénes somos (páginas de la landing). */
function Mas() {
  const t = useTranslations("navegacion");
  const { abierto, setAbierto, raiz, boton } = useDesplegable();
  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-mas"
        onClick={() => setAbierto((a) => !a)}
        className="inline-flex items-center gap-1 py-2 text-sm font-bold transition-colors hover:text-enlace"
      >
        {t("mas")}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${abierto ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul
        id="menu-mas"
        inert={!abierto}
        className={`absolute left-1/2 top-[calc(100%+0.75rem)] z-20 grid min-w-52 -translate-x-1/2 gap-1 rounded-2xl border border-borde bg-fondo p-2 shadow-tarjeta transition duration-200 motion-reduce:transition-none ${abierto ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        {MAS.map(({ clave, href }) => (
          <li key={clave}>
            <a href={href} className="block rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-hover hover:text-enlace">
              {t(clave)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
