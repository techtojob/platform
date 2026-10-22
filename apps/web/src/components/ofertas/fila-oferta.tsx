import { TECNOLOGIAS, type OfertaListado } from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { MenuTarjeta } from "@/components/reportar/menu-tarjeta";
import { AvatarBlob, Etiqueta } from "@/components/ui";
import { getPathname, Link } from "@/i18n/navigation";
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
  menu,
}: {
  oferta: OfertaListado;
  ahora: number;
  /** Con el menú "⋯" (copiar enlace y reportar). En la vista previa del staff, sin él. */
  menu?: { conSesion: boolean };
}) {
  const t = useTranslations();
  const locale = useLocale();
  const ruta = { pathname: "/ofertas/[slug]" as const, params: { slug: slugDeOferta(oferta) } };
  const format = useFormatter();
  const lugar = useLugarCorto(oferta);
  const salario = useSalario(oferta);
  const publicada = new Date(oferta.publicadaEn);
  const nueva = ahora - publicada.getTime() < UN_DIA;

  return (
    // @container: la tarjeta se coloca según su propio ancho (en el listado o en la vista previa del staff).
    <div className="relative @container">
      <div
        className={`group relative grid ${menu ? "pr-16 @xl:pr-16" : ""} grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-tarjeta border border-borde bg-tarjeta p-4 text-texto shadow-tarjeta transition hover:-translate-y-0.5 hover:border-acento/60 hover:bg-tarjeta-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 @xl:grid-cols-[auto_minmax(0,1fr)_auto] @xl:p-5`}
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
          {/* El enlace se estira por toda la tarjeta; el menú "⋯" va por encima. */}
          <Link
            href={ruta}
            lang={oferta.idioma}
            className="text-titulo-3 font-bold after:absolute after:inset-0 after:rounded-tarjeta group-hover:text-enlace group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4"
          >
            {oferta.titulo}
          </Link>
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
      </div>
      {menu && (
        <MenuTarjeta
          className="!absolute right-3 top-3"
          enlace={getPathname({ href: ruta, locale })}
          conSesion={menu.conSesion}
          cosas={[{ tipo: "oferta", id: oferta.id }]}
        />
      )}
    </div>
  );
}
