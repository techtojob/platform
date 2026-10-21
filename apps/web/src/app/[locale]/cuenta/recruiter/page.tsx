import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { FormularioRecruiter } from "@/components/cuenta/formulario-recruiter";
import { Portada } from "@/components/sitio/portada";
import { clasesBoton, Tarjeta } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { miRecruiterEnApi, obtenerCuenta } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Recruiter: solo los recruiters (y el staff) publican ofertas. Registrarse es al momento;
 * lo que revisa el staff es cada oferta. Aquí también se cambian los datos o se ve por qué está bloqueado.
 */
export default function PaginaRecruiter() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("recruiter.titulo") }]}
        titulo={t("recruiter.titulo")}
        entradilla={t("recruiter.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-2xl">
          <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido() {
  const [t, locale, cabeceras] = await Promise.all([getTranslations("recruiter"), getLocale(), headers()]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  if (!cuenta || !cookie) redirect({ href: { pathname: "/entrar", query: { volver: "publicar" } }, locale });
  const mio = await miRecruiterEnApi(cookie!);

  if (mio?.estado === "bloqueado") {
    return (
      <Tarjeta className="flex flex-col gap-2 border-peligro p-6 sm:p-8">
        <p className="text-lg font-bold">{t("bloqueado")}</p>
        {mio.motivo && (
          <p>
            <span className="font-bold">{t("motivo")}</span> {mio.motivo}
          </p>
        )}
        <p className="text-sm text-suave">{t("bloqueadoAyuda")}</p>
      </Tarjeta>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {mio ? (
        <Tarjeta className="flex flex-col gap-4 p-6 sm:p-8">
          <p className="text-lg font-bold">{t("activo", { empresa: cuenta!.recruiter?.empresa ?? mio.empresa })}</p>
          <p className="text-suave">{mio.agencia ? t("activoAgencia") : t("activoAyuda")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/cuenta/ofertas/nueva" className={clasesBoton({})}>
              {t("publicar")}
            </Link>
            <Link href="/cuenta/ofertas" className={clasesBoton({ variante: "secundario" })}>
              {t("misOfertas")}
            </Link>
          </div>
        </Tarjeta>
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-suave">
          <li>{t("como.uno")}</li>
          <li>{t("como.dos")}</li>
          <li>{t("como.tres")}</li>
        </ul>
      )}
      <Tarjeta className="flex flex-col gap-5 p-6 sm:p-8">
        {mio && <h2 className="text-titulo-3 font-bold">{t("tusDatos")}</h2>}
        <FormularioRecruiter inicial={mio} />
      </Tarjeta>
    </div>
  );
}
