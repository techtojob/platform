"use client";

import {
  aliasValido,
  AREAS,
  detectarTecnologias,
  DISPONIBILIDAD,
  LIMITES_PERFIL,
  MODALIDADES,
  PAISES,
  fotoElegida,
  MAXIMO_ANOS_EXPERIENCIA,
  nivelPorExperiencia,
  type Disponibilidad,
  type FotosCuenta,
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
import { Boton, Campo, Casilla, ChipFiltro, clasesBoton } from "@/components/ui";
import { ElegirFoto } from "./elegir-foto";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { limpiarAlias, perfilParaApi, type ValoresPerfil } from "@/lib/formulario-perfil";
import { TarjetaPerfil } from "./tarjeta-perfil";

const SECCION_DE: Record<string, string> = {
  alias: "seccion-tu", nombre: "seccion-tu", titular: "seccion-tu",
  sobreMi: "seccion-sobre", area: "seccion-haces", otrasAreas: "seccion-haces", anosExperiencia: "seccion-haces", tecnologias: "seccion-haces",
  ciudad: "seccion-donde", pais: "seccion-donde", modalidades: "seccion-donde", disponibilidad: "seccion-donde",
  idiomas: "seccion-idiomas", linkedin: "seccion-enlaces", github: "seccion-enlaces", portfolio: "seccion-enlaces",
  visibilidad: "seccion-visibilidad",
};

type Props = {
  inicial: ValoresPerfil;
  /** El perfil guardado (null si aún no hay): para "ver cómo queda" y "borrar". */
  guardado: { alias: string; actualizadoEn: string } | null;
  /** Las fotos de sus cuentas de Google y GitHub, para elegir cuál enseñar. */
  fotos: FotosCuenta;
  verificado: boolean;
  dominio: string;
};

/**
 * "Mi perfil": lo que la gente verá en Talento. Todo en una página; a la derecha,
 * cómo queda la tarjeta en el buscador, lo que falta, guardar y ver el perfil.
 */
export function FormularioPerfil({ inicial, guardado: guardadoInicial, fotos, verificado, dominio }: Props) {
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
      if (r.error) ponerAviso({ tono: "mal", texto: r.error === "sin_verificar" ? t("errorSinVerificar") : t("errorGuardar") });
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
    imagen: fotoElegida(v.foto, fotos),
    area: (v.area || "desarrollo") as PerfilListado["area"],
    otrasAreas: v.otrasAreas.filter((a) => a !== v.area) as PerfilListado["otrasAreas"],
    seniority: v.anosExperiencia === "" ? "junior" : nivelPorExperiencia(Number(v.anosExperiencia), v.lidera),
    anosExperiencia: v.anosExperiencia === "" ? null : Number(v.anosExperiencia),
    ciudad: v.ciudad || null,
    pais: v.pais || null,
    modalidades: v.modalidades as PerfilListado["modalidades"],
    disponibilidad: (v.disponibilidad || "abierto") as PerfilListado["disponibilidad"],
    tecnologias: v.tecnologias,
    verificado,
    emblemas: [],
    megusta: 0,
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
          <ElegirFoto
            valor={v.foto}
            fotos={fotos}
            nombre={v.nombre}
            disponibilidad={(v.disponibilidad || "no-busca") as Disponibilidad}
            onCambio={(foto) => cambiar({ foto })}
          />
        </Seccion>

        <Seccion id="seccion-sobre" numero={2} titulo={t("seccionSobre")}>
          <AreaTexto
            etiqueta={t("sobreMi")}
            ayuda={t("sobreMiAyuda")}
            rows={8}
            maxLength={LIMITES_PERFIL.sobreMi.max}
            contador
            value={v.sobreMi}
            onChange={(e) => cambiar({ sobreMi: e.target.value })}
            error={mensaje("sobreMi")}
          />
        </Seccion>

        <Seccion id="seccion-haces" numero={3} titulo={t("seccionHaces")}>
          <BotonesOpcion
            nombre="area"
            etiqueta={t("area")}
            opciones={AREAS.map((a) => ({ valor: a, texto: tr(`areas.${a}`) }))}
            valor={v.area}
            // La principal no puede estar también entre las otras.
            onCambio={(area) => cambiar({ area, otrasAreas: v.otrasAreas.filter((x) => x !== area) })}
            error={mensaje("area")}
          />
          {/* Otras áreas (opcional): "Desarrollo y también Producto y diseño". */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-bold">{t("otrasAreas")}</legend>
            <p className="text-sm text-suave">{t("otrasAreasAyuda", { max: LIMITES_PERFIL.otrasAreas.max })}</p>
            <div className="flex flex-wrap gap-2">
              {AREAS.filter((a) => a !== v.area).map((a) => {
                const marcada = v.otrasAreas.includes(a);
                const lleno = !marcada && v.otrasAreas.length >= LIMITES_PERFIL.otrasAreas.max;
                return (
                  <ChipFiltro
                    key={a}
                    type="button"
                    activo={marcada}
                    disabled={lleno}
                    onClick={() => cambiar({ otrasAreas: marcada ? v.otrasAreas.filter((x) => x !== a) : [...v.otrasAreas, a] })}
                  >
                    {tr(`areas.${a}`)}
                  </ChipFiltro>
                );
              })}
            </div>
            <TextoError>{mensaje("otrasAreas")}</TextoError>
          </fieldset>
          {/* El nivel no se elige: sale de los años de experiencia (y de si ha liderado). */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="anos-experiencia" className="text-sm font-bold">
                {t("anos")}
              </label>
              <select
                id="anos-experiencia"
                value={v.anosExperiencia}
                onChange={(e) => cambiar({ anosExperiencia: e.target.value })}
                aria-invalid={mensaje("anosExperiencia") ? true : undefined}
                className={cn(clasesControl, "min-h-12 rounded-control px-5 sm:max-w-xs")}
              >
                <option value="">{t("anosElige")}</option>
                {Array.from({ length: MAXIMO_ANOS_EXPERIENCIA + 1 }, (_, n) => (
                  <option key={n} value={String(n)}>
                    {t("anosOpcion", { anos: n })}
                  </option>
                ))}
              </select>
              <p className="text-sm text-suave">{t("anosAyuda")}</p>
              <TextoError>{mensaje("anosExperiencia")}</TextoError>
            </div>
            <Casilla etiqueta={t("lidera")} checked={v.lidera} onChange={(e) => cambiar({ lidera: e.target.checked })} />
            {v.anosExperiencia !== "" && (
              <p className="text-sm font-bold" aria-live="polite">
                {t("nivelCalculado", { nivel: tr(`seniority.${nivelPorExperiencia(Number(v.anosExperiencia), v.lidera)}`) })}
              </p>
            )}
          </div>
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
