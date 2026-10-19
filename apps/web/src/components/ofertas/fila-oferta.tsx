import { TECNOLOGIAS, type OfertaListado } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { AvatarBlob, Etiqueta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { slugDeOferta } from "@/lib/ofertas";
import { codigosIdiomas, useLugarCorto, useSalario } from "./datos-oferta";

const nombresTecnologias = new Map<string, string>(
  TECNOLOGIAS.map((t) => [t.id, t.nombre]),
);
const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Una oferta en el listado: una tarjeta que se pulsa entera.
 * Avatar de la empresa · empresa, título, lugar y salario, tecnologías · a la derecha, fecha, idiomas y nivel.
 */
export function FilaOferta({
  oferta,
  ahora,
}: {
  oferta: OfertaListado;
  ahora: number;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const lugar = useLugarCorto(oferta);
  const salario = useSalario(oferta);
  const publicada = new Date(oferta.publicadaEn);
  const nueva = ahora - publicada.getTime() < UN_DIA;

  return (
    // @container: la tarjeta se coloca según su propio ancho (en el listado o en la vista previa del staff).
    <div className="@container">
      <Link
        href={{
          pathname: "/ofertas/[slug]",
          params: { slug: slugDeOferta(oferta) },
        }}
        className="group grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-tarjeta border border-borde bg-tarjeta p-4 text-texto shadow-tarjeta transition hover:-translate-y-0.5 hover:border-acento/60 hover:bg-tarjeta-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 @xl:grid-cols-[auto_minmax(0,1fr)_auto] @xl:p-5"
      >
        <AvatarBlob
          nombre={oferta.empresa.nombre}
          tamano={48}
          className="row-span-2 mt-0.5"
        />

        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-suave">
            {oferta.empresa.nombre}
            {nueva && <Etiqueta tono="acento">{t("ofertas.nueva")}</Etiqueta>}
          </span>
          <span
            lang={oferta.idioma}
            className="text-titulo-3 font-bold group-hover:text-enlace group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4"
          >
            {oferta.titulo}
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-suave">
            <span>{lugar}</span>
            {salario && <span className="font-bold text-texto">{salario}</span>}
          </span>
        </span>

        <span className="col-start-2 flex flex-wrap items-center gap-1.5 @xl:col-start-3 @xl:row-start-1 @xl:flex-col @xl:items-end @xl:justify-between @xl:gap-2">
          <time
            dateTime={oferta.publicadaEn}
            className="order-last whitespace-nowrap text-xs font-bold text-suave @xl:order-first"
          >
            {format.relativeTime(publicada, ahora)}
          </time>
          <span className="flex flex-wrap gap-1.5 @xl:justify-end">
            <Etiqueta tono="borde">
              <span className="sr-only">{t("ofertas.idiomas")}: </span>
              {codigosIdiomas(oferta)}
            </Etiqueta>
            <Etiqueta tono="postit">
              {t(`seniority.${oferta.seniority}`)}
            </Etiqueta>
          </span>
        </span>

        {oferta.tecnologias.length > 0 && (
          <span className="col-start-2 flex flex-wrap gap-1.5 @xl:col-span-2">
            {oferta.tecnologias.map((id) => (
              <Etiqueta key={id}>{nombresTecnologias.get(id) ?? id}</Etiqueta>
            ))}
          </span>
        )}
      </Link>
    </div>
  );
}
