import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { FichaOferta } from "@/components/ofertas/ficha-oferta";
import { redirect } from "@/i18n/navigation";
import { obtenerOferta } from "@/lib/api";
import { COOKIE_HABLO, idiomasDelUsuario } from "@/lib/idiomas-usuario";
import { separarSlug, slugDeOferta } from "@/lib/ofertas";

type Props = PageProps<"/[locale]/ofertas/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const oferta = await obtenerOferta(separarSlug(slug).id);
  if (!oferta) return {};
  return {
    title: `${oferta.titulo} · ${oferta.empresa.nombre} – TechToJob`,
    description: oferta.resumen ?? undefined,
  };
}

/** Página de una oferta: /empleo/ofertas/<slug>-<id> o /jobs/offers/<slug>-<id>. */
export default function PaginaOferta({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12">
      {/* La oferta se pide en cada visita: así siempre sale la versión revisada por el staff. */}
      <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-tarjeta bg-white/5" />}>
        <CargarOferta params={params} />
      </Suspense>
    </main>
  );
}

async function CargarOferta({ params }: Pick<Props, "params">) {
  const [{ slug }, locale, almacen, cabeceras] = await Promise.all([params, getLocale(), cookies(), headers()]);
  const oferta = await obtenerOferta(separarSlug(slug).id);
  if (!oferta) notFound();

  // Si el título cambió o el enlace está mal escrito, a la dirección buena.
  const correcto = slugDeOferta(oferta);
  if (slug !== correcto) {
    redirect({ href: { pathname: "/ofertas/[slug]", params: { slug: correcto } }, locale });
  }

  // Idiomas que pide y que la persona no ha marcado: se le avisa, pero puede verla.
  const hablo = idiomasDelUsuario({
    cookie: almacen.get(COOKIE_HABLO)?.value,
    acceptLanguage: cabeceras.get("accept-language"),
    idiomaWeb: locale,
  });
  const faltan = oferta.idiomasRequeridos.map((r) => r.idioma).filter((i) => !hablo.includes(i));

  return <FichaOferta oferta={oferta} faltan={faltan} />;
}
