import type { Metadata } from "next";
import { getLocale, getNow, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { FormularioOferta } from "@/components/staff/formulario/formulario-oferta";
import { Portada } from "@/components/sitio/portada";
import { clasesBoton, Tarjeta } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { misOfertasEnApi, obtenerCuenta } from "@/lib/api";
import { VALORES_VACIOS } from "@/lib/formulario-oferta";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Publicar una oferta: cualquiera con cuenta. Queda pendiente y la revisa el staff antes de salir.
 * Cada cuenta puede tener 3 a la vez (pendientes + publicadas).
 */
export default function PaginaPublicar() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[
          { texto: t("navegacion.empleo"), href: "/" },
          { texto: t("misOfertas.titulo"), href: "/cuenta/ofertas" },
          { texto: t("misOfertas.publicar") },
        ]}
        titulo={t("misOfertas.publicarTitulo")}
        entradilla={t("misOfertas.publicarEntradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[80rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[40rem] animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Formulario />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Formulario() {
  const [t, locale, cabeceras, ahora] = await Promise.all([getTranslations("misOfertas"), getLocale(), headers(), getNow()]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  if (!cuenta || !cookie) redirect({ href: { pathname: "/entrar", query: { volver: "publicar" } }, locale });
  const { limite, enMarcha } = await misOfertasEnApi(cookie!);

  if (enMarcha >= limite) {
    return (
      <Tarjeta className="mx-auto flex max-w-xl flex-col gap-4 p-6 sm:p-8">
        <p className="text-lg font-bold">{t("sinHuecoTitulo", { limite })}</p>
        <p className="text-suave">{t("sinHueco")}</p>
        <Link href="/cuenta/ofertas" className={clasesBoton({ className: "self-start" })}>
          {t("verMias")}
        </Link>
      </Tarjeta>
    );
  }
  // La oferta empieza con el país de la cuenta (si es de España o Latinoamérica).
  const inicial = { ...VALORES_VACIOS, ...(cuenta!.ubicacion && { pais: cuenta!.ubicacion.pais }) };
  return <FormularioOferta modo="usuario" empresas={[]} inicial={inicial} ofertaId={null} ahora={ahora.getTime()} />;
}
