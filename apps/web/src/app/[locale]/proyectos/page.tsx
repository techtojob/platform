import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense, use } from "react";
import { ListadoProyectos } from "@/components/proyectos/listado-proyectos";
import { Portada, Resaltado } from "@/components/sitio/portada";
import { Aviso, clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { obtenerCuenta } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[locale]/proyectos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "proyectos" });
  return { title: `${t("titulo")} – TechToJob`, description: t("entradilla") };
}

/** Proyectos de la comunidad: lo que ha construido la gente, con me gusta y rankings. */
export default function PaginaProyectos({ params, searchParams }: PageProps<"/[locale]/proyectos">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations();

  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("proyectos.titulo") }]}
        titulo={t.rich("proyectos.portadaTitulo", { resaltado: (texto) => <Resaltado>{texto}</Resaltado> })}
        entradilla={t("proyectos.entradilla")}
        lado={
          <Suspense fallback={null}>
            <PostitSubir />
          </Suspense>
        }
      />

      <section className="rejilla flex-1 px-[var(--margen)] py-10 sm:py-14">
        <div className="mx-auto max-w-[80rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[32rem] animate-pulse rounded-tarjeta bg-tarjeta/60" />}>
            <ListadoProyectos searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

/** El post-it de la portada: sube tu proyecto. */
async function PostitSubir() {
  const [t, cabeceras] = await Promise.all([getTranslations("proyectos"), headers()]);
  const cuenta = await obtenerCuenta(cabeceras.get("cookie")).catch(() => null);
  return (
    <Aviso giro="rotate-[2deg]" className="w-[21rem] p-7">
      <p className="text-xl font-bold leading-tight tracking-tight">{t("postitTitulo")}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{t("postitTexto")}</p>
      <Link href={cuenta ? "/cuenta/proyectos/nuevo" : "/entrar"} className={clasesBoton({ variante: "sobrePostit", className: "mt-5" })}>
        {t("subir")}
      </Link>
    </Aviso>
  );
}
