import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense, use } from "react";
import { Portada, Resaltado } from "@/components/sitio/portada";
import { BuscadorTalento } from "@/components/talento/buscador-talento";
import { ListadoTalento } from "@/components/talento/listado-talento";
import { Aviso, clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { obtenerCuenta, obtenerMiPerfil } from "@/lib/api";

export async function generateMetadata({ params }: PageProps<"/[locale]/talento">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "talento" });
  return { title: `${t("titulo")} – TechToJob`, description: t("entradilla") };
}

/** Talento: perfiles de la comunidad, con buscador y filtros. */
export default function PaginaTalento({ params, searchParams }: PageProps<"/[locale]/talento">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations();

  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("talento.titulo") }]}
        titulo={t.rich("talento.portadaTitulo", { resaltado: (texto) => <Resaltado>{texto}</Resaltado> })}
        entradilla={t("talento.entradilla")}
        lado={
          <Suspense fallback={null}>
            <PostitMiPerfil />
          </Suspense>
        }
      >
        <div className="mt-8 w-full max-w-2xl">
          <BuscadorTalento />
        </div>
      </Portada>

      <section className="rejilla flex-1 px-[var(--margen)] py-10 sm:py-14">
        <div className="mx-auto max-w-[80rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[32rem] animate-pulse rounded-tarjeta bg-tarjeta/60" />}>
            <ListadoTalento searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

/** El post-it de la portada: crea tu perfil (o edítalo, si ya lo tienes). */
async function PostitMiPerfil() {
  const [t, cabeceras] = await Promise.all([getTranslations("talento"), headers()]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  const tengo = cuenta && cookie ? !!(await obtenerMiPerfil(cookie).catch(() => null))?.perfil : false;
  return (
    <Aviso giro="rotate-[2deg]" className="w-[21rem] p-7">
      <p className="text-xl font-bold leading-tight tracking-tight">{tengo ? t("postitTienes") : t("postitTitulo")}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{tengo ? t("postitTienesTexto") : t("postitTexto")}</p>
      <Link href={cuenta ? "/cuenta/perfil" : "/entrar"} className={clasesBoton({ variante: "sobrePostit", className: "mt-5" })}>
        {tengo ? t("editarMiPerfil") : t("crearMiPerfil")}
      </Link>
    </Aviso>
  );
}
