import type { Metadata } from "next";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Portada } from "@/components/sitio/portada";
import { Aviso, clasesBoton, Etiqueta } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { sitio } from "@/lib/sitio";

// Página provisional: no aparece en buscadores hasta que existan los perfiles.
export const metadata: Metadata = { robots: { index: false } };

/** Talento: los perfiles de la comunidad. De momento, qué serán y cómo prepararse. */
export default function PaginaTalento({ params }: PageProps<"/[locale]/talento">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations();
  const puntos = ["stack", "disponibilidad", "proyectos", "visibilidad"] as const;

  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("talento.titulo") }]}
        antesDelTitulo={<Etiqueta tono="acento">{t("talento.pronto")}</Etiqueta>}
        titulo={t("talento.titulo")}
        entradilla={t("talento.entradilla")}
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-14">
        <div className="mx-auto grid max-w-[80rem] gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div className="rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta sm:p-10">
            <h2 className="text-titulo-2 font-bold">{t("talento.que")}</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {puntos.map((p) => (
                <li key={p} className="flex items-start gap-3 border-t border-borde pt-3 font-bold">
                  <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-acento" />
                  {t(`talento.puntos.${p}`)}
                </li>
              ))}
            </ul>
          </div>
          <Aviso giro="rotate-[1.2deg]" className="p-7">
            <p className="text-xl font-bold leading-tight tracking-tight">{t("talento.mientras")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">{t("talento.mientrasTexto")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={sitio.discord} className={clasesBoton({ variante: "sobrePostit" })}>
                <Image src="/empleo-recursos/discord-light.svg" alt="" width={24} height={18} unoptimized className="h-4 w-auto" />
                {t("talento.discord")}
              </a>
              <Link href="/" className="inline-flex min-h-11 items-center px-3 text-sm font-bold underline decoration-2 underline-offset-4">
                {t("talento.verOfertas")}
              </Link>
            </div>
          </Aviso>
        </div>
      </section>
    </main>
  );
}
