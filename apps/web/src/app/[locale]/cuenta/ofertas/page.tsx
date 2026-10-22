import type { MiOferta } from "@techtojob/shared";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { RetirarOferta } from "@/components/cuenta/retirar-oferta";
import { VolverAPublicar } from "@/components/cuenta/volver-a-publicar";
import { Portada } from "@/components/sitio/portada";
import { Aviso, clasesBoton, Etiqueta, Tarjeta } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { misOfertasEnApi, obtenerCuenta } from "@/lib/api";
import { slugDeOferta } from "@/lib/ofertas";

export const metadata: Metadata = { robots: { index: false } };

const TONOS: Record<MiOferta["estado"], "acento" | "postit" | "borde" | "neutro"> = {
  publicada: "acento",
  pendiente: "postit",
  rechazada: "borde",
  caducada: "neutro",
  retirada: "neutro",
};

/** Mis ofertas: las que he subido, en qué estado están y cuántas más puedo subir. */
export default function PaginaMisOfertas({ searchParams }: PageProps<"/[locale]/cuenta/ofertas">) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("misOfertas.titulo") }]}
        titulo={t("misOfertas.titulo")}
        entradilla={t("misOfertas.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/[locale]/cuenta/ofertas">, "searchParams">) {
  const [t, format, locale, cabeceras, { enviada, editada }] = await Promise.all([
    getTranslations("misOfertas"),
    getFormatter(),
    getLocale(),
    headers(),
    searchParams,
  ]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  if (!cuenta || !cookie) redirect({ href: { pathname: "/entrar", query: { volver: "ofertas" } }, locale });
  const { ofertas, limite, enMarcha } = await misOfertasEnApi(cookie!);
  const esRecruiter = cuenta!.recruiter?.estado === "activo";
  // Sin ser recruiter y sin ofertas de antes: a registrarse.
  if (!esRecruiter && !ofertas.length) redirect({ href: "/cuenta/recruiter", locale });
  const quedan = esRecruiter ? Math.max(0, limite - enMarcha) : 0;
  const fecha = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { day: "numeric", month: "long" }) : "");

  return (
    <div className="flex flex-col gap-6">
      {enviada === "1" && (
        <Aviso role="status" chincheta={false} giro="">
          <p className="font-bold">{t("enviada")}</p>
        </Aviso>
      )}
      {(editada === "publicada" || editada === "pendiente") && (
        <Aviso role="status" chincheta={false} giro="">
          <p className="font-bold">{editada === "publicada" ? t("editadaPublicada") : t("editadaPendiente")}</p>
        </Aviso>
      )}

      {!esRecruiter && (
        <Aviso chincheta={false} giro="">
          <p className="font-bold">
            {t.rich("noRecruiter", {
              enlace: (texto) => (
                <Link href="/cuenta/recruiter" className="underline">
                  {texto}
                </Link>
              ),
            })}
          </p>
        </Aviso>
      )}

      <Tarjeta className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold">{t("enMarcha", { enMarcha, limite })}</p>
          <p className="text-sm text-suave">{!esRecruiter ? cuenta!.recruiter?.empresa : quedan > 0 ? t("quedan", { count: quedan }) : t("sinHueco")}</p>
        </div>
        {quedan > 0 && (
          <Link href="/cuenta/ofertas/nueva" className={clasesBoton({})}>
            {t("publicar")}
          </Link>
        )}
      </Tarjeta>

      {ofertas.length === 0 ? (
        <p className="text-suave">{t("vacio")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ofertas.map((o) => (
            <li key={o.id}>
              <Tarjeta className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    {o.estado === "publicada" ? (
                      <Link href={{ pathname: "/ofertas/[slug]", params: { slug: slugDeOferta(o) } }} className="font-bold text-enlace underline">
                        {o.titulo}
                      </Link>
                    ) : (
                      <p className="font-bold">{o.titulo}</p>
                    )}
                    <p className="text-sm text-suave">{o.empresa}</p>
                  </div>
                  <Etiqueta tono={TONOS[o.estado]}>{t(`estados.${o.estado}`)}</Etiqueta>
                </div>
                <p className="text-sm text-suave">
                  {o.estado === "publicada" && o.caducaEn
                    ? t("hasta", { fecha: fecha(o.caducaEn) })
                    : o.estado === "pendiente"
                      ? t("pendienteAyuda", { fecha: fecha(o.creadaEn) })
                      : t("enviadaEl", { fecha: fecha(o.creadaEn) })}
                </p>
                {o.estado === "rechazada" && o.motivoRechazo && (
                  <p className="rounded-2xl border border-borde p-3 text-sm">
                    <span className="font-bold">{t("motivo")}</span> {o.motivoRechazo}
                  </p>
                )}
                {(o.estado === "pendiente" || o.estado === "publicada") && (
                  <div className="flex flex-wrap items-start gap-2">
                    {esRecruiter && (
                      <Link href={{ pathname: "/cuenta/ofertas/[id]/editar", params: { id: o.id } }} className={clasesBoton({ variante: "secundario" })}>
                        {t("editar")}
                      </Link>
                    )}
                    <RetirarOferta id={o.id} publicada={o.estado === "publicada"} />
                  </div>
                )}
                {esRecruiter && quedan > 0 && (o.estado === "caducada" || o.estado === "retirada" || o.estado === "rechazada") && <VolverAPublicar id={o.id} />}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
