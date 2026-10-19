import { ESTADOS_OFERTA, type EstadoOferta } from "@techtojob/shared";
import { getNow, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { FilaStaff } from "@/components/staff/fila-staff";
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
  const [{ estado: pedido }, t] = await Promise.all([searchParams, getTranslations("staff")]);
  const estado: EstadoOferta = (ESTADOS_OFERTA as readonly string[]).includes(String(pedido)) ? (pedido as EstadoOferta) : "pendiente";
  const [lista, ahora] = await Promise.all([listarOfertasStaff(estado), getNow()]);

  return (
    <div className="flex flex-col gap-6">
      {/* Pestañas: un enlace por estado, con cuántas hay */}
      <nav aria-label={t("estados.titulo")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ESTADOS_OFERTA.map((e) => {
          const activo = e === estado;
          return (
            <Link
              key={e}
              href={{ pathname: "/staff", query: e === "pendiente" ? {} : { estado: e } }}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                activo ? "bg-acento text-ink" : "bg-chip text-texto hover:bg-hover",
              )}
            >
              {t(`estados.${e}`)}
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", activo ? "bg-ink/15" : "bg-fondo/60 text-suave")}>
                {lista.cuentas[e] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      {lista.ofertas.length === 0 ? (
        <p className="rounded-tarjeta border border-borde bg-tarjeta p-6 font-bold shadow-tarjeta">{t(`vacio.${estado}`)}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.ofertas.map((o) => (
            <li key={o.id}>
              <FilaStaff oferta={o} ahora={ahora.getTime()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
