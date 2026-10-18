import type { OfertaListado } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { Tarjeta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { slugDeOferta } from "@/lib/ofertas";
import { EtiquetasOferta, IdiomasRequeridos, LugarYSalario } from "./datos-oferta";

/** Una oferta en el listado. Solo pinta: los datos llegan ya preparados del API. */
export function TarjetaOferta({ oferta }: { oferta: OfertaListado }) {
  const t = useTranslations();
  const format = useFormatter();

  return (
    <Tarjeta className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-bold text-suave">{oferta.empresa.nombre}</p>
        <p className="text-sm text-suave">
          {t("ofertas.publicada", { tiempo: format.relativeTime(new Date(oferta.publicadaEn)) })}
        </p>
      </div>

      <h2 className="text-titulo-3 font-bold" lang={oferta.idioma}>
        <Link
          href={{ pathname: "/ofertas/[slug]", params: { slug: slugDeOferta(oferta) } }}
          className="hover:text-enlace"
        >
          {oferta.titulo}
        </Link>
      </h2>

      {oferta.resumen && (
        <p className="max-w-[65ch] text-texto" lang={oferta.idioma}>
          {oferta.resumen}
        </p>
      )}

      <LugarYSalario oferta={oferta} />
      <EtiquetasOferta oferta={oferta} />
      <IdiomasRequeridos oferta={oferta} />
    </Tarjeta>
  );
}
