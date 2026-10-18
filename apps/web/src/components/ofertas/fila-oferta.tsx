import { TECNOLOGIAS, type OfertaListado } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { Etiqueta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { slugDeOferta } from "@/lib/ofertas";
import { codigosIdiomas, useLugarCorto, useSalario } from "./datos-oferta";

const nombresTecnologias = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));
const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Una oferta en el listado: una fila compacta que se pulsa entera.
 * Título · empresa, lugar, modalidad y salario · tecnologías; a la derecha, fecha, idiomas y nivel.
 */
export function FilaOferta({ oferta, ahora }: { oferta: OfertaListado; ahora: number }) {
  const t = useTranslations();
  const format = useFormatter();
  const lugar = useLugarCorto(oferta);
  const publicada = new Date(oferta.publicadaEn);
  const nueva = ahora - publicada.getTime() < UN_DIA;
  const salario = useSalario(oferta);

  return (
    <Link
      href={{ pathname: "/ofertas/[slug]", params: { slug: slugDeOferta(oferta) } }}
      className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2 px-4 py-4 text-texto transition-colors hover:bg-hover sm:px-6"
    >
      <span className="flex min-w-0 items-baseline gap-2.5">
        {nueva && (
          <span className="size-2 shrink-0 -translate-y-0.5 self-center rounded-full bg-enlace">
            <span className="sr-only">{t("ofertas.nueva")}</span>
          </span>
        )}
        <span
          lang={oferta.idioma}
          className="font-titulo text-titulo-3 font-semibold group-hover:text-enlace group-hover:underline group-hover:underline-offset-4"
        >
          {oferta.titulo}
        </span>
      </span>
      <time dateTime={oferta.publicadaEn} className="whitespace-nowrap text-right text-sm text-suave">
        {format.relativeTime(publicada, ahora)}
      </time>

      <span className="col-span-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[0.9375rem] text-suave sm:col-span-1">
        <span className="font-medium text-texto">{oferta.empresa.nombre}</span>
        <span>{lugar}</span>
        {salario && <span className="font-semibold text-texto">{salario}</span>}
      </span>
      <span className="col-span-2 row-start-4 flex flex-wrap gap-1.5 sm:col-span-1 sm:col-start-2 sm:row-start-2 sm:justify-end">
        <Etiqueta tono="borde">
          <span className="sr-only">{t("ofertas.idiomas")}: </span>
          {codigosIdiomas(oferta)}
        </Etiqueta>
        <Etiqueta tono="postit">{t(`seniority.${oferta.seniority}`)}</Etiqueta>
      </span>

      {oferta.tecnologias.length > 0 && (
        <span className="col-span-2 flex flex-wrap gap-1.5 sm:col-span-1">
          {oferta.tecnologias.map((id) => (
            <Etiqueta key={id}>{nombresTecnologias.get(id) ?? id}</Etiqueta>
          ))}
        </span>
      )}
    </Link>
  );
}
