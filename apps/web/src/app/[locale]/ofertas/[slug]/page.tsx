import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getNow } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { FichaOferta } from "@/components/ofertas/ficha-oferta";
import { getPathname, redirect } from "@/i18n/navigation";
import { jobPosting, jsonSeguro } from "@/lib/datos-google";
import { LANDING_URL } from "@/lib/sitio";
import { obtenerCuenta, obtenerOferta, obtenerOfertas, tieneCookieDeSesion } from "@/lib/api";
import { COOKIE_HABLO, idiomasDelUsuario } from "@/lib/idiomas-usuario";
import { COOKIE_DESDE, paisDelUsuario } from "@/lib/pais-usuario";
import { metadatos } from "@/lib/metadatos";
import { separarSlug, slugDeOferta } from "@/lib/ofertas";
import type { Locale } from "@/i18n/routing";

type Props = PageProps<"/[locale]/ofertas/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const oferta = await obtenerOferta(separarSlug(slug).id);
  if (!oferta) return {};
  return metadatos({
    titulo: `${oferta.titulo} · ${oferta.empresa.nombre} – TechToJob`,
    descripcion: oferta.resumen ?? undefined,
    // Con su dirección buena aunque se entre por otra (el slug viejo de un título cambiado).
    href: { pathname: "/ofertas/[slug]", params: { slug: slugDeOferta(oferta) } },
    locale: locale as Locale,
    tipo: "article",
  });
}

/** Página de una oferta: /empleo/ofertas/<slug>-<id> o /jobs/offers/<slug>-<id>. */
export default function PaginaOferta({ params }: Props) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      {/* La oferta se pide en cada visita: así siempre sale la versión revisada por el staff. */}
      <Suspense fallback={<div aria-busy="true" className="fondo-portada h-[36rem] animate-pulse" />}>
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

  // Idiomas que habla: para marcar "lo hablas" o avisar de los que no ha marcado (la puede ver igual).
  const hablo = idiomasDelUsuario({
    cookie: almacen.get(COOKIE_HABLO)?.value,
    acceptLanguage: cabeceras.get("accept-language"),
    idiomaWeb: locale,
  });

  // Desde qué país trabaja: para decirle si puede hacer esta oferta.
  const desde = paisDelUsuario({
    cookie: almacen.get(COOKIE_DESDE)?.value,
    paisPerfil: almacen.get(COOKIE_DESDE)?.value ? null : (await obtenerCuenta(cabeceras.get("cookie")).catch(() => null))?.pais,
    paisConexion: cabeceras.get("cf-ipcountry"),
  });

  // Ofertas parecidas: misma área, que la persona pueda hacer. Si fallan, la página sale igual.
  const parecidas = await obtenerOfertas({ idiomas: hablo, desde, areas: [oferta.area], limite: 4 })
    .then((r) => r.ofertas.filter((o) => o.id !== oferta.id).slice(0, 3))
    .catch(() => []);

  // Datos para Google for Jobs (solo si la empresa nos ha autorizado; ver lib/datos-google.ts).
  const google = jobPosting(oferta, `${LANDING_URL}${getPathname({ href: { pathname: "/ofertas/[slug]", params: { slug: correcto } }, locale })}`);

  return (
    <>
      {google && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonSeguro(google) }} />}
      <FichaOferta
        oferta={oferta}
        hablo={hablo}
        desde={desde}
        parecidas={parecidas}
        ahora={(await getNow()).getTime()}
        conSesion={tieneCookieDeSesion(cabeceras.get("cookie") ?? "")}
      />
    </>
  );
}
