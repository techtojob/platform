import { useTranslations } from "next-intl";

/**
 * El texto de una oferta tal y como sale en la bolsa: lo nuestro (resumen, responsabilidades y requisitos,
 * escritos por el staff con la IA, en español) y, si la empresa nos autoriza, su descripción completa.
 * Se usa en la oferta y en la vista previa del panel, para que el staff vea exactamente lo que se publica.
 */
export function TextoOferta({
  resumen,
  responsabilidades,
  requisitos,
  descripcion,
  idioma,
  vacio,
}: {
  resumen: string | null;
  responsabilidades: string[];
  requisitos: string[];
  /** Solo si la empresa nos autoriza (si no, null). */
  descripcion: string | null;
  /** Idioma en que escribió la empresa (para su descripción). */
  idioma: string;
  /** Qué decir si no hay nada. */
  vacio: string;
}) {
  const t = useTranslations("ofertas");
  const parrafos = (descripcion ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const lista = (titulo: string, puntos: string[]) =>
    puntos.length > 0 && (
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-suave marker:text-acento">
          {puntos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="flex max-w-[68ch] flex-col gap-6 leading-relaxed">
      <div className="flex flex-col gap-6" lang="es">
        {resumen && <p className="text-xl font-bold leading-snug tracking-tight">{resumen}</p>}
        {lista(t("responsabilidades"), responsabilidades)}
        {lista(t("requisitos"), requisitos)}
      </div>
      {parrafos.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-borde pt-6" lang={idioma}>
          <h2 className="text-lg font-bold">{t("descripcionEmpresa")}</h2>
          {parrafos.map((p, i) => (
            <p key={i} className="whitespace-pre-line text-suave">
              {p}
            </p>
          ))}
        </section>
      )}
      {!resumen && !responsabilidades.length && !parrafos.length && <p className="text-suave">{vacio}</p>}
    </div>
  );
}
