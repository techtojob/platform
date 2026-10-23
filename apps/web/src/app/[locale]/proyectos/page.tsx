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
import { miPortfolioEnApi, obtenerCuenta } from "@/lib/api";
import { metadatos } from "@/lib/metadatos";

export async function generateMetadata({ params }: PageProps<"/[locale]/proyectos">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "proyectos" });
  return metadatos({ titulo: `${t("titulo")} – TechToJob`, descripcion: t("entradilla"), href: "/proyectos", locale });
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
            <PostitSubir searchParams={searchParams} />
          </Suspense>
        }
      >
        {/* En el móvil no se ve el post-it: los mismos botones, debajo del título. */}
        <div className="mt-6 lg:hidden">
          <Suspense fallback={null}>
            <BotonesSubir searchParams={searchParams} />
          </Suspense>
        </div>
      </Portada>

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

type Busqueda = PageProps<"/[locale]/proyectos">["searchParams"];

/**
 * A dónde llevan "Subir un proyecto" y "Poner mi portfolio" (los dos viven en Mis proyectos).
 * Sin sesión, a entrar y de vuelta a Mis proyectos. En la vista de portfolios, el portfolio va primero.
 */
async function destinos(searchParams: Busqueda) {
  const [cabeceras, { ver }] = await Promise.all([headers(), searchParams]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  const portfolio = cuenta && cookie ? await miPortfolioEnApi(cookie).catch(() => null) : null;
  return {
    verPortfolios: ver === "portfolios",
    tienePortfolio: !!portfolio,
    proyecto: cuenta ? ("/cuenta/proyectos/nuevo" as const) : { pathname: "/entrar" as const, query: { volver: "proyectos" } },
    portfolio: cuenta ? { pathname: "/cuenta/proyectos" as const, hash: "portfolio" } : { pathname: "/entrar" as const, query: { volver: "proyectos" } },
  };
}

async function BotonesSubir({ searchParams, sobrePostit = false }: { searchParams: Busqueda; sobrePostit?: boolean }) {
  const [t, d] = await Promise.all([getTranslations("proyectos"), destinos(searchParams)]);
  const proyecto = (
    <Link key="proyecto" href={d.proyecto} className={clasesBoton({ variante: sobrePostit ? (d.verPortfolios ? "sobreAcento" : "sobrePostit") : d.verPortfolios ? "secundario" : "primario" })}>
      {t("subir")}
    </Link>
  );
  const portfolio = (
    <Link key="portfolio" href={d.portfolio} className={clasesBoton({ variante: sobrePostit ? (d.verPortfolios ? "sobrePostit" : "sobreAcento") : d.verPortfolios ? "primario" : "secundario" })}>
      {d.tienePortfolio ? t("cambiarPortfolio") : t("ponerPortfolio")}
    </Link>
  );
  return <div className="flex flex-wrap gap-2">{d.verPortfolios ? [portfolio, proyecto] : [proyecto, portfolio]}</div>;
}

/** El post-it de la portada: sube tu proyecto o pon tu portfolio. */
async function PostitSubir({ searchParams }: { searchParams: Busqueda }) {
  const t = await getTranslations("proyectos");
  return (
    <Aviso giro="rotate-[2deg]" className="w-[22rem] p-7">
      <p className="text-xl font-bold leading-tight tracking-tight">{t("postitTitulo")}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{t("postitTexto")}</p>
      <div className="mt-5">
        <BotonesSubir searchParams={searchParams} sobrePostit />
      </div>
    </Aviso>
  );
}
