import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LANDING_URL, sitio } from "@/lib/sitio";
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
 * - A la derecha, idioma, el botón del Discord y la cuenta. En el móvil, el menú, el idioma y
 *   el Discord van en la hamburguesa.
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
          <BotonDiscord etiqueta={t("discord")} className="hidden min-[76rem]:inline-flex" />
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
              <BotonDiscord etiqueta={t("discord")} className="inline-flex w-full justify-center" />
            </div>
          </MenuMovil>
        </div>
      </CabeceraFlotante>
    </header>
  );
}

/** "Discord": al servidor de la comunidad (como el botón de la landing). */
function BotonDiscord({ etiqueta, className }: { etiqueta: string; className?: string }) {
  return (
    <a href={sitio.discord} className={`min-h-11 items-center gap-2 rounded-full bg-acento px-4 text-sm font-bold text-ink hover:brightness-105 ${className ?? ""}`}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.7 19.7 0 0 0 6 3l1.3-2a12.7 12.7 0 0 1-2-1l.5-.4a14 14 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.6 19.6 0 0 0 6-3c.5-5.2-.9-9.8-3.6-13.8ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
      </svg>
      {etiqueta}
    </a>
  );
}
