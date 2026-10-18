import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import { ListadoOfertas } from "@/components/ofertas/listado-ofertas";
import type { Locale } from "@/i18n/routing";

/** Inicio de la bolsa: el listado de ofertas. */
export default function Inicio({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations("ofertas");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-titulo-1 font-bold">{t("titulo")}</h1>
        <p className="max-w-[60ch] text-lg text-suave">{t("subtitulo")}</p>
      </header>

      {/* El listado depende de los idiomas de cada persona y de los filtros: se carga en cada visita. */}
      <Suspense fallback={<p className="text-suave">{t("cargando")}</p>}>
        <ListadoOfertas searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
