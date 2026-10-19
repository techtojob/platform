import type { OfertaStaff } from "@techtojob/shared";
import { getFormatter, getTranslations } from "next-intl/server";
import { AvatarBlob, Etiqueta } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Una oferta en la lista del panel: título, empresa y lo que importa según su estado. */
export async function FilaStaff({ oferta, ahora }: { oferta: OfertaStaff; ahora: number }) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const hace = (iso: string) => format.relativeTime(new Date(iso), ahora);
  const caducada = oferta.caducaEn && Date.parse(oferta.caducaEn) < ahora;

  const dato =
    oferta.estado === "pendiente"
      ? t("staff.lista.creada", { tiempo: hace(oferta.creadaEn) })
      : oferta.estado === "publicada" && oferta.caducaEn
        ? caducada
          ? t("staff.lista.caducada", { tiempo: hace(oferta.caducaEn) })
          : t("staff.lista.caduca", { tiempo: hace(oferta.caducaEn) })
        : oferta.revisadaEn
          ? t("staff.lista.revisada", { tiempo: hace(oferta.revisadaEn) })
          : null;

  return (
    <Link
      href={{ pathname: "/staff/ofertas/[id]", params: { id: oferta.id } }}
      className="group flex items-center gap-4 rounded-tarjeta border border-borde bg-tarjeta p-4 shadow-tarjeta transition-colors hover:border-acento sm:p-5"
    >
      <AvatarBlob nombre={oferta.empresa.nombre} tamano={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-sm font-bold text-suave">{oferta.empresa.nombre}</p>
        <p className="text-lg font-bold leading-snug group-hover:text-enlace">{oferta.titulo}</p>
        <p className="flex flex-wrap gap-1.5">
          <Etiqueta>{t(`areas.${oferta.area}`)}</Etiqueta>
          <Etiqueta>{t(`seniority.${oferta.seniority}`)}</Etiqueta>
          <Etiqueta>{t(`modalidades.${oferta.modalidad}`)}</Etiqueta>
          {caducada && <Etiqueta tono="postit">{t("staff.lista.yaNoSale")}</Etiqueta>}
        </p>
        {oferta.estado === "rechazada" && oferta.motivoRechazo && (
          <p className="text-sm text-suave">{t("staff.lista.motivo", { motivo: oferta.motivoRechazo })}</p>
        )}
      </div>
      {dato && <p className="hidden shrink-0 text-right text-sm text-suave sm:block">{dato}</p>}
    </Link>
  );
}
