import type { Metadata } from "next";
import { getLocale, getNow, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Avatar } from "@/components/cuenta/avatar";
import { CerrarSesion } from "@/components/cuenta/cerrar-sesion";
import { FormasDeEntrar, type Retorno } from "@/components/cuenta/formas-de-entrar";
import { FormularioUbicacion } from "@/components/cuenta/formulario-ubicacion";
import { SeccionDiscord } from "@/components/cuenta/seccion-discord";
import { TusDatos } from "@/components/cuenta/tus-datos";
import { Portada } from "@/components/sitio/portada";
import { clasesBoton, Tarjeta, Ventana } from "@/components/ui";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { obtenerCuenta, obtenerMiPerfil } from "@/lib/api";
import { LANDING_URL } from "@/lib/sitio";

export const metadata: Metadata = { robots: { index: false } };

const VINCULABLES = ["google", "github", "discord"] as const;

/** Al volver de vincular: ?vinculada=github (bien) o ?vincular=github&error=… (mal). */
function leerRetorno(parametros: Record<string, string | string[] | undefined>): Retorno {
  const { vinculada, vincular, error } = parametros;
  const proveedor = VINCULABLES.find((p) => p === vinculada || p === vincular);
  if (!proveedor) return null;
  return { proveedor, error: vincular === proveedor ? (typeof error === "string" ? error : "otro") : null };
}

/** Mi cuenta: quién eres, con qué entras, tu Discord y cerrar sesión. */
export default function PaginaAjustes({ searchParams }: PageProps<"/[locale]/cuenta/ajustes">) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("cuenta.titulo") }]} titulo={t("cuenta.titulo")} compacta />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-3xl">
          <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/[locale]/cuenta/ajustes">, "searchParams">) {
  const [t, locale, cabeceras, parametros] = await Promise.all([getTranslations("cuenta"), getLocale(), headers(), searchParams]);
  const retorno = leerRetorno(parametros);
  const cookie = cabeceras.get("cookie");
  const cuenta = await obtenerCuenta(cookie);
  if (!cuenta) redirect({ href: "/entrar", locale });
  const mio = cookie ? await obtenerMiPerfil(cookie).catch(() => null) : null;
  const { usuario, formasDeEntrar, discord } = cuenta!;

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta className="flex items-center gap-4 p-5">
        <Avatar nombre={usuario.nombre} imagen={usuario.imagen} grande />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-lg font-bold">{usuario.nombre}</p>
          <p className="truncate text-suave">{usuario.email}</p>
        </div>
      </Tarjeta>

      {/* Dónde vive: decide qué ofertas se le enseñan por defecto */}
      <Tarjeta className="flex flex-col gap-3 p-5">
        <h2 className="text-titulo-3 font-bold">{t("dondeVives")}</h2>
        <p className="text-sm text-suave">{t("dondeVivesAyuda")}</p>
        <FormularioUbicacion inicial={cuenta!.ubicacion} alGuardar="aviso" />
      </Tarjeta>

      {/* Google y GitHub: vincular la que falte sin salir de la sesión */}
      <Tarjeta className="flex flex-col gap-3 p-5">
        <h2 className="text-titulo-3 font-bold">{t("formasDeEntrar")}</h2>
        <FormasDeEntrar formas={formasDeEntrar} retorno={retorno} />
      </Tarjeta>

      {/* Perfil de talento: crearlo o ir a él */}
      <Tarjeta className="flex flex-col gap-3 p-5">
        <h2 className="text-titulo-3 font-bold">{t("perfilTitulo")}</h2>
        <p className="text-suave">
          {mio?.perfil
            ? t("perfilTienes", {
                direccion: `${new URL(LANDING_URL).host}${getPathname({ href: { pathname: "/talento/[alias]", params: { alias: mio.perfil.alias } }, locale })}`,
              })
            : t("perfilNoTienes")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/cuenta/perfil" className={clasesBoton({ variante: mio?.perfil ? "secundario" : "primario" })}>
            {mio?.perfil ? t("perfilEditar") : t("perfilCrear")}
          </Link>
          {mio?.perfil && (
            <Link href={{ pathname: "/talento/[alias]", params: { alias: mio.perfil.alias } }} className={clasesBoton({ variante: "fantasma" })}>
              {t("perfilVer")}
            </Link>
          )}
        </div>
      </Tarjeta>

      {/* Discord, en su ventana tipo Discord */}
      <Ventana canal="discord" aria-label="Discord">
        <div className="rounded-xl bg-tarjeta/60 p-4 sm:p-5">
          <SeccionDiscord discord={discord} ahora={(await getNow()).getTime()} retorno={retorno} />
        </div>
      </Ventana>

      <Tarjeta className="flex flex-col gap-3 p-5">
        <h2 className="text-titulo-3 font-bold">{t("datos.titulo")}</h2>
        <TusDatos email={usuario.email} />
      </Tarjeta>

      <div>
        <CerrarSesion />
      </div>
    </div>
  );
}
