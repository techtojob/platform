import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { LANDING_URL } from "@/lib/sitio";
import { MenuCuenta, MenuCuentaCargando } from "./cuenta/menu-cuenta";
import { SelectorIdioma } from "./selector-idioma";
import { CabeceraFlotante } from "./sitio/cabecera-flotante";
import { MenuMovil } from "./sitio/menu-movil";
import { NavBolsa } from "./sitio/nav-bolsa";
import { BotonTema } from "./tema/boton-tema";

/**
 * Cabecera de la bolsa, con la píldora flotante de la landing.
 *
 * - El logo lleva a la landing (techtojob.com); "Empleo", al inicio de la bolsa.
 * - En el centro, el menú de la bolsa (Ofertas, Talento), no el de la landing: la bolsa es
 *   una herramienta de TechToJob, no una copia de la landing. En el móvil, en la hamburguesa.
 * - A la derecha, idioma, modo claro/oscuro y cuenta (en el móvil, idioma y tema van en la hamburguesa).
 */
export async function Cabecera() {
  const t = await getTranslations("navegacion");
  return (
    <header className="sticky inset-x-0 top-0 z-50 px-[var(--margen)]">
      <CabeceraFlotante>
        <div className="flex items-center gap-3 min-[50rem]:gap-4">
          <a href={LANDING_URL} className="flex shrink-0 items-center" aria-label={t("irALanding")}>
            <Image
              src="/empleo-recursos/brand-logo.svg"
              alt=""
              width={140}
              height={78}
              unoptimized
              priority
              className="h-10 w-auto min-[50rem]:h-14"
            />
          </a>
          <span aria-hidden="true" className="h-8 w-px bg-borde-fuerte" />
          <Link href="/" className="text-base font-bold tracking-tight transition-colors hover:text-enlace min-[50rem]:text-lg">
            {t("empleo")}
          </Link>
        </div>
        <nav className="hidden justify-self-center min-[64rem]:block" aria-label={t("principal")}>
          <NavBolsa />
        </nav>
        <div className="col-start-3 flex items-center justify-end gap-1">
          {/* En el móvil, idioma y tema van dentro de la hamburguesa para que quepa todo. */}
          <div className="hidden items-center gap-1 min-[64rem]:flex">
            <SelectorIdioma />
            <BotonTema />
          </div>
          {/* Depende de la sesión de cada persona: se carga en cada visita. */}
          <Suspense fallback={<MenuCuentaCargando />}>
            <MenuCuenta />
          </Suspense>
          <MenuMovil etiqueta={t("abrir")}>
            <nav aria-label={t("principal")}>
              <NavBolsa movil />
            </nav>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-borde px-2 pt-2">
              <SelectorIdioma />
              <BotonTema />
            </div>
          </MenuMovil>
        </div>
      </CabeceraFlotante>
    </header>
  );
}
