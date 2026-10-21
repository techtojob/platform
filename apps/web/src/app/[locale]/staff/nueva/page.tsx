import { getNow } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { FormularioOferta } from "@/components/staff/formulario/formulario-oferta";
import { Portada } from "@/components/sitio/portada";
import { exigirStaff, listarEmpresas } from "@/lib/api-staff";
import { VALORES_VACIOS } from "@/lib/formulario-oferta";

/** Nueva oferta a mano. Queda pendiente: luego se revisa y se publica como las demás. */
export default function PaginaNueva() {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: t("staff.nueva") }]}
        titulo={t("staff.nueva")}
        entradilla={t("staff.nuevaEntradilla")}
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
  await exigirStaff();
  const [empresas, ahora] = await Promise.all([listarEmpresas(), getNow()]);
  return <FormularioOferta empresas={empresas} inicial={VALORES_VACIOS} ofertaId={null} ahora={ahora.getTime()} />;
}
