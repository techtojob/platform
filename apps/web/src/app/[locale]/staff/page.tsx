import { ATAJOS_POR_ESTADO, ESTADOS_OFERTA, hayFiltrosStaff, leerFiltrosStaff, parametrosStaff, POR_PAGINA_STAFF } from "@techtojob/shared";
import { getNow, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { FilaStaff } from "@/components/staff/fila-staff";
import { BarraFiltrosStaff } from "@/components/staff/filtros-staff";
import { ListaConSeleccion } from "@/components/staff/lista-seleccion";
import { Portada } from "@/components/sitio/portada";
import { clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { exigirStaff, listarOfertasStaff } from "@/lib/api-staff";
import { cn } from "@/lib/cn";

type Props = PageProps<"/[locale]/staff">;

/** Panel de staff: las ofertas por estado (pendientes primero) y el botón de crear una. */
export default function PaginaStaff({ searchParams }: Props) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo") }]}
        titulo={t("staff.titulo")}
        entradilla={t("staff.entradilla")}
        compacta
        lado={
          <Link href="/staff/nueva" className={clasesBoton({ tamano: "lg" })}>
            {t("staff.nueva")}
          </Link>
        }
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[64rem]">
          <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Contenido searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Contenido({ searchParams }: Pick<Props, "searchParams">) {
  await exigirStaff();
  const [parametros, t] = await Promise.all([searchParams, getTranslations("staff")]);
  const filtros = leerFiltrosStaff(parametros);
  const [lista, ahora] = await Promise.all([listarOfertasStaff(filtros), getNow()]);
  const query = parametrosStaff(filtros);
  const paginas = Math.max(1, Math.ceil(lista.total / POR_PAGINA_STAFF));
  const chip = (activo: boolean) =>
    cn(
      "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
      activo ? "bg-acento text-ink" : "bg-chip text-texto hover:bg-hover",
    );
  const cuenta = (activo: boolean, n: number, alerta = false) => (
    <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", activo ? "bg-ink/15" : alerta && n ? "bg-peligro text-fondo" : "bg-fondo/60 text-suave")}>
      {n}
    </span>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Pestañas: un enlace por estado, con cuántas hay. Al cambiar de pestaña se quitan los filtros. */}
      <nav aria-label={t("estados.titulo")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ESTADOS_OFERTA.map((e) => {
          const activo = e === filtros.estado;
          return (
            <Link
              key={e}
              href={{ pathname: "/staff", query: e === "pendiente" ? {} : { estado: e } }}
              aria-current={activo ? "page" : undefined}
              className={chip(activo)}
            >
              {t(`estados.${e}`)}
              {cuenta(activo, lista.cuentas[e] ?? 0)}
            </Link>
          );
        })}
        <Link href="/staff/empresas" className={chip(false)}>
          {t("empresas.pestana")}
        </Link>
        <Link href="/staff/reportes" className={chip(false)}>
          {t("reportes.pestana")}
          {cuenta(false, lista.reportes, true)}
        </Link>
      </nav>

      {/* Atajos de esta pestaña: un clic y se ve solo eso (otro clic lo quita). */}
      {ATAJOS_POR_ESTADO[filtros.estado].length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("filtros.atajos")}>
          {ATAJOS_POR_ESTADO[filtros.estado].map((a) => {
            const activo = filtros.atajo === a;
            return (
              <Link
                key={a}
                href={{ pathname: "/staff", query: parametrosStaff({ ...filtros, atajo: activo ? undefined : a, pagina: 1 }) }}
                aria-pressed={activo}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors",
                  activo ? "border-acento bg-acento text-ink" : "border-borde-fuerte hover:border-enlace",
                )}
              >
                {t(`filtros.atajosNombres.${a}`)}
                <span className="tabular-nums opacity-70">{lista.atajos[a] ?? 0}</span>
              </Link>
            );
          })}
        </div>
      )}

      <BarraFiltrosStaff key={JSON.stringify(query)} filtros={filtros} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold" aria-live="polite">
          {t("filtros.total", { count: lista.total })}
        </p>
        {hayFiltrosStaff(filtros) && (
          <Link href={{ pathname: "/staff", query: filtros.estado === "pendiente" ? {} : { estado: filtros.estado } }} className="text-sm font-bold text-enlace underline">
            {t("filtros.limpiar")}
          </Link>
        )}
      </div>

      {/* Siempre se pinta (aunque esté vacía), para que el aviso de "N rechazadas" no desaparezca al vaciarse. */}
      <ListaConSeleccion
        seleccionable={filtros.estado === "pendiente"}
        vacio={
          <p className="rounded-tarjeta border border-borde bg-tarjeta p-6 font-bold shadow-tarjeta">
            {hayFiltrosStaff(filtros) ? t("filtros.vacio") : t(`vacio.${filtros.estado}`)}
          </p>
        }
        filas={lista.ofertas.map((o) => ({
          id: o.id,
          titulo: o.titulo,
          contenido: <FilaStaff oferta={o} ahora={ahora.getTime()} query={query} />,
        }))}
      />

      {paginas > 1 && (
        <nav aria-label={t("filtros.paginas")} className="flex flex-wrap items-center gap-3">
          {filtros.pagina > 1 && (
            <Link href={{ pathname: "/staff", query: parametrosStaff({ ...filtros, pagina: filtros.pagina - 1 }) }} className={clasesBoton({ variante: "secundario" })}>
              {t("filtros.anterior")}
            </Link>
          )}
          <p className="text-sm text-suave">{t("filtros.pagina", { pagina: filtros.pagina, total: paginas })}</p>
          {filtros.pagina < paginas && (
            <Link href={{ pathname: "/staff", query: parametrosStaff({ ...filtros, pagina: filtros.pagina + 1 }) }} className={clasesBoton({ variante: "secundario" })}>
              {t("filtros.siguiente")}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
