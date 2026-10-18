import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Buscador } from "./buscador";
import { SelectorIdioma } from "./selector-idioma";
import { BotonTema } from "./tema/boton-tema";

/**
 * Cabecera de todas las páginas: logo, buscador, idioma y modo claro/oscuro.
 * En el móvil el buscador baja a su propia fila, a todo lo ancho.
 */
export function Cabecera() {
  const t = useTranslations("cabecera");
  return (
    <header className="border-b border-borde bg-superficie">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:h-16 sm:flex-nowrap sm:gap-6 sm:px-8 sm:py-0">
        <Link href="/" className="mr-auto flex items-baseline gap-2 text-texto sm:mr-0">
          <span className="font-titulo text-xl font-bold tracking-tight">TechToJob</span>
          <span className="hidden text-sm text-suave md:inline">{t("seccion")}</span>
        </Link>
        <div className="order-last w-full sm:order-none sm:w-auto sm:max-w-xl sm:flex-1">
          <Buscador />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <SelectorIdioma />
          <BotonTema />
        </div>
      </div>
    </header>
  );
}
