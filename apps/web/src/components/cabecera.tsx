import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { LANDING_URL, SECCIONES_LANDING } from "@/lib/sitio";
import { MenuCuenta, MenuCuentaCargando } from "./cuenta/menu-cuenta";
import { SelectorIdioma } from "./selector-idioma";
import { CabeceraFlotante } from "./sitio/cabecera-flotante";
import { MenuMovil } from "./sitio/menu-movil";
import { BotonTema } from "./tema/boton-tema";

type T = Awaited<ReturnType<typeof getTranslations<"navegacion">>>;

/** Menú: "Empleo" (esta web) y las secciones de la landing. */
function Navegacion({ t, movil = false }: { t: T; movil?: boolean }) {
  const clase = movil
    ? "block rounded-xl px-4 py-3 text-base font-bold transition-colors hover:bg-hover hover:text-enlace"
    : "text-sm font-bold transition-colors hover:text-enlace";
  return (
    <ul className={movil ? "grid gap-1" : "flex items-center gap-6"}>
      <li>
        <Link href="/" aria-current="page" className={`${clase} text-enlace`}>
          {t("empleo")}
        </Link>
      </li>
      {SECCIONES_LANDING.map(([clave, ruta]) => (
        <li key={clave}>
          <a href={`${LANDING_URL}${ruta}`} className={clase}>
            {t(clave)}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Cabecera de todas las páginas: la misma de la landing (logo y menú), y a la derecha
 * idioma, modo claro/oscuro y cuenta.
 */
export async function Cabecera() {
  const t = await getTranslations("navegacion");
  return (
    <header className="sticky inset-x-0 top-0 z-50 px-[var(--margen)]">
      <CabeceraFlotante>
        <a href={LANDING_URL} className="flex w-fit items-center" aria-label="TechToJob">
          <Image
            src="/images/brand-logo.svg"
            alt=""
            width={140}
            height={78}
            unoptimized
            priority
            className="h-11 w-auto min-[50rem]:h-14"
          />
        </a>
        <nav className="hidden justify-self-center min-[64rem]:block" aria-label={t("principal")}>
          <Navegacion t={t} />
        </nav>
        <div className="col-start-3 flex items-center justify-end gap-1">
          <SelectorIdioma />
          <BotonTema />
          {/* Depende de la sesión de cada persona: se carga en cada visita. */}
          <Suspense fallback={<MenuCuentaCargando />}>
            <MenuCuenta />
          </Suspense>
          <MenuMovil etiqueta={t("abrir")}>
            <nav aria-label={t("principal")}>
              <Navegacion t={t} movil />
            </nav>
          </MenuMovil>
        </div>
      </CabeceraFlotante>
    </header>
  );
}
