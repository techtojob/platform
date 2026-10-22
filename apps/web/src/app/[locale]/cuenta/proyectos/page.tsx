import { LIMITES_PROYECTO } from "@techtojob/shared";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { AccionesMiProyecto } from "@/components/proyectos/acciones-mi-proyecto";
import { TarjetaProyecto } from "@/components/proyectos/tarjeta-proyecto";
import { Portada } from "@/components/sitio/portada";
import { Aviso, clasesBoton } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { misProyectosEnApi, obtenerCuenta, obtenerMiPerfil } from "@/lib/api";

export const metadata: Metadata = { robots: { index: false } };

/** Mis proyectos: subir, editar, fijar en el perfil y borrar. */
export default function PaginaMisProyectos({ searchParams }: PageProps<"/[locale]/cuenta/proyectos">) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("proyectos.titulo"), href: "/proyectos" }, { texto: t("misProyectos.titulo") }]}
        titulo={t("misProyectos.titulo")}
        entradilla={t("misProyectos.entradilla")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[64rem]">
          <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/[locale]/cuenta/proyectos">, "searchParams">) {
  const [t, locale, cabeceras, { subido, guardado }] = await Promise.all([getTranslations("misProyectos"), getLocale(), headers(), searchParams]);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie).catch(() => null);
  if (!cuenta || !cookie) redirect({ href: "/entrar", locale });
  const verificado = cuenta!.discord.vinculado && cuenta!.discord.enServidor;
  const [{ perfil }, proyectos] = await Promise.all([obtenerMiPerfil(cookie!), misProyectosEnApi(cookie!)]);

  // Para subir proyectos hace falta perfil, y para el perfil, estar verificado.
  if (!perfil || !verificado) {
    return (
      <Aviso className="mx-auto flex max-w-2xl flex-col items-start gap-4 p-7">
        <p className="text-xl font-bold">{t("antes.titulo")}</p>
        <p className="leading-relaxed text-ink/80">{!verificado ? t("antes.verificar") : t("antes.perfil")}</p>
        <Link href={!verificado ? "/cuenta/ajustes" : "/cuenta/perfil"} className={clasesBoton({ variante: "sobrePostit" })}>
          {!verificado ? t("antes.botonVerificar") : t("antes.botonPerfil")}
        </Link>
      </Aviso>
    );
  }

  const fijados = proyectos.filter((p) => p.fijado).length;
  const lleno = proyectos.length >= LIMITES_PROYECTO.porPersona;
  return (
    <div className="flex flex-col gap-6">
      {(subido === "1" || guardado === "1") && (
        <Aviso role="status" chincheta={false} giro="">
          <p className="font-bold">{subido === "1" ? t("subido") : t("guardado")}</p>
        </Aviso>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-suave">{t("cuantos", { count: proyectos.length, fijados, maxFijados: LIMITES_PROYECTO.fijados })}</p>
        <span className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/talento/[alias]", params: { alias: perfil.alias } }} className={clasesBoton({ variante: "secundario" })}>
            {t("verEnMiPerfil")}
          </Link>
          {!lleno && (
            <Link href="/cuenta/proyectos/nuevo" className={clasesBoton()}>
              {t("subir")}
            </Link>
          )}
        </span>
      </div>
      {proyectos.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-tarjeta border border-borde bg-tarjeta p-6 shadow-tarjeta">
          <p className="font-bold">{t("vacio")}</p>
          <p className="text-suave">{t("vacioTexto")}</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {proyectos.map((p) => (
            <li key={p.id} className="flex flex-col gap-3">
              <TarjetaProyecto proyecto={p} conSesion sinAutor />
              <AccionesMiProyecto id={p.id} fijado={p.fijado} puedeFijar={fijados < LIMITES_PROYECTO.fijados} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
