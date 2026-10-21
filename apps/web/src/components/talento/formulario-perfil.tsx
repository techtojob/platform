"use client";

import {
  aliasValido,
  AREAS,
  detectarTecnologias,
  DISPONIBILIDAD,
  LIMITES_PERFIL,
  MODALIDADES,
  PAISES,
  SENIORITY,
  validarPerfil,
  VISIBILIDAD_PERFIL,
  type PerfilListado,
} from "@techtojob/shared";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { borrarMiPerfil, guardarMiPerfil } from "@/app/[locale]/cuenta/perfil/acciones";
import { AreaTexto, BotonesOpcion, clasesControl, Seccion, TextoError } from "@/components/formulario/piezas";
import { SelectorIdiomas } from "@/components/formulario/selector-idiomas";
import { SelectorTecnologias } from "@/components/formulario/selector-tecnologias";
import { Boton, Campo, Casilla, clasesBoton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { limpiarAlias, perfilParaApi, type ValoresPerfil } from "@/lib/formulario-perfil";
import { TarjetaPerfil } from "./tarjeta-perfil";

const SECCION_DE: Record<string, string> = {
  alias: "seccion-tu", nombre: "seccion-tu", titular: "seccion-tu",
  sobreMi: "seccion-sobre", area: "seccion-haces", seniority: "seccion-haces", tecnologias: "seccion-haces",
  ciudad: "seccion-donde", pais: "seccion-donde", modalidades: "seccion-donde", disponibilidad: "seccion-donde",
  idiomas: "seccion-idiomas", linkedin: "seccion-enlaces", github: "seccion-enlaces", portfolio: "seccion-enlaces",
  visibilidad: "seccion-visibilidad",
};

type Props = {
  inicial: ValoresPerfil;
  /** El perfil guardado (null si aún no hay): para "ver cómo queda" y "borrar". */
  guardado: { alias: string; actualizadoEn: string } | null;
  /** Foto de Google o GitHub de la cuenta, para la opción de mostrarla. */
  imagenCuenta: string | null;
  verificado: boolean;
  dominio: string;
};

/**
 * "Mi perfil": lo que la gente verá en Talento. Todo en una página; a la derecha,
 * cómo queda la tarjeta en el buscador, lo que falta, guardar y ver el perfil.
 */
export function FormularioPerfil({ inicial, guardado: guardadoInicial, imagenCuenta, verificado, dominio }: Props) {
  const t = useTranslations("miPerfil");
  const tr = useTranslations();
  const locale = useLocale();
  const [v, ponerValores] = useState(inicial);
  const [guardado, ponerGuardado] = useState(guardadoInicial);
  const [intentado, intentar] = useState(false);
  const [erroresServidor, ponerErroresServidor] = useState<Record<string, string>>({});
  const [aviso, ponerAviso] = useState<{ tono: "bien" | "mal"; texto: string } | null>(null);
  const [borrando, ponerBorrando] = useState(false);
  const [ocupado, empezar] = useTransition();
  const alerta = useRef<HTMLParagraphElement>(null);

  const cambiar = (c: Partial<ValoresPerfil>) => {
    ponerValores((a) => ({ ...a, ...c }));
    ponerErroresServidor({});
    ponerAviso(null);
  };

  const errores = useMemo(() => validarPerfil(perfilParaApi(v)).errores ?? {}, [v]);
  const visibles = intentado ? { ...errores, ...erroresServidor } : erroresServidor;
  const mensaje = (campo: string) => {
    const c = visibles[campo];
    if (!c) return undefined;
    return tr.has(`miPerfil.errores.${campo}.${c}` as never) ? tr(`miPerfil.errores.${campo}.${c}` as never) : tr(`staff.errores.${c}` as never);
  };
  const faltan = Object.keys({ ...errores, ...erroresServidor });
  const enElTexto = useMemo(() => detectarTecnologias(`${v.titular}\n${v.sobreMi}`), [v.titular, v.sobreMi]);
  const errorAlias = v.alias ? aliasValido(v.alias) : "falta";

  const paises = useMemo(() => {
    const nombres = new Intl.DisplayNames([locale], { type: "region" });
    return PAISES.map((c) => ({ codigo: c, nombre: nombres.of(c) ?? c })).sort((a, b) =>
      a.codigo === "ES" ? -1 : b.codigo === "ES" ? 1 : a.nombre.localeCompare(b.nombre, locale),
    );
  }, [locale]);

  function guardar() {
    intentar(true);
    if (Object.keys(errores).length) {
      requestAnimationFrame(() => alerta.current?.focus());
      return;
    }
    empezar(async () => {
      const r = await guardarMiPerfil(v);
      if (r.errores) ponerErroresServidor(r.errores);
      if (r.error) ponerAviso({ tono: "mal", texto: t("errorGuardar") });
      if (r.guardado) {
        ponerGuardado(r.guardado);
        ponerAviso({ tono: "bien", texto: guardadoInicial || guardado ? t("guardado") : t("creado") });
      }
      requestAnimationFrame(() => alerta.current?.focus());
    });
  }

  function borrar() {
    empezar(async () => {
      const error = await borrarMiPerfil();
      if (error) return ponerAviso({ tono: "mal", texto: t("errorBorrar") });
      ponerGuardado(null);
      ponerBorrando(false);
      ponerAviso({ tono: "bien", texto: t("borrado") });
    });
  }

  // Vista previa: la tarjeta tal y como saldrá en el buscador.
  const vista: PerfilListado = {
    alias: v.alias || "tu-alias",
    nombre: v.nombre || t("vistaNombre"),
    titular: v.titular || t("vistaTitular"),
    imagen: v.mostrarFoto ? imagenCuenta : null,
    area: (v.area || "desarrollo") as PerfilListado["area"],
    seniority: (v.seniority || "junior") as PerfilListado["seniority"],
    ciudad: v.ciudad || null,
    pais: v.pais || null,
    modalidades: v.modalidades as PerfilListado["modalidades"],
    disponibilidad: (v.disponibilidad || "abierto") as PerfilListado["disponibilidad"],
    tecnologias: v.tecnologias,
    verificado,
    emblemas: [],
    actualizadoEn: guardado?.actualizadoEn ?? new Date(0).toISOString(),
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <Seccion id="seccion-tu" numero={1} titulo={t("seccionTu")}>
          <div className="flex flex-col gap-2">
            <Campo
              etiqueta={t("alias")}
              value={v.alias}
              autoCapitalize="none"
              spellCheck={false}
              maxLength={LIMITES_PERFIL.alias.max}
              onChange={(e) => cambiar({ alias: limpiarAlias(e.target.value) })}
              error={mensaje("alias")}
              ayuda={t("aliasAyuda", { direccion: `${dominio}/${v.alias || "…"}` })}
            />
            {!intentado && v.alias && errorAlias && errorAlias !== "falta" && (
              <p className="text-sm font-semibold text-peligro">{tr(`miPerfil.errores.alias.${errorAlias}` as never)}</p>
            )}
          </div>
          <Campo etiqueta={t("nombre")} ayuda={t("nombreAyuda")} value={v.nombre} maxLength={LIMITES_PERFIL.nombre.max} onChange={(e) => cambiar({ nombre: e.target.value })} error={mensaje("nombre")} />
          <Campo
            etiqueta={t("titular")}
            ayuda={t("titularAyuda")}
            placeholder={t("titularEjemplo")}
            value={v.titular}
            maxLength={LIMITES_PERFIL.titular.max}
            onChange={(e) => cambiar({ titular: e.target.value })}
            error={mensaje("titular")}
          />
          {imagenCuenta ? (
            <Casilla etiqueta={t("mostrarFoto")} checked={v.mostrarFoto} onChange={(e) => cambiar({ mostrarFoto: e.target.checked })} />
          ) : (
            <p className="text-sm text-suave">{t("sinFoto")}</p>
          )}
        </Seccion>

        <Seccion id="seccion-sobre" numero={2} titulo={t("seccionSobre")}>
          <AreaTexto
            etiqueta={t("sobreMi")}
            ayuda={t("sobreMiAyuda", { quedan: LIMITES_PERFIL.sobreMi.max - v.sobreMi.length })}
            rows={6}
            maxLength={LIMITES_PERFIL.sobreMi.max}
            value={v.sobreMi}
            onChange={(e) => cambiar({ sobreMi: e.target.value })}
            error={mensaje("sobreMi")}
          />
        </Seccion>

        <Seccion id="seccion-haces" numero={3} titulo={t("seccionHaces")}>
          <BotonesOpcion nombre="area" etiqueta={t("area")} opciones={AREAS.map((a) => ({ valor: a, texto: tr(`areas.${a}`) }))} valor={v.area} onCambio={(area) => cambiar({ area })} error={mensaje("area")} />
          <BotonesOpcion nombre="seniority" etiqueta={t("seniority")} opciones={SENIORITY.map((s) => ({ valor: s, texto: tr(`seniority.${s}`) }))} valor={v.seniority} onCambio={(seniority) => cambiar({ seniority })} error={mensaje("seniority")} />
          <SelectorTecnologias
            elegidas={v.tecnologias}
            onCambio={(tecnologias) => cambiar({ tecnologias })}
            enElTexto={enElTexto}
            area={v.area}
            maximo={LIMITES_PERFIL.tecnologias.max}
            etiqueta={t("tecnologias")}
            ayuda={t("tecnologiasAyuda", { max: LIMITES_PERFIL.tecnologias.max })}
            error={mensaje("tecnologias")}
          />
        </Seccion>

        <Seccion id="seccion-donde" numero={4} titulo={t("seccionDonde")}>
          <BotonesOpcion
            nombre="disponibilidad"
            etiqueta={t("disponibilidad")}
            opciones={DISPONIBILIDAD.map((d) => ({ valor: d, texto: tr(`disponibilidad.${d}`) }))}
            valor={v.disponibilidad}
            onCambio={(disponibilidad) => cambiar({ disponibilidad })}
            error={mensaje("disponibilidad")}
          />
          <fieldset className="flex flex-col gap-2" aria-describedby={mensaje("modalidades") ? "error-modalidades" : undefined}>
            <legend className="mb-2 text-sm font-bold">{t("modalidades")}</legend>
            <div className="flex flex-wrap gap-2">
              {MODALIDADES.map((m) => {
                const activa = v.modalidades.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => cambiar({ modalidades: activa ? v.modalidades.filter((x) => x !== m) : [...v.modalidades, m] })}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors",
                      activa ? "border-acento bg-acento text-ink" : "border-borde-fuerte hover:border-enlace",
                      mensaje("modalidades") && !activa && "border-peligro",
                    )}
                  >
                    {tr(`modalidades.${m}`)}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-suave">{t("modalidadesAyuda")}</p>
            <TextoError id="error-modalidades">{mensaje("modalidades")}</TextoError>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo etiqueta={t("ciudad")} value={v.ciudad} maxLength={LIMITES_PERFIL.ciudad.max} onChange={(e) => cambiar({ ciudad: e.target.value })} error={mensaje("ciudad")} />
            <div className="flex flex-col gap-2">
              <label htmlFor="pais-perfil" className="text-sm font-bold">
                {t("pais")}
              </label>
              <select id="pais-perfil" value={v.pais} onChange={(e) => cambiar({ pais: e.target.value })} className={cn(clasesControl, "min-h-12 rounded-control px-5")}>
                <option value="">{t("sinPais")}</option>
                {paises.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Seccion>

        <Seccion id="seccion-idiomas" numero={5} titulo={t("seccionIdiomas")} ayuda={t("idiomasAyuda")}>
          <SelectorIdiomas pide={v.idiomas} onCambio={(idiomas) => cambiar({ idiomas })} maximo={LIMITES_PERFIL.idiomas.max} etiqueta={t("seccionIdiomas")} error={mensaje("idiomas")} />
        </Seccion>

        <Seccion id="seccion-enlaces" numero={6} titulo={t("seccionEnlaces")} ayuda={t("enlacesAyuda")}>
          <Campo type="url" etiqueta="LinkedIn" placeholder="linkedin.com/in/…" value={v.linkedin} onChange={(e) => cambiar({ linkedin: e.target.value })} error={mensaje("linkedin")} />
          <Campo type="url" etiqueta="GitHub" placeholder="github.com/…" value={v.github} onChange={(e) => cambiar({ github: e.target.value })} error={mensaje("github")} />
          <Campo type="url" etiqueta={t("portfolio")} placeholder="https://" value={v.portfolio} onChange={(e) => cambiar({ portfolio: e.target.value })} error={mensaje("portfolio")} />
        </Seccion>

        <Seccion id="seccion-visibilidad" numero={7} titulo={t("seccionVisibilidad")}>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t("seccionVisibilidad")}</legend>
            {VISIBILIDAD_PERFIL.map((vis) => (
              <label
                key={vis}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                  v.visibilidad === vis ? "border-acento bg-acento/10" : "border-borde hover:border-borde-fuerte",
                )}
              >
                <input type="radio" name="visibilidad" value={vis} checked={v.visibilidad === vis} onChange={() => cambiar({ visibilidad: vis })} className="mt-1 size-[1.125rem] accent-acento" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-bold">
                    {tr(`visibilidad.${vis}`)}
                    {vis === "registrados" && <span className="ml-2 rounded-full bg-acento px-2 py-0.5 text-xs text-ink">{t("recomendado")}</span>}
                  </span>
                  <span className="text-sm text-suave">{t(`visibilidadAyuda.${vis}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </Seccion>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-28">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("vistaPrevia")}</p>
          <TarjetaPerfil perfil={vista} enlace={false} />
        </div>

        <div className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-tarjeta p-5 shadow-tarjeta">
          <p
            ref={alerta}
            tabIndex={-1}
            role={aviso || (intentado && faltan.length) ? "status" : undefined}
            className={cn(
              "text-sm font-bold outline-none",
              aviso ? (aviso.tono === "bien" ? "text-enlace" : "text-peligro") : faltan.length ? (intentado ? "text-peligro" : "text-texto") : "text-enlace",
            )}
          >
            {aviso ? aviso.texto : faltan.length ? t("faltan", { count: faltan.length }) : t("listo")}
          </p>
          {!aviso && faltan.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {faltan.map((c) => (
                <li key={c}>
                  <a href={`#${SECCION_DE[c] ?? "seccion-tu"}`} className="inline-flex min-h-8 items-center rounded-full bg-chip px-3 text-xs font-bold hover:bg-acento hover:text-ink">
                    {t(`campo.${c}` as "campo.alias")}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <Boton type="submit" tamano="lg" className="w-full" disabled={ocupado}>
            {ocupado ? t("guardando") : guardado ? t("guardar") : t("crear")}
          </Boton>
          {guardado && (
            <Link href={{ pathname: "/talento/[alias]", params: { alias: guardado.alias } }} className={clasesBoton({ variante: "secundario", className: "w-full" })}>
              {t("verComoQueda")}
            </Link>
          )}
        </div>

        {guardado && (
          <div className="flex flex-col gap-3 px-1">
            {borrando ? (
              <>
                <p className="text-sm font-bold">{t("borrarSeguro")}</p>
                <div className="flex flex-wrap gap-2">
                  <Boton type="button" variante="peligro" onClick={borrar} disabled={ocupado}>
                    {t("borrarSi")}
                  </Boton>
                  <Boton type="button" variante="fantasma" onClick={() => ponerBorrando(false)}>
                    {t("cancelar")}
                  </Boton>
                </div>
              </>
            ) : (
              <button type="button" onClick={() => ponerBorrando(true)} className="self-start text-sm font-bold text-peligro underline">
                {t("borrar")}
              </button>
            )}
          </div>
        )}
      </aside>
    </form>
  );
}
