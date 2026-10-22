import { TECNOLOGIAS, type ProyectoListado } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { AvatarPerfil } from "@/components/talento/avatar-perfil";
import { Etiqueta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { slugDeProyecto } from "@/lib/filtros-proyectos";
import { BotonMegusta } from "./boton-megusta";
import { PortadaProyecto } from "./portada-proyecto";

const nombres = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));
const MAX_TECNOLOGIAS = 4;

type Props = {
  proyecto: ProyectoListado;
  conSesion: boolean;
  /** Puesto en el ranking (1, 2, 3…): solo en "Este mes" y "Tendencia". */
  puesto?: number;
  /** Qué significa `megustaPeriodo`: "este mes", "esta semana", "en septiembre"… */
  periodo?: string;
  /** En el perfil de su autor no hace falta repetir quién es. */
  sinAutor?: boolean;
};

/**
 * Un proyecto en la lista: portada, título, descripción corta, tecnologías, autor y me gusta.
 * Se pulsa entera (el título lleva el enlace y lo estira); el corazón y el autor van por encima.
 */
export function TarjetaProyecto({ proyecto: p, conSesion, puesto, periodo, sinAutor = false }: Props) {
  const t = useTranslations("proyectos");
  const sobran = p.tecnologias.length - MAX_TECNOLOGIAS;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-tarjeta border border-borde bg-tarjeta text-texto shadow-tarjeta transition hover:-translate-y-0.5 hover:border-acento/60 hover:bg-tarjeta-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative">
        <PortadaProyecto portada={p.portada} titulo={p.titulo} area={p.area} className="border-b border-borde" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {puesto !== undefined && puesto <= 3 && (
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-postit px-2 text-sm font-bold text-ink shadow-tarjeta">
              {t("puesto", { puesto })}
            </span>
          )}
          {p.fijado && sinAutor && <span className="rounded-full bg-acento px-3 py-1 text-xs font-bold text-ink shadow-tarjeta">{t("fijado")}</span>}
          {p.estado === "en_curso" && <span className="rounded-full bg-fondo/85 px-3 py-1 text-xs font-bold shadow-tarjeta">{t("estados.en_curso")}</span>}
          {p.oculto && <span className="rounded-full bg-peligro px-3 py-1 text-xs font-bold text-fondo shadow-tarjeta">{t("oculto")}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-titulo-3 font-bold leading-tight">
          <Link
            href={{ pathname: "/proyectos/[slug]", params: { slug: slugDeProyecto(p) } }}
            className="after:absolute after:inset-0 group-hover:text-enlace group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4"
          >
            {p.titulo}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-suave">{p.descripcion}</p>
        {p.tecnologias.length > 0 && (
          <p className="flex flex-wrap gap-1.5">
            {p.tecnologias.slice(0, MAX_TECNOLOGIAS).map((id) => (
              <Etiqueta key={id}>{nombres.get(id) ?? id}</Etiqueta>
            ))}
            {sobran > 0 && <Etiqueta>+{sobran}</Etiqueta>}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          {sinAutor ? (
            <span className="text-sm font-bold text-suave">{t(`estados.${p.estado}`)}</span>
          ) : (
            <Link
              href={{ pathname: "/talento/[alias]", params: { alias: p.autor.alias } }}
              className="relative z-10 flex min-w-0 items-center gap-2 rounded-full pr-2 text-sm font-bold hover:text-enlace hover:underline"
            >
              <AvatarPerfil nombre={p.autor.nombre} imagen={p.autor.imagen} disponibilidad={p.autor.disponibilidad} tamano={32} />
              <span className="truncate">{p.autor.nombre}</span>
            </Link>
          )}
          <span className="flex shrink-0 items-center gap-2">
            {p.megustaPeriodo !== undefined && periodo && (
              <span className="text-xs font-bold text-suave">{t("enPeriodo", { count: p.megustaPeriodo, periodo })}</span>
            )}
            <BotonMegusta id={p.id} megusta={p.megusta} meGusta={p.meGusta} conSesion={conSesion} esMio={p.esMio} />
          </span>
        </div>
      </div>
    </article>
  );
}
