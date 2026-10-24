import { TECNOLOGIAS, type PerfilListado } from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { MenuTarjeta } from "@/components/reportar/menu-tarjeta";
import { Etiqueta } from "@/components/ui";
import { getPathname, Link } from "@/i18n/navigation";
import { AvatarPerfil } from "./avatar-perfil";
import { useLugarPerfil } from "./datos-perfil";
import { Emblemas, EtiquetaDisponibilidad, Verificado } from "./insignias";

const nombres = new Map<string, string>(TECNOLOGIAS.map((t) => [t.id, t.nombre]));
const MAX_TECNOLOGIAS = 6;

/**
 * Un perfil en el buscador de talento: foto o blob, nombre y verificado, titular, dónde,
 * disponibilidad, tecnologías, emblemas y los me gusta de sus proyectos. Se pulsa entera.
 * `enlace={false}`: solo para mirar (vista previa en "Mi perfil").
 */
export function TarjetaPerfil({ perfil, enlace = true, conSesion }: { perfil: PerfilListado; enlace?: boolean; conSesion?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const lugar = useLugarPerfil(perfil);
  const sobran = perfil.tecnologias.length - MAX_TECNOLOGIAS;
  const contenido = (
    <>
      <div className="flex items-start gap-4">
        <AvatarPerfil nombre={perfil.nombre} imagen={perfil.imagen} disponibilidad={perfil.disponibilidad} tamano={60} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {enlace ? (
              // El enlace se estira por toda la tarjeta (after:inset-0); el menú "⋯" va por encima.
              <Link
                href={{ pathname: "/talento/[alias]", params: { alias: perfil.alias } }}
                className="text-titulo-3 font-bold after:absolute after:inset-0 after:rounded-tarjeta group-hover:text-enlace group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4"
              >
                {perfil.nombre}
              </Link>
            ) : (
              <span className="text-titulo-3 font-bold">{perfil.nombre}</span>
            )}
            {perfil.verificado && <Verificado />}
          </p>
          <p className="font-bold text-texto/90">{perfil.titular}</p>
          {lugar && <p className="text-sm text-suave">{lugar}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <EtiquetaDisponibilidad disponibilidad={perfil.disponibilidad} />
        <Etiqueta tono="borde">
          {perfil.anosExperiencia
            ? t("talento.nivelConAnos", { nivel: t(`seniority.${perfil.seniority}`), anos: perfil.anosExperiencia })
            : t(`seniority.${perfil.seniority}`)}
        </Etiqueta>
        <Etiqueta tono="borde">{t(`areas.${perfil.area}`)}</Etiqueta>
        {perfil.otrasAreas.map((a) => (
          <Etiqueta key={a} tono="borde">
            {t(`areas.${a}`)}
          </Etiqueta>
        ))}
      </div>
      {perfil.tecnologias.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {perfil.tecnologias.slice(0, MAX_TECNOLOGIAS).map((id) => (
            <Etiqueta key={id}>{nombres.get(id) ?? id}</Etiqueta>
          ))}
          {sobran > 0 && <Etiqueta>+{sobran}</Etiqueta>}
        </p>
      )}
      <Emblemas emblemas={perfil.emblemas} />
      {perfil.megusta > 0 && (
        <p className="mt-auto flex items-center gap-1.5 text-sm font-bold text-suave">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-peligro">
            <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.6 4.5 7.2 4.5c2 0 3.5 1.1 4.8 2.8 1.3-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.6 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
          </svg>
          {t("talento.megustaProyectos", { count: perfil.megusta })}
        </p>
      )}
    </>
  );
  const clases =
    "group flex h-full flex-col gap-4 rounded-tarjeta border border-borde bg-tarjeta p-5 text-texto shadow-tarjeta transition hover:-translate-y-0.5 hover:border-acento/60 hover:bg-tarjeta-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  if (!enlace) return <div className={clases}>{contenido}</div>;
  return (
    <div className={`relative pr-14 ${clases}`}>
      {contenido}
      <MenuTarjeta
        className="!absolute right-3 top-3"
        enlace={getPathname({ href: { pathname: "/talento/[alias]", params: { alias: perfil.alias } }, locale })}
        conSesion={conSesion}
        cosas={[{ tipo: "perfil", id: perfil.alias }]}
      />
    </div>
  );
}
