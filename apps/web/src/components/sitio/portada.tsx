import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { LANDING_URL } from "@/lib/sitio";

type Miga = { texto: string; href?: "/" | "/staff" | "/talento" | "/cuenta/ajustes" | "/cuenta/ofertas" };

/**
 * Cabecera grande de cada página, como las páginas interiores de la landing (PageHero):
 * migas (Inicio / Empleo / …), título enorme y entradilla, sobre el degradado con brillo turquesa.
 * `lado` va a la derecha en el ordenador (un post-it, una tarjeta…).
 */
export async function Portada({
  migas,
  titulo,
  entradilla,
  children,
  lado,
  tituloLang,
  antesDelTitulo,
  compacta = false,
}: {
  migas: Miga[];
  titulo: ReactNode;
  entradilla?: ReactNode;
  children?: ReactNode;
  lado?: ReactNode;
  tituloLang?: string;
  /** Algo entre las migas y el título (la empresa de una oferta). */
  antesDelTitulo?: ReactNode;
  compacta?: boolean;
}) {
  const t = await getTranslations("navegacion");
  const todas = [{ texto: t("inicio"), externo: LANDING_URL }, ...migas.map((m) => ({ ...m, externo: undefined }))];

  return (
    <section
      className={cn(
        "fondo-portada relative isolate -mt-[4.25rem] overflow-hidden px-[var(--margen)] pt-[calc(4.25rem+clamp(2rem,5vw,4rem))] min-[50rem]:-mt-[5.25rem] min-[50rem]:pt-[calc(5.25rem+clamp(2rem,5vw,4rem))]",
        compacta ? "pb-10" : "pb-[clamp(3rem,6vw,5rem)]",
      )}
    >
      {/* Los círculos finos del fondo de la landing */}
      <div
        aria-hidden="true"
        className="absolute -right-40 -top-40 -z-10 hidden size-[42rem] rounded-full border border-borde before:absolute before:inset-[12%] before:rounded-full before:border before:border-borde before:content-[''] after:absolute after:inset-[26%] after:rounded-full after:border after:border-borde after:content-[''] lg:block"
      />
      <div className="mx-auto grid max-w-[80rem] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col items-start">
          <nav aria-label={t("migas")}>
            <ol className="flex flex-wrap items-center gap-x-2 text-sm font-bold text-suave">
              {todas.map((miga, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {i === todas.length - 1 ? (
                    <span aria-current="page" className="inline-flex min-h-11 items-center text-enlace">
                      {miga.texto}
                    </span>
                  ) : miga.externo ? (
                    <a href={miga.externo} className="inline-flex min-h-11 items-center transition-colors hover:text-enlace">
                      {miga.texto}
                    </a>
                  ) : (
                    <Link href="/" className="inline-flex min-h-11 items-center transition-colors hover:text-enlace">
                      {miga.texto}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {antesDelTitulo && <div className="mt-3">{antesDelTitulo}</div>}
          <h1 lang={tituloLang} className="mt-2 max-w-[20ch] text-balance text-titulo-1 font-bold">
            {titulo}
          </h1>
          {entradilla && <div className="mt-5 max-w-[58ch] text-lg leading-relaxed text-suave">{entradilla}</div>}
          {children}
        </div>
        {lado && <div className="hidden lg:block">{lado}</div>}
      </div>
    </section>
  );
}

/**
 * Una palabra rodeada con el círculo dibujado a mano de la landing. Se pinta con una máscara
 * para que se estire a lo ancho de la palabra y tome el color del texto (blanco u oscuro según el modo).
 */
export function Resaltado({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[52%] h-[118%] w-[114%] -translate-x-1/2 -translate-y-1/2 -rotate-2 bg-current [mask:url('/empleo-recursos/circle_highlight.svg')_center/100%_100%_no-repeat]"
      />
      <span className="relative">{children}</span>
    </span>
  );
}
