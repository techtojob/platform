"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LANDING_URL } from "@/lib/sitio";
import { useDesplegable } from "@/lib/use-desplegable";

/**
 * El menú de TechToJob: el mismo en la bolsa (techtojob.com/empleo) y en la landing (techtojob.com),
 * en dos grupos para que se vea a dónde lleva cada cosa:
 * - Empleo: Ofertas, Talento y Proyectos (la bolsa).
 * - Comunidad ▾: ¿Qué es TechToJob? (la portada), Torneos, Noticias, Para empresas y Quiénes somos (la landing).
 * Para añadir una entrada: aquí, en la landing (components/site-header.tsx) y su texto en messages.
 */
const DE_LA_BOLSA = [
  { clave: "ofertas", href: "/", activa: (ruta: string) => ruta === "/" || ruta.startsWith("/ofertas") },
  { clave: "talento", href: "/talento", activa: (ruta: string) => ruta.startsWith("/talento") },
  { clave: "proyectos", href: "/proyectos", activa: (ruta: string) => ruta.startsWith("/proyectos") },
] as const;
/** De la landing (en español: la landing solo tiene español). */
const COMUNIDAD = [
  { clave: "queEs", href: `${LANDING_URL}/` },
  { clave: "torneos", href: `${LANDING_URL}/torneos` },
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
  const empleo = DE_LA_BOLSA.map(({ clave, href, activa }) => {
    const actual = ruta !== null && activa(ruta);
    return (
      <li key={clave}>
        <Link href={href} aria-current={actual ? "page" : undefined} className={clase(actual)}>
          {t(clave)}
        </Link>
      </li>
    );
  });

  if (movil) {
    // En la hamburguesa, los dos grupos con su título.
    const titulo = "px-4 pb-1 pt-3 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-suave";
    return (
      <div className="grid gap-1">
        <p className={titulo}>{t("grupoEmpleo")}</p>
        <ul className="grid gap-1">{empleo}</ul>
        <p className={`${titulo} mt-1 border-t border-borde`}>{t("grupoComunidad")}</p>
        <ul className="grid gap-1">
          {COMUNIDAD.map(({ clave, href }) => (
            <li key={clave}>
              <a href={href} className={clase(false)}>
                {t(clave)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="flex items-center gap-7">
      {empleo}
      <li aria-hidden="true" className="h-6 w-px bg-borde-fuerte" />
      <li>
        <Comunidad />
      </li>
    </ul>
  );
}

/** "Comunidad ▾": las páginas de la landing (techtojob.com), cada una con una línea de qué es. */
function Comunidad() {
  const t = useTranslations("navegacion");
  const { abierto, setAbierto, raiz, boton } = useDesplegable();
  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-comunidad"
        onClick={() => setAbierto((a) => !a)}
        className="inline-flex items-center gap-1 py-2 text-sm font-bold transition-colors hover:text-enlace"
      >
        {t("grupoComunidad")}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${abierto ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id="menu-comunidad"
        inert={!abierto}
        className={`absolute left-1/2 top-[calc(100%+0.75rem)] z-20 w-80 -translate-x-1/2 rounded-2xl border border-borde bg-fondo p-2 shadow-tarjeta transition duration-200 motion-reduce:transition-none ${abierto ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <p className="px-4 pb-1 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-suave">techtojob.com</p>
        <ul className="grid gap-0.5">
          {COMUNIDAD.map(({ clave, href }) => (
            <li key={clave}>
              <a href={href} className="group/opcion block rounded-xl px-4 py-2.5 hover:bg-hover">
                <span className="block text-sm font-bold group-hover/opcion:text-enlace">{t(clave)}</span>
                <span className="block text-xs leading-snug text-suave">{t(`ayuda.${clave}`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
