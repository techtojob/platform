import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LANDING_URL } from "@/lib/sitio";
import { MenuCuenta, MenuCuentaCargando } from "./cuenta/menu-cuenta";
import { SelectorIdioma } from "./selector-idioma";
import { CabeceraFlotante } from "./sitio/cabecera-flotante";
import { MenuMovil } from "./sitio/menu-movil";
import { NavBolsa } from "./sitio/nav-bolsa";

/**
 * Cabecera, con la píldora flotante de la landing y el MISMO menú que la landing
 * (Ofertas · Talento · Proyectos): para quien la usa, techtojob.com es una sola web.
 *
 * - El logo lleva a la portada (techtojob.com).
 * - A la derecha, idioma y la cuenta. En el móvil, el menú y el idioma van en la hamburguesa.
 * - Sin botón de Discord: ya está en el pie y en Mi cuenta (vincular Discord).
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
        </div>
        <nav className="hidden justify-self-center min-[64rem]:block" aria-label={t("principal")}>
          <NavBolsa />
        </nav>
        <div className="col-start-3 flex items-center justify-end gap-1">
          {/* En el móvil, el idioma va dentro de la hamburguesa para que quepa todo. */}
          <div className="hidden items-center gap-1 min-[64rem]:flex">
            <SelectorIdioma />
          </div>
          {/* Depende de la sesión de cada persona: se carga en cada visita. */}
          <Suspense fallback={<MenuCuentaCargando />}>
            <MenuCuenta />
          </Suspense>
          <MenuMovil etiqueta={t("abrir")}>
            <nav aria-label={t("principal")}>
              <NavBolsa movil />
            </nav>
            <div className="mt-2 flex flex-col gap-2 border-t border-borde px-2 pt-2">
              <SelectorIdioma />
            </div>
          </MenuMovil>
        </div>
      </CabeceraFlotante>
    </header>
  );
}
