import type { PortfolioListado } from "@techtojob/shared";
import { useFormatter, useTranslations } from "next-intl";
import { MenuTarjeta } from "@/components/reportar/menu-tarjeta";
import { AvatarPerfil } from "@/components/talento/avatar-perfil";
import { Link } from "@/i18n/navigation";
import { BotonMegusta } from "./boton-megusta";
import { PortadaProyecto } from "./portada-proyecto";

type Props = {
  portfolio: PortfolioListado;
  conSesion: boolean;
  puesto?: number;
  periodo?: string;
  /** En su propio perfil no hace falta repetir quién es. */
  sinAutor?: boolean;
};

/**
 * Un portfolio: la imagen de la web (si tiene), de quién es, su dirección, si pasó por
 * "Tu portfolio a juicio" (con el vídeo) y me gusta. La imagen y la dirección abren la web.
 */
export function TarjetaPortfolio({
  portfolio: p,
  conSesion,
  puesto,
  periodo,
  sinAutor = false,
}: Props) {
  const t = useTranslations("portfolios");
  const format = useFormatter();
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-tarjeta border border-borde bg-tarjeta text-texto shadow-tarjeta">
      <div className="relative">
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="group relative block"
          tabIndex={-1}
          aria-hidden="true"
        >
          <PortadaProyecto
            portada={p.imagen}
            titulo={p.dominio}
            area={p.autor.area}
            className="border-b border-borde transition group-hover:brightness-110"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {puesto !== undefined && puesto <= 3 && (
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-postit px-2 text-sm font-bold text-ink shadow-tarjeta">
                #{puesto}
              </span>
            )}
            {p.oculto && (
              <span className="rounded-full bg-peligro px-3 py-1 text-xs font-bold text-fondo shadow-tarjeta">
                {t("oculto")}
              </span>
            )}
          </div>
        </a>
        <MenuTarjeta
          className="!absolute right-3 top-3"
          enlace={p.url}
          conSesion={conSesion}
          cosas={p.esMio ? [] : [{ tipo: "portfolio", id: p.alias }]}
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {!sinAutor && (
          <Link
            href={{ pathname: "/talento/[alias]", params: { alias: p.alias } }}
            className="group flex min-w-0 items-center gap-3"
          >
            <AvatarPerfil
              nombre={p.autor.nombre}
              imagen={p.autor.imagen}
              disponibilidad={p.autor.disponibilidad}
              tamano={44}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-titulo-3 font-bold leading-tight group-hover:text-enlace group-hover:underline">
                {p.autor.nombre}
              </span>
              <span className="truncate text-sm text-suave">
                {p.autor.titular}
              </span>
            </span>
          </Link>
        )}
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex max-w-full items-center gap-1.5 self-start font-bold text-enlace hover:underline"
        >
          {/* Un dominio largo se corta con "…" en vez de ensanchar la tarjeta (en el móvil se salía). */}
          <span className="truncate">{p.dominio}</span>
          <svg
            className="shrink-0"
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
          <span className="sr-only">{t("abreOtraWeb")}</span>
        </a>
        {p.descripcion && (
          <p className="line-clamp-3 text-sm leading-relaxed text-suave">
            {p.descripcion}
          </p>
        )}
        {p.juicio.estado === "revisado" && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-postit px-3 py-2 text-sm font-bold text-ink">
            <IconoJuicio />
            {t("revisado", {
              fecha: format.dateTime(new Date(p.juicio.revisadoEn), {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
            {p.juicio.video && (
              <a
                href={p.juicio.video}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {t("verVideo")}
              </a>
            )}
          </p>
        )}
        <div className="mt-auto flex items-center justify-end gap-2 pt-2">
          {p.megustaPeriodo !== undefined && periodo && (
            <span className="text-xs font-bold text-suave">
              {t("enPeriodo", { count: p.megustaPeriodo, periodo })}
            </span>
          )}
          <BotonMegusta
            tipo="portfolio"
            id={p.alias}
            megusta={p.megusta}
            meGusta={p.meGusta}
            conSesion={conSesion}
            esMio={p.esMio}
          />
        </div>
      </div>
    </article>
  );
}

/** La balanza de "Tu portfolio a juicio". */
export function IconoJuicio({ tamano = 16 }: { tamano?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18M7 21h10M5 7h14M12 5l-1-2h2ZM5 7l-3 7a3 3 0 0 0 6 0ZM19 7l-3 7a3 3 0 0 0 6 0Z" />
    </svg>
  );
}
