"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { marcarJuicio } from "@/app/[locale]/staff/juicio/acciones";
import { Boton } from "@/components/ui";
import { clasesControl } from "@/components/formulario/piezas";
import { useRouter } from "@/i18n/navigation";

/** El día del directo (por defecto, hoy) y el enlace al vídeo (se puede poner después). */
export function FormularioJuicio({ alias, fecha: fechaInicial, video: videoInicial, hoy }: { alias: string; fecha?: string; video?: string | null; hoy: string }) {
  const t = useTranslations("staff.juicio");
  const router = useRouter();
  const id = useId();
  const [fecha, ponerFecha] = useState(fechaInicial ?? hoy);
  const [video, ponerVideo] = useState(videoInicial ?? "");
  const [error, ponerError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const editando = !!fechaInicial;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        empezar(async () => {
          const r = await marcarJuicio(alias, fecha, video);
          ponerError(r);
          if (!r) router.refresh();
        });
      }}
      className="flex flex-wrap items-end gap-3"
      aria-busy={ocupado}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-fecha`} className="text-xs font-bold">
          {t("fecha")}
        </label>
        <input id={`${id}-fecha`} type="date" max={hoy} required value={fecha} onChange={(e) => ponerFecha(e.target.value)} className={`${clasesControl} min-h-11 py-2`} />
      </div>
      <div className="flex min-w-56 flex-1 flex-col gap-1">
        <label htmlFor={`${id}-video`} className="text-xs font-bold">
          {t("video")}
        </label>
        <input
          id={`${id}-video`}
          inputMode="url"
          placeholder="youtube.com/watch?v=…"
          value={video}
          onChange={(e) => ponerVideo(e.target.value)}
          className={`${clasesControl} min-h-11 py-2`}
        />
      </div>
      <Boton type="submit" disabled={ocupado}>
        {editando ? t("guardar") : t("marcar")}
      </Boton>
      {error && (
        <p role="alert" className="w-full text-sm font-semibold text-peligro">
          {t.has(`errores.${error}` as never) ? t(`errores.${error}` as never) : t("errores.desconocido")}
        </p>
      )}
    </form>
  );
}
