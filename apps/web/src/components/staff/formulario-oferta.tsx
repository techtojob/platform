"use client";

import {
  AREAS,
  IDIOMAS,
  LIMITES,
  MODALIDADES,
  MONEDAS,
  NIVELES_IDIOMA,
  SENIORITY,
  TECNOLOGIAS,
  ZONAS_REMOTO,
  type EmpresaStaff,
} from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useId, useState, type ReactNode } from "react";
import type { EstadoFormulario } from "@/app/[locale]/staff/acciones";
import { Boton, Campo, Tarjeta } from "@/components/ui";
import { cn } from "@/lib/cn";
import { EMPRESA_NUEVA, type ValoresOferta } from "@/lib/formulario-oferta";
import { nombreIdioma } from "@/lib/idiomas-usuario";

/** Idiomas que se ven siempre; el resto, en "Más idiomas". */
const IDIOMAS_FRECUENTES = ["es", "en", "pt", "fr", "de", "it"] as const;

const clasesControl =
  "w-full rounded-2xl border border-borde-fuerte bg-tarjeta px-4 py-3 text-base text-texto placeholder:text-suave aria-invalid:border-peligro";

type Props = {
  empresas: EmpresaStaff[];
  inicial: ValoresOferta;
  accion: (previo: EstadoFormulario, formulario: FormData) => Promise<EstadoFormulario>;
  textoBoton: string;
};

/**
 * Formulario de una oferta (crear o editar). Lo comprueba el servidor con las mismas
 * reglas que el API; si algo está mal, vuelve con lo escrito y el error junto a cada campo.
 */
export function FormularioOferta({ empresas, inicial, accion, textoBoton }: Props) {
  const t = useTranslations("staff");
  const tr = useTranslations();
  const locale = useLocale();
  const [estado, enviar, enviando] = useActionState(accion, { intento: 0 });
  const v = estado.valores ?? inicial;
  const errores = estado.errores ?? {};
  const hayErrores = Object.keys(errores).length > 0;

  /** Texto del error de un campo: primero el específico ("ciudad.falta"), si no el general ("falta"). */
  const error = (campo: string) => {
    const codigo = errores[campo];
    if (!codigo) return undefined;
    return t.has(`errores.${campo}.${codigo}` as never) ? t(`errores.${campo}.${codigo}` as never) : t(`errores.${codigo}` as "errores.falta");
  };

  return (
    // key: tras cada envío se vuelve a pintar con lo que había escrito.
    <form key={estado.intento} action={enviar} noValidate className="flex flex-col gap-6" aria-busy={enviando}>
      <input type="hidden" name="locale" value={locale} />
      {(hayErrores || estado.error) && (
        <p role="alert" className="rounded-tarjeta border border-peligro bg-tarjeta p-4 font-bold text-peligro">
          {estado.error ? t("errorGeneral") : t("revisaCampos")}
        </p>
      )}

      <Seccion titulo={t("form.empresa")}>
        <Empresa empresas={empresas} v={v} error={error} />
      </Seccion>

      <Seccion titulo={t("form.oferta")}>
        <Campo name="titulo" etiqueta={t("form.titulo")} defaultValue={v.titulo} maxLength={LIMITES.titulo.max} required error={error("titulo")} />
        <Campo
          name="urlOriginal"
          type="url"
          etiqueta={t("form.urlOriginal")}
          ayuda={t("form.urlOriginalAyuda")}
          placeholder="https://"
          defaultValue={v.urlOriginal}
          required
          error={error("urlOriginal")}
        />
        <Desplegable name="idioma" etiqueta={t("form.idioma")} ayuda={t("form.idiomaAyuda")} defaultValue={v.idioma} error={error("idioma")}>
          {IDIOMAS.map((i) => (
            <option key={i} value={i}>
              {nombreIdioma(i, locale)}
            </option>
          ))}
        </Desplegable>
        <AreaTexto name="resumen" etiqueta={t("form.resumen")} ayuda={t("form.resumenAyuda")} defaultValue={v.resumen} maxLength={LIMITES.resumen.max} filas={2} error={error("resumen")} />
        <AreaTexto
          name="descripcion"
          etiqueta={t("form.descripcion")}
          ayuda={t("form.descripcionAyuda")}
          defaultValue={v.descripcion}
          maxLength={LIMITES.descripcion.max}
          filas={8}
          error={error("descripcion")}
        />
      </Seccion>

      <Seccion titulo={t("form.puesto")}>
        <div className="grid gap-5 sm:grid-cols-3">
          <Desplegable name="area" etiqueta={t("form.area")} defaultValue={v.area} error={error("area")} vacio={t("form.elige")}>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {tr(`areas.${a}`)}
              </option>
            ))}
          </Desplegable>
          <Desplegable name="seniority" etiqueta={t("form.seniority")} defaultValue={v.seniority} error={error("seniority")} vacio={t("form.elige")}>
            {SENIORITY.map((s) => (
              <option key={s} value={s}>
                {tr(`seniority.${s}`)}
              </option>
            ))}
          </Desplegable>
          <Desplegable name="modalidad" etiqueta={t("form.modalidad")} defaultValue={v.modalidad} error={error("modalidad")} vacio={t("form.elige")}>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>
                {tr(`modalidades.${m}`)}
              </option>
            ))}
          </Desplegable>
        </div>
        <Tecnologias marcadas={v.tecnologias} error={error("tecnologias")} />
      </Seccion>

      <Seccion titulo={t("form.donde")}>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Campo name="ciudad" etiqueta={t("form.ciudad")} defaultValue={v.ciudad} maxLength={LIMITES.ciudad.max} error={error("ciudad")} />
          <Campo name="pais" etiqueta={t("form.pais")} ayuda={t("form.paisAyuda")} defaultValue={v.pais} maxLength={2} error={error("pais")} />
        </div>
        <Desplegable name="remotoDesde" etiqueta={t("form.remotoDesde")} ayuda={t("form.remotoDesdeAyuda")} defaultValue={v.remotoDesde} error={error("remotoDesde")} vacio={t("form.noRemoto")}>
          {ZONAS_REMOTO.map((z) => (
            <option key={z} value={z}>
              {tr(`regiones.${z}`)}
            </option>
          ))}
        </Desplegable>
      </Seccion>

      <Seccion titulo={t("form.salario")} ayuda={t("form.salarioAyuda")}>
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_8rem]">
          <Campo name="salarioMin" inputMode="numeric" etiqueta={t("form.salarioMin")} defaultValue={v.salarioMin} error={error("salarioMin")} />
          <Campo name="salarioMax" inputMode="numeric" etiqueta={t("form.salarioMax")} defaultValue={v.salarioMax} error={error("salarioMax")} />
          <Desplegable name="moneda" etiqueta={t("form.moneda")} defaultValue={v.moneda} error={error("moneda")}>
            {MONEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Desplegable>
        </div>
      </Seccion>

      <Seccion titulo={t("form.idiomasQuePide")} ayuda={t("form.idiomasQuePideAyuda")}>
        <IdiomasQuePide pide={v.pide} error={error("idiomasRequeridos")} />
      </Seccion>

      <div className="flex flex-wrap items-center gap-3">
        <Boton type="submit" tamano="lg" disabled={enviando}>
          {enviando ? t("guardando") : textoBoton}
        </Boton>
      </div>
    </form>
  );
}

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <Tarjeta className="p-0">
      <fieldset className="flex flex-col gap-5 p-5 sm:p-7">
        <legend className="float-left mb-1 w-full text-titulo-3 font-bold">{titulo}</legend>
        {ayuda && <p className="-mt-3 text-sm text-suave">{ayuda}</p>}
        {children}
      </fieldset>
    </Tarjeta>
  );
}

function Ayudas({ id, ayuda, error }: { id: string; ayuda?: string; error?: string }) {
  return (
    <>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-sm text-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}
    </>
  );
}

const describe = (id: string, ayuda?: string, error?: string) =>
  cn(ayuda && `${id}-ayuda`, error && `${id}-error`) || undefined;

function Desplegable({
  name,
  etiqueta,
  ayuda,
  error,
  vacio,
  defaultValue,
  children,
}: {
  name: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  /** Texto de la opción vacía ("Elige…"); sin él, no hay opción vacía. */
  vacio?: string;
  defaultValue: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {etiqueta}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, ayuda, error)}
        className={cn(clasesControl, "min-h-12 rounded-control px-5")}
      >
        {vacio !== undefined && <option value="">{vacio}</option>}
        {children}
      </select>
      <Ayudas id={id} ayuda={ayuda} error={error} />
    </div>
  );
}

function AreaTexto({
  name,
  etiqueta,
  ayuda,
  error,
  defaultValue,
  maxLength,
  filas,
}: {
  name: string;
  etiqueta: string;
  ayuda?: string;
  error?: string;
  defaultValue: string;
  maxLength: number;
  filas: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {etiqueta}
      </label>
      <textarea
        id={id}
        name={name}
        rows={filas}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, ayuda, error)}
        className={clasesControl}
      />
      <Ayudas id={id} ayuda={ayuda} error={error} />
    </div>
  );
}

function Empresa({ empresas, v, error }: { empresas: EmpresaStaff[]; v: ValoresOferta; error: (c: string) => string | undefined }) {
  const t = useTranslations("staff.form");
  const [elegida, elegir] = useState(v.empresaId);
  const id = useId();
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm font-bold">
          {t("empresa")}
        </label>
        <select
          id={id}
          name="empresaId"
          value={elegida}
          onChange={(e) => elegir(e.target.value)}
          aria-invalid={error("empresaId") ? true : undefined}
          aria-describedby={describe(id, undefined, error("empresaId"))}
          className={cn(clasesControl, "min-h-12 rounded-control px-5")}
        >
          <option value="">{t("elige")}</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
          <option value={EMPRESA_NUEVA}>{t("empresaNueva")}</option>
        </select>
        <Ayudas id={id} error={error("empresaId")} />
      </div>
      {elegida === EMPRESA_NUEVA && (
        <div className="grid gap-5 rounded-2xl border border-dashed border-borde-fuerte p-4 sm:grid-cols-2">
          <Campo name="empresaNombre" etiqueta={t("empresaNombre")} defaultValue={v.empresaNombre} maxLength={80} error={error("empresaNombre")} />
          <Campo name="empresaWeb" type="url" etiqueta={t("empresaWeb")} placeholder="https://" defaultValue={v.empresaWeb} />
        </div>
      )}
    </>
  );
}

function Tecnologias({ marcadas, error }: { marcadas: string[]; error?: string }) {
  const t = useTranslations("staff.form");
  const id = useId();
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={id} aria-describedby={describe(id, "si", error)}>
      <p id={id} className="text-sm font-bold">
        {t("tecnologias")}
      </p>
      <p id={`${id}-ayuda`} className="text-sm text-suave">
        {t("tecnologiasAyuda", { max: LIMITES.tecnologias.max })}
      </p>
      <div className="flex flex-wrap gap-2">
        {TECNOLOGIAS.map((tec) => (
          <label key={tec.id} className="cursor-pointer">
            <input type="checkbox" name="tecnologias" value={tec.id} defaultChecked={marcadas.includes(tec.id)} className="peer sr-only" />
            <span className="inline-flex min-h-9 items-center rounded-full border border-borde-fuerte px-3 text-sm font-bold text-suave transition-colors peer-checked:border-acento peer-checked:bg-acento peer-checked:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-enlace">
              {tec.nombre}
            </span>
          </label>
        ))}
      </div>
      <Ayudas id={id} error={error} />
    </div>
  );
}

function IdiomasQuePide({ pide, error }: { pide: ValoresOferta["pide"]; error?: string }) {
  const locale = useLocale();
  const otrosMarcados = pide.some((p) => !(IDIOMAS_FRECUENTES as readonly string[]).includes(p.idioma));
  const t = useTranslations("staff.form");
  const fila = (idioma: string) => {
    const actual = pide.find((p) => p.idioma === idioma);
    return <FilaIdioma key={idioma} idioma={idioma} nombre={nombreIdioma(idioma as never, locale)} marcado={!!actual} nivel={actual?.nivel ?? ""} />;
  };
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">{IDIOMAS_FRECUENTES.map(fila)}</div>
      <details open={otrosMarcados} className="group">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-enlace">{t("masIdiomas")}</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {IDIOMAS.filter((i) => !(IDIOMAS_FRECUENTES as readonly string[]).includes(i)).map(fila)}
        </div>
      </details>
    </div>
  );
}

function FilaIdioma({ idioma, nombre, marcado, nivel }: { idioma: string; nombre: string; marcado: boolean; nivel: string }) {
  const t = useTranslations("staff.form");
  const [activo, activar] = useState(marcado);
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border px-3 py-1.5", activo ? "border-acento" : "border-borde")}>
      <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-3 text-sm font-bold">
        <input type="checkbox" name="pide" value={idioma} defaultChecked={marcado} onChange={(e) => activar(e.target.checked)} className="size-[1.125rem] accent-acento" />
        <span className="first-letter:uppercase">{nombre}</span>
      </label>
      <select
        name={`nivel-${idioma}`}
        defaultValue={nivel}
        disabled={!activo}
        aria-label={t("nivelDe", { idioma: nombre })}
        className="min-h-9 rounded-full border border-borde-fuerte bg-tarjeta px-3 text-sm disabled:opacity-40"
      >
        <option value="">{t("sinNivel")}</option>
        {NIVELES_IDIOMA.map((n) => (
          <option key={n} value={n}>
            {n === "nativo" ? t("nativo") : n.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
