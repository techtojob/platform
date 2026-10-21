import { getNow } from "next-intl/server";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormularioOferta } from "@/components/staff/formulario/formulario-oferta";
import { Portada } from "@/components/sitio/portada";
import { exigirStaff, listarEmpresas, obtenerOfertaStaff } from "@/lib/api-staff";
import { valoresDeOferta } from "@/lib/formulario-oferta";

type Props = PageProps<"/[locale]/staff/ofertas/[id]/editar">;

/** Editar una oferta (en cualquier estado). Si está publicada, sigue publicada con los cambios. */
export default function PaginaEditar({ params }: Props) {
  const t = useTranslations();
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <Portada
        migas={[{ texto: t("navegacion.empleo"), href: "/" }, { texto: t("staff.titulo"), href: "/staff" }, { texto: t("staff.editar") }]}
        titulo={t("staff.editar")}
        compacta
      />
      <section className="rejilla flex-1 px-[var(--margen)] py-12">
        <div className="mx-auto max-w-[80rem]">
          <Suspense fallback={<div aria-busy="true" className="h-[40rem] animate-pulse rounded-tarjeta bg-tarjeta" />}>
            <Formulario params={params} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Formulario({ params }: Pick<Props, "params">) {
  await exigirStaff();
  const { id } = await params;
  const [oferta, empresas, ahora] = await Promise.all([obtenerOfertaStaff(id), listarEmpresas(), getNow()]);
  if (!oferta) notFound();
  return (
    <FormularioOferta
      empresas={empresas}
      inicial={valoresDeOferta(oferta)}
      ofertaId={oferta.id}
      ahora={ahora.getTime()}
      original={oferta.origen === "automatica" ? { texto: oferta.descripcionOriginal } : null}
    />
  );
}
