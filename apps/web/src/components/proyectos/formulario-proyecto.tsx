"use client";

import { AREAS, detectarTecnologias, LIMITES_PROYECTO, portadaGithub, type DatosProyecto } from "@techtojob/shared";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { guardarProyecto } from "@/app/[locale]/cuenta/proyectos/acciones";
import { AreaTexto, BotonesOpcion, clasesControl } from "@/components/formulario/piezas";
import { SelectorTecnologias } from "@/components/formulario/selector-tecnologias";
import { Boton, Campo, clasesBoton } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import type { ValoresProyecto } from "@/lib/formulario-proyecto";
import { PortadaProyecto } from "./portada-proyecto";

/** Lo mismo que hace el API con el enlace ("github.com/x/y" → "https://github.com/x/y"), para la vista previa. */
const conProtocolo = (url: string) => (url.trim() && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url.trim()) ? `https://${url.trim()}` : url.trim());

/** Subir o editar un proyecto: qué es, de qué área, con qué está hecho y dónde verlo. */
export function FormularioProyecto({ id = null, inicial }: { id?: string | null; inicial: ValoresProyecto }) {
  const t = useTranslations("misProyectos.formulario");
  const tr = useTranslations();
  const router = useRouter();
  const [v, ponerV] = useState(inicial);
  const [errores, ponerErrores] = useState<Record<string, string>>({});
  const [error, ponerError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();
  const alerta = useRef<HTMLParagraphElement>(null);
  const cambiar = (c: Partial<ValoresProyecto>) => ponerV((x) => ({ ...x, ...c }));
  const enElTexto = useMemo(() => detectarTecnologias(`${v.titulo}\n${v.descripcion}`), [v.titulo, v.descripcion]);
  const mensaje = (campo: string) => (errores[campo] ? t(`errores.${campo}.${errores[campo]}` as never) : undefined);
  const portada = portadaGithub(conProtocolo(v.repo) || null);

  function guardar() {
    ponerError(null);
    empezar(async () => {
      const r = await guardarProyecto(id, v);
      if (r.errores) {
        ponerErrores(r.errores);
        requestAnimationFrame(() => alerta.current?.focus());
        return;
      }
      if (r.error) {
        ponerError(r.error);
        requestAnimationFrame(() => alerta.current?.focus());
        return;
      }
      router.push({ pathname: "/cuenta/proyectos", query: { [id ? "guardado" : "subido"]: "1" } });
    });
  }

  const hayErrores = Object.keys(errores).length > 0;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
    >
      <div className="flex min-w-0 flex-col gap-5 rounded-tarjeta border border-borde bg-tarjeta p-5 shadow-tarjeta sm:p-7">
        {(hayErrores || error) && (
          <p ref={alerta} tabIndex={-1} role="alert" className="rounded-2xl border border-peligro px-4 py-3 font-bold text-peligro">
            {error ? (tr.has(`misProyectos.errores.${error}` as never) ? tr(`misProyectos.errores.${error}` as never) : tr("misProyectos.errores.desconocido")) : t("revisa")}
          </p>
        )}
        <Campo
          etiqueta={t("titulo")}
          placeholder={t("tituloEjemplo")}
          value={v.titulo}
          maxLength={LIMITES_PROYECTO.titulo.max}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          error={mensaje("titulo")}
        />
        <AreaTexto
          etiqueta={t("descripcion")}
          ayuda={t("descripcionAyuda")}
          contador
          rows={6}
          maxLength={LIMITES_PROYECTO.descripcion.max}
          value={v.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
          error={mensaje("descripcion")}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor="area-proyecto" className="text-sm font-bold">
            {t("area")}
          </label>
          <select
            id="area-proyecto"
            value={v.area}
            aria-invalid={errores.area ? true : undefined}
            onChange={(e) => cambiar({ area: e.target.value })}
            className={`${clasesControl} min-h-12`}
          >
            <option value="">{t("elegirArea")}</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {tr(`areas.${a}`)}
              </option>
            ))}
          </select>
          {mensaje("area") && <p className="text-sm font-semibold text-peligro">{mensaje("area")}</p>}
        </div>
        <SelectorTecnologias
          elegidas={v.tecnologias}
          onCambio={(tecnologias) => cambiar({ tecnologias })}
          enElTexto={enElTexto}
          area={v.area}
          maximo={LIMITES_PROYECTO.tecnologias}
          error={mensaje("tecnologias")}
        />
        <BotonesOpcion
          nombre="estado"
          etiqueta={t("estado")}
          opciones={[
            { valor: "terminado", texto: tr("proyectos.estados.terminado") },
            { valor: "en_curso", texto: tr("proyectos.estados.en_curso") },
          ]}
          valor={v.estado}
          onCambio={(estado) => cambiar({ estado })}
        />
        <fieldset className="flex flex-col gap-4 border-t border-borde pt-5">
          <legend className="sr-only">{t("enlaces")}</legend>
          <p className="text-sm text-suave">{t("enlacesAyuda")}</p>
          <Campo etiqueta={t("repo")} placeholder="github.com/tu-usuario/tu-proyecto" inputMode="url" autoCapitalize="none" spellCheck={false} value={v.repo} onChange={(e) => cambiar({ repo: e.target.value })} error={mensaje("repo")} ayuda={t("repoAyuda")} />
          <Campo etiqueta={t("demo")} placeholder="mi-proyecto.vercel.app" inputMode="url" autoCapitalize="none" spellCheck={false} value={v.demo} onChange={(e) => cambiar({ demo: e.target.value })} error={mensaje("demo")} />
          <Campo etiqueta={t("video")} placeholder="youtube.com/watch?v=…" inputMode="url" autoCapitalize="none" spellCheck={false} value={v.video} onChange={(e) => cambiar({ video: e.target.value })} error={mensaje("video")} />
        </fieldset>
        <div className="flex flex-wrap gap-3 border-t border-borde pt-5">
          <Boton type="submit" tamano="lg" disabled={guardando}>
            {guardando ? t("guardando") : id ? t("guardar") : t("subir")}
          </Boton>
          <Link href="/cuenta/proyectos" className={clasesBoton({ variante: "fantasma", tamano: "lg" })}>
            {t("cancelar")}
          </Link>
        </div>
      </div>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-28">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("portada")}</p>
        <div className="overflow-hidden rounded-tarjeta border border-borde shadow-tarjeta">
          <PortadaProyecto portada={portada} titulo={v.titulo || "?"} area={(v.area || "desarrollo") as DatosProyecto["area"]} />
        </div>
        <p className="text-sm leading-relaxed text-suave">{portada ? t("portadaGithub") : t("portadaSinGithub")}</p>
      </aside>
    </form>
  );
}
