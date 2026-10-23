"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * El menú de TechToJob: el mismo en la bolsa (techtojob.com/empleo) y en la landing (techtojob.com):
 * Ofertas, Talento y Proyectos. El logo lleva a la landing, y sus páginas (Torneos, Noticias…)
 * están en su portada y en su pie.
 * Para añadir una entrada: aquí, en la landing (components/site-header.tsx) y su texto en messages.
 */
const DE_LA_BOLSA = [
  { clave: "ofertas", href: "/", activa: (ruta: string) => ruta === "/" || ruta.startsWith("/ofertas") },
  { clave: "talento", href: "/talento", activa: (ruta: string) => ruta.startsWith("/talento") },
  { clave: "proyectos", href: "/proyectos", activa: (ruta: string) => ruta.startsWith("/proyectos") },
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

  return <ul className={movil ? "grid gap-1" : "flex items-center gap-7"}>{empleo}</ul>;
}
