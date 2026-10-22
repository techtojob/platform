"use client";

import { CARGOS_RECRUITER, LIMITES_RECRUITER, validarSolicitudRecruiter, type MiRecruiter } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { solicitarRecruiter } from "@/app/[locale]/cuenta/recruiter/acciones";
import { AreaTexto, BotonesOpcion } from "@/components/formulario/piezas";
import { Boton, Campo } from "@/components/ui";
import { enlacesContacto } from "@/components/ui/contacto";
import { useRouter } from "@/i18n/navigation";

type Valores = { cargo: string; empresa: string; web: string; linkedin: string; mensaje: string };

/** Registrarse como recruiter (al momento) o cambiar sus datos. Al registrarse, a publicar la primera oferta. */
export function FormularioRecruiter({ inicial }: { inicial: MiRecruiter | null }) {
  const t = useTranslations("recruiter");
  const router = useRouter();
  const [v, poner] = useState<Valores>({
    cargo: inicial?.cargo ?? "",
    empresa: inicial?.empresa ?? "",
    web: inicial?.web ?? "",
    linkedin: inicial?.linkedin ?? "",
    mensaje: inicial?.mensaje ?? "",
  });
  const [errores, ponerErrores] = useState<Record<string, string>>({});
  const [errorGeneral, ponerErrorGeneral] = useState<string | null>(null);
  const [guardado, ponerGuardado] = useState(false);
  const [ocupado, empezar] = useTransition();
  const cambiar = (c: Partial<Valores>) => {
    poner((a) => ({ ...a, ...c }));
    ponerErrores({});
    ponerGuardado(false);
  };
  const error = (campo: string) => {
    const codigo = errores[campo];
    if (!codigo) return undefined;
    return t.has(`errores.${campo}.${codigo}` as never) ? t(`errores.${campo}.${codigo}` as never) : t(`errores.${codigo}` as "errores.falta");
  };

  function enviar(e: FormEvent) {
    e.preventDefault();
    ponerErrorGeneral(null);
    const r = validarSolicitudRecruiter(v);
    if (r.errores) return ponerErrores(r.errores);
    empezar(async () => {
      const res = await solicitarRecruiter(v);
      if (res.errores) return ponerErrores(res.errores);
      if (res.error) return ponerErrorGeneral(res.error);
      // Recién registrado: a publicar. Si solo cambia sus datos, se queda y dice "Guardado".
      if (!inicial) return router.push("/cuenta/ofertas/nueva");
      ponerGuardado(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <BotonesOpcion
        nombre="cargo"
        etiqueta={t("cargo")}
        opciones={CARGOS_RECRUITER.map((c) => ({ valor: c, texto: t(`cargos.${c}`) }))}
        valor={v.cargo}
        onCambio={(cargo) => cambiar({ cargo })}
        error={error("cargo")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          etiqueta={t("empresa")}
          value={v.empresa}
          maxLength={LIMITES_RECRUITER.empresa}
          autoComplete="organization"
          onChange={(e) => cambiar({ empresa: e.target.value })}
          error={error("empresa")}
        />
        <Campo
          etiqueta={t("web")}
          ayuda={t("webAyuda")}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={v.web}
          maxLength={LIMITES_RECRUITER.web}
          onChange={(e) => cambiar({ web: e.target.value })}
          error={error("web")}
        />
      </div>
      <Campo
        etiqueta={t("linkedin")}
        ayuda={t("linkedinAyuda")}
        type="url"
        inputMode="url"
        placeholder="https://www.linkedin.com/in/…"
        value={v.linkedin}
        maxLength={LIMITES_RECRUITER.linkedin}
        onChange={(e) => cambiar({ linkedin: e.target.value })}
        error={error("linkedin")}
      />
      <AreaTexto
        etiqueta={t("mensaje")}
        ayuda={t("mensajeAyuda")}
        rows={3}
        maxLength={LIMITES_RECRUITER.mensaje}
        value={v.mensaje}
        onChange={(e) => cambiar({ mensaje: e.target.value })}
        error={error("mensaje")}
      />
      <p className="text-sm text-suave">{t("publico")}</p>
      <p className="text-sm text-suave">{t.rich("variasEmpresas", enlacesContacto)}</p>
      {errorGeneral && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {t("errorGeneral")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" disabled={ocupado}>
          {ocupado ? t("enviando") : inicial ? t("guardar") : t("enviar")}
        </Boton>
        {guardado && (
          <p role="status" className="text-sm font-bold">
            {t("guardado")}
          </p>
        )}
      </div>
    </form>
  );
}
