import { setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import { ListadoOfertas } from "@/components/ofertas/listado-ofertas";
import type { Locale } from "@/i18n/routing";

/** Inicio de la bolsa: el listado de ofertas. */
export default function Inicio({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
      {/* El listado depende de los idiomas de cada persona, lo que busca y los filtros: se carga en cada visita. */}
      <Suspense fallback={<div aria-busy="true" className="h-[32rem] animate-pulse rounded-tarjeta bg-superficie" />}>
        <ListadoOfertas searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
