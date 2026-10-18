import { AREAS } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import type { Locale } from "@/i18n/routing";

// Página provisional. Se sustituye por el listado de ofertas cuando el equipo
// de diseño tenga las pantallas aprobadas.
export default function Inicio({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        {t("inicio.etiqueta")}
      </p>
      <h1 className="text-4xl font-bold leading-tight">{t("inicio.titulo")}</h1>
      <p className="text-lg text-white/70">{t("inicio.descripcion")}</p>
      <ul className="flex flex-wrap gap-2" aria-label={t("inicio.areas")}>
        {AREAS.map((area) => (
          <li
            key={area}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm"
          >
            {t(`areas.${area}`)}
          </li>
        ))}
      </ul>
    </main>
  );
}
