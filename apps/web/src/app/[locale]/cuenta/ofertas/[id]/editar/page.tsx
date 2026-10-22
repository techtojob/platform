import type { Metadata } from "next";
import { getLocale, getNow, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { FormularioOferta } from "@/components/staff/formulario/formulario-oferta";
import { Portada } from "@/components/sitio/portada";
import { Aviso, clasesBoton, Tarjeta } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { ErrorDeApi, obtenerCuenta, obtenerMiOfertaEnApi } from "@/lib/api";
import { valoresDeMiOferta } from "@/lib/formulario-oferta";

export const metadata: Metadata = { robots: { index: false } };

type Props = PageProps<"/[locale]/cuenta/ofertas/[id]/editar">;

/** Editar una oferta mía (recruiter): pendiente o publicada. */
export default function PaginaEditarMiOferta({ params, searchParams }: Props) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[
          { texto: t("navegacion.empleo"), href: "/" },
          { texto: t("misOfertas.titulo"), href: "/cuenta/ofertas" },
          { texto: t("misOfertas.editar") },
        ]}
        titulo={t("misOfertas.editarTitulo")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[80rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[40rem] animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Formulario params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Formulario({ params, searchParams }: Props) {
  const [{ id }, { copia }, t, locale, cabeceras, ahora] = await Promise.all([
    params,
    searchParams,
    getTranslations("misOfertas"),
    getLocale(),
    headers(),
    getNow(),
  ]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  if (!cuenta || !cookie) redirect({ href: { pathname: "/entrar", query: { volver: "ofertas" } }, locale });
  if (cuenta!.recruiter?.estado !== "activo") redirect({ href: "/cuenta/recruiter", locale });
  const oferta = await obtenerMiOfertaEnApi(cookie!, id).catch((e) => {
    if (e instanceof ErrorDeApi && e.estado === 404) return null;
    throw e;
  });
  if (!oferta) redirect({ href: "/cuenta/ofertas", locale });

  // Solo se editan las que están en marcha; las demás se vuelven a publicar (copia nueva).
  if (oferta!.estado !== "pendiente" && oferta!.estado !== "publicada") {
    return (
      <Tarjeta className="mx-auto flex max-w-xl flex-col gap-4 p-6 sm:p-8">
        <p className="text-lg font-bold">{t("noSeEdita")}</p>
        <Link href="/cuenta/ofertas" className={clasesBoton({ className: "self-start" })}>
          {t("verMias")}
        </Link>
      </Tarjeta>
    );
  }
  const recruiter = cuenta!.recruiter!;
  return (
    <div className="flex flex-col gap-6">
      {copia === "1" && (
        <Aviso role="status" chincheta={false} giro="">
          <p className="font-bold">{t("copiaCreada")}</p>
        </Aviso>
      )}
      <FormularioOferta
        modo="usuario"
        empresas={[]}
        inicial={valoresDeMiOferta(oferta!)}
        ofertaId={oferta!.id}
        ahora={ahora.getTime()}
        empresaFija={recruiter.agencia ? null : oferta!.empresa.nombre}
        estadoMio={oferta!.estado}
      />
    </div>
  );
}
