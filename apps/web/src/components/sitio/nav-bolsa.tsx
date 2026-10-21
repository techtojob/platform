"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/i18n/navigation";

/** Secciones de la bolsa que salen en el menú. Para añadir una: aquí y su texto en messages. */
const SECCIONES = [
  { clave: "ofertas", href: "/", activa: (ruta: string) => ruta === "/" || ruta.startsWith("/ofertas") },
  { clave: "talento", href: "/talento", activa: (ruta: string) => ruta.startsWith("/talento") },
] as const;

/**
 * Menú de la bolsa (no el de la landing): Ofertas y Talento.
 * Marca la sección en la que se está; eso depende de la dirección, que solo se conoce
 * al visitar la página, así que mientras tanto se ve el menú sin marcar.
 */
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

function Lista({ movil, ruta }: { movil: boolean; ruta: string | null }) {
  const t = useTranslations("navegacion");
  return (
    <ul className={movil ? "grid gap-1" : "flex items-center gap-7"}>
      {SECCIONES.map(({ clave, href, activa }) => {
        const actual = ruta !== null && activa(ruta);
        return (
          <li key={clave}>
            <Link
              href={href}
              aria-current={actual ? "page" : undefined}
              className={
                movil
                  ? `block rounded-xl px-4 py-3 text-base font-bold transition-colors hover:bg-hover hover:text-enlace ${actual ? "bg-hover text-enlace" : ""}`
                  : `relative py-2 text-sm font-bold transition-colors hover:text-enlace ${actual ? "text-enlace after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-acento" : ""}`
              }
            >
              {t(clave)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
