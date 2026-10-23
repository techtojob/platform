import type { Metadata } from "next";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense, use } from "react";
import { ListadoOfertas } from "@/components/ofertas/listado-ofertas";
import { Portada, Resaltado } from "@/components/sitio/portada";
import { Aviso } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { metadatos } from "@/lib/metadatos";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return metadatos({ titulo: t("titulo"), descripcion: t("descripcion"), href: "/", locale });
}

/** Inicio de la bolsa: portada con el buscador y, debajo, el listado de ofertas. */
export default function Inicio({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations();

  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo") }]}
        titulo={t.rich("ofertas.portadaTitulo", { resaltado: (texto) => <Resaltado>{texto}</Resaltado> })}
        entradilla={t("ofertas.portadaTexto")}
        lado={<PostitRevision />}
      >
        <div className="mt-6 w-full max-w-2xl">
          {/* Para quien contrata: cualquiera con cuenta puede subir ofertas (las revisa el staff). */}
          <p className="mt-4 text-sm text-suave">
            {t.rich("ofertas.publicarLlamada", {
              enlace: (texto) => (
                <Link href="/cuenta/ofertas/nueva" className="font-bold text-enlace underline">
                  {texto}
                </Link>
              ),
            })}
          </p>
        </div>
      </Portada>

      <section className="rejilla flex-1 px-[var(--margen)] py-10 sm:py-14">
        <div className="mx-auto max-w-[80rem]">
          {/* El listado depende de los idiomas de cada persona, lo que busca y los filtros: se carga en cada visita. */}
          <Suspense fallback={<div aria-busy="true" className="h-[32rem] animate-pulse rounded-tarjeta bg-tarjeta/60" />}>
            <ListadoOfertas searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

/** El post-it de la portada: qué revisa el staff antes de publicar una oferta. */
function PostitRevision() {
  const t = useTranslations("ofertas.revision");
  return (
    <Aviso giro="rotate-[2deg]" className="w-[21rem] p-7">
      <p className="text-xl font-bold leading-tight tracking-tight">{t("titulo")}</p>
      <ul className="mt-4 grid gap-2.5">
        {(["empresa", "enlace", "idiomas", "salario"] as const).map((clave) => (
          <li key={clave} className="flex items-start gap-2.5 border-t border-ink/15 pt-2.5 text-sm font-bold">
            <Image src="/empleo-recursos/check.svg" alt="" width={22} height={26} unoptimized className="h-5 w-auto shrink-0" />
            {t(clave)}
          </li>
        ))}
      </ul>
    </Aviso>
  );
}
