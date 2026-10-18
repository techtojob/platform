import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SelectorIdioma } from "./selector-idioma";
import { BotonTema } from "./tema/boton-tema";

/** Cabecera de todas las páginas: logo, idioma y modo claro/oscuro. */
export function Cabecera() {
  const t = useTranslations("cabecera");
  return (
    <header className="border-b border-borde bg-superficie">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8">
        <Link href="/" className="mr-auto flex items-baseline gap-2 text-texto">
          <span className="font-titulo text-xl font-bold tracking-tight">TechToJob</span>
          <span className="hidden text-sm text-suave sm:inline">{t("seccion")}</span>
        </Link>
        <SelectorIdioma />
        <BotonTema />
      </div>
    </header>
  );
}
