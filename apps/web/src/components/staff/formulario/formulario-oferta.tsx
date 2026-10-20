"use client";

import {
  AREAS,
  COMPROBACIONES,
  detectarIdiomaTexto,
  detectarTecnologias,
  IDIOMAS,
  leerCantidad,
  LIMITES,
  MODALIDADES,
  MONEDAS,
  PAISES,
  SENIORITY,
  validarOferta,
  ZONAS_REMOTO,
  type Comprobacion,
  type EmpresaStaff,
  type OfertaListado,
} from "@techtojob/shared";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { guardarOferta } from "@/app/[locale]/staff/acciones";
import { FilaOferta } from "@/components/ofertas/fila-oferta";
import { Boton, Campo, Casilla } from "@/components/ui";
import { cn } from "@/lib/cn";
import { datosParaApi, VALORES_VACIOS, type ValoresOferta } from "@/lib/formulario-oferta";
import { nombreIdioma } from "@/lib/idiomas-usuario";
import { PasoEnlace } from "./paso-enlace";
import { AreaTexto, BotonesOpcion, clasesControl, Seccion, TextoError } from "@/components/formulario/piezas";
import { SelectorEmpresa } from "./selector-empresa";
import { SelectorIdiomas } from "@/components/formulario/selector-idiomas";
import { SelectorTecnologias } from "@/components/formulario/selector-tecnologias";

/** Donde se guarda el borrador de una oferta nueva, por si se cierra la pestaña. */
const CLAVE_BORRADOR = "ttj-staff-borrador-oferta";
const sinSuscripcion = () => () => {};
function leerBorrador(): string | null {
  try {
    return localStorage.getItem(CLAVE_BORRADOR);
  } catch {
    return null;
  }
}
function guardarBorrador(valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(CLAVE_BORRADOR);
    else localStorage.setItem(CLAVE_BORRADOR, valor);
  } catch {
    /* sin almacenamiento (ventana privada…): no pasa nada */
  }
}

/** Qué campo va en qué sección (para la lista "Falta" y para saltar a ella). */
const SECCION_DE: Record<string, string> = {
  urlOriginal: "seccion-enlace",
  empresaId: "seccion-oferta",
  titulo: "seccion-oferta",
  idioma: "seccion-oferta",
  resumen: "seccion-oferta",
  descripcion: "seccion-oferta",
  area: "seccion-puesto",
  seniority: "seccion-puesto",
  tecnologias: "seccion-puesto",
  modalidad: "seccion-donde",
  remotoDesde: "seccion-donde",
  ciudad: "seccion-donde",
  pais: "seccion-donde",
  salarioMin: "seccion-salario",
  salarioMax: "seccion-salario",
  moneda: "seccion-salario",
  idiomasRequeridos: "seccion-idiomas",
};

type Props = {
  empresas: EmpresaStaff[];
  inicial: ValoresOferta;
  /** null: oferta nueva. */
  ofertaId: string | null;
  /** "Ahora" del servidor, para la vista previa (así no cambia entre servidor y navegador). */
  ahora: number;
};

/**
 * Formulario de una oferta del staff. Todo en una página, en el orden en que se lee una oferta:
 * enlace → la oferta → el puesto → dónde → salario → idiomas. A la derecha (abajo en el móvil),
 * la vista previa en el listado, lo que falta y los botones para guardar o publicar.
 */
export function FormularioOferta({ empresas, inicial, ofertaId, ahora }: Props) {
  const t = useTranslations("staff");
  const tr = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const nueva = ofertaId === null;

  const [v, ponerValores] = useState<ValoresOferta>(inicial);
  const [intentado, intentar] = useState(false);
  const [erroresServidor, ponerErroresServidor] = useState<Record<string, string>>({});
  const [errorGeneral, ponerErrorGeneral] = useState<string | null>(null);
  const [comprobaciones, marcar] = useState<Comprobacion[]>([]);
  const [descartado, descartar] = useState(false);
  const [guardando, empezar] = useTransition();
  const alerta = useRef<HTMLParagraphElement>(null);

  const cambiar = (cambios: Partial<ValoresOferta>) => {
    ponerValores((actual) => ({ ...actual, ...cambios }));
    ponerErroresServidor({});
  };

  // Borrador: lo escrito en una oferta nueva se guarda en este navegador, por si se cierra la pestaña.
  // Al volver, se ofrece seguir con él (no se pone solo: igual se quiere empezar otra).
  const borrador = useSyncExternalStore(sinSuscripcion, leerBorrador, () => null);
  const vacio = JSON.stringify(v) === JSON.stringify(VALORES_VACIOS);
  useEffect(() => {
    if (!nueva || vacio) return;
    const temporizador = setTimeout(() => guardarBorrador(JSON.stringify(v)), 400);
    return () => clearTimeout(temporizador);
  }, [v, nueva, vacio]);

  // Lo que falta o está mal, con las mismas reglas que el API.
  const errores = useMemo(() => {
    const e: Record<string, string> = { ...validarOferta(datosParaApi(v, v.empresa?.id ?? "nueva")).errores };
    if (!v.empresa) e.empresaId = "falta";
    if (!v.sinSalario && !v.salarioMin.trim() && !v.salarioMax.trim()) e.salario = "falta";
    return e;
  }, [v]);
  const visibles = intentado ? { ...errores, ...erroresServidor } : erroresServidor;
  const mensajeError = (campo: string) => {
    const codigo = visibles[campo];
    if (!codigo) return undefined;
    return t.has(`errores.${campo}.${codigo}` as never) ? t(`errores.${campo}.${codigo}` as never) : t(`errores.${codigo}` as "errores.falta");
  };
  const faltan = [...new Set(Object.keys(errores).map((c) => (c.startsWith("salario") || c === "moneda" ? "salario" : c)))];

  const textoOferta = `${v.titulo}\n${v.resumen}\n${v.descripcion}`;
  const enElTexto = useMemo(() => detectarTecnologias(textoOferta), [textoOferta]);
  const idiomaDetectado = useMemo(() => detectarIdiomaTexto(v.descripcion), [v.descripcion]);

  /** Al cambiar el idioma en que está escrita: si "idiomas que pide" era solo el anterior, cambia también. */
  function cambiarIdioma(idioma: string) {
    const soloElAnterior = v.pide.length === 1 && v.pide[0]!.idioma === v.idioma && !v.pide[0]!.nivel;
    cambiar({ idioma, ...(soloElAnterior ? { pide: [{ idioma, nivel: "" }] } : {}) });
  }

  function enviar(publicar: boolean) {
    intentar(true);
    ponerErrorGeneral(null);
    const listos = Object.keys(errores).length === 0 && (!publicar || COMPROBACIONES.every((c) => comprobaciones.includes(c)));
    if (!listos) {
      requestAnimationFrame(() => alerta.current?.focus());
      return;
    }
    empezar(async () => {
      // Si sale bien, el servidor lleva a la oferta; el borrador ya no hace falta.
      if (nueva) guardarBorrador(null);
      const r = await guardarOferta(ofertaId, v, publicar ? comprobaciones : null, locale);
      if (r?.errores) ponerErroresServidor(r.errores);
      if (r?.error) ponerErrorGeneral(r.error);
      if (r?.errores || r?.error) requestAnimationFrame(() => alerta.current?.focus());
    });
  }

  // Vista previa: la oferta tal y como saldrá en el listado.
  const salarioMin = v.sinSalario ? null : leerCantidad(v.salarioMin);
  const salarioMax = v.sinSalario ? null : leerCantidad(v.salarioMax);
  const vista: OfertaListado = {
    id: "vista",
    slug: "vista-previa",
    titulo: v.titulo || t("form.vistaTitulo"),
    resumen: v.resumen || null,
    idioma: (IDIOMAS as readonly string[]).includes(v.idioma) ? (v.idioma as OfertaListado["idioma"]) : "es",
    empresa: { nombre: v.empresa?.nombre || t("form.vistaEmpresa"), slug: "", logoUrl: null },
    area: (v.area || "desarrollo") as OfertaListado["area"],
    seniority: (v.seniority || "junior") as OfertaListado["seniority"],
    modalidad: (v.modalidad || "presencial") as OfertaListado["modalidad"],
    tecnologias: v.tecnologias,
    pais: v.modalidad === "remoto" ? null : v.pais || null,
    ciudad: v.modalidad === "remoto" ? null : v.ciudad || null,
    remotoDesde: v.modalidad === "remoto" ? v.remotoDesde || null : null,
    salario: salarioMin || salarioMax ? { min: salarioMin, max: salarioMax, moneda: v.moneda } : null,
    idiomasRequeridos: v.pide.map((p) => ({ idioma: p.idioma as never, nivel: (p.nivel || null) as never })),
    publicadaEn: new Date(ahora).toISOString(),
  };

  const paises = useMemo(() => {
    const nombres = new Intl.DisplayNames([locale], { type: "region" });
    return PAISES.map((c) => ({ codigo: c, nombre: nombres.of(c) ?? c })).sort((a, b) =>
      a.codigo === "ES" ? -1 : b.codigo === "ES" ? 1 : a.nombre.localeCompare(b.nombre, locale),
    );
  }, [locale]);

  const cifra = (n: number | null) => (n == null ? null : format.number(n, { style: "currency", currency: v.moneda, maximumFractionDigits: 0 }));
  const lecturaSalario = [cifra(salarioMin), cifra(salarioMax)].filter(Boolean).join(" – ");
  const todasMarcadas = COMPROBACIONES.every((c) => comprobaciones.includes(c));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        enviar(false);
      }}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start"
    >
      <div className="flex min-w-0 flex-col gap-6">
        {nueva && borrador && vacio && !descartado && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-postit px-4 py-3 text-sm font-bold text-ink">
            {t("form.hayBorrador")}
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    ponerValores({ ...VALORES_VACIOS, ...(JSON.parse(borrador) as Partial<ValoresOferta>) });
                  } catch {
                    guardarBorrador(null);
                  }
                }}
                className="min-h-10 rounded-full bg-ink px-4 text-white hover:bg-acento hover:text-ink"
              >
                {t("form.seguirBorrador")}
              </button>
              <button
                type="button"
                onClick={() => {
                  guardarBorrador(null);
                  descartar(true);
                }}
                className="min-h-10 rounded-full px-3 underline hover:bg-ink/10"
              >
                {t("form.descartarBorrador")}
              </button>
            </span>
          </div>
        )}

        <Seccion id="seccion-enlace" numero={1} titulo={t("form.seccionEnlace")} ayuda={nueva ? t("form.seccionEnlaceAyuda") : undefined}>
          <PasoEnlace valores={v} onCambio={(n) => { ponerValores(n); ponerErroresServidor({}); }} ofertaId={ofertaId} error={mensajeError("urlOriginal")} />
        </Seccion>

        <Seccion id="seccion-oferta" numero={2} titulo={t("form.seccionOferta")}>
          <SelectorEmpresa empresas={empresas} valor={v.empresa} onCambio={(empresa) => cambiar({ empresa })} error={mensajeError("empresaId")} />
          <div className="flex flex-col gap-1 rounded-2xl border border-borde p-3">
            <Casilla etiqueta={t("form.autorizada")} checked={v.autorizada} onChange={(e) => cambiar({ autorizada: e.target.checked })} />
            <p className="pl-8 text-sm text-suave">{t("form.autorizadaAyuda")}</p>
          </div>
          <Campo
            etiqueta={t("form.titulo")}
            value={v.titulo}
            maxLength={LIMITES.titulo.max}
            onChange={(e) => cambiar({ titulo: e.target.value })}
            error={mensajeError("titulo")}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="idioma-oferta" className="text-sm font-bold">
              {t("form.idioma")}
            </label>
            <select
              id="idioma-oferta"
              value={v.idioma}
              onChange={(e) => cambiarIdioma(e.target.value)}
              className={cn(clasesControl, "min-h-12 rounded-control px-5")}
            >
              {IDIOMAS.map((i) => (
                <option key={i} value={i}>
                  {nombreIdioma(i, locale)}
                </option>
              ))}
            </select>
            {idiomaDetectado && idiomaDetectado !== v.idioma ? (
              <p className="text-sm text-suave">
                {t("form.pareceEstarEn", { idioma: nombreIdioma(idiomaDetectado, locale, { enFrase: true }) })}{" "}
                <button type="button" onClick={() => cambiarIdioma(idiomaDetectado)} className="font-bold text-enlace underline">
                  {t("form.cambiarA", { idioma: nombreIdioma(idiomaDetectado, locale, { enFrase: true }) })}
                </button>
              </p>
            ) : (
              <p className="text-sm text-suave">{t("form.idiomaAyuda")}</p>
            )}
          </div>
          <AreaTexto
            etiqueta={t("form.resumen")}
            ayuda={t("form.resumenAyuda", { max: LIMITES.resumen.max, quedan: LIMITES.resumen.max - v.resumen.length })}
            rows={2}
            maxLength={LIMITES.resumen.max}
            value={v.resumen}
            onChange={(e) => cambiar({ resumen: e.target.value })}
            error={mensajeError("resumen")}
          />
          <AreaTexto
            etiqueta={t("form.descripcion")}
            ayuda={t("form.descripcionAyuda")}
            rows={8}
            maxLength={LIMITES.descripcion.max}
            value={v.descripcion}
            onChange={(e) => cambiar({ descripcion: e.target.value })}
            error={mensajeError("descripcion")}
          />
        </Seccion>

        <Seccion id="seccion-puesto" numero={3} titulo={t("form.seccionPuesto")}>
          <BotonesOpcion
            nombre="area"
            etiqueta={t("form.area")}
            opciones={AREAS.map((a) => ({ valor: a, texto: tr(`areas.${a}`) }))}
            valor={v.area}
            onCambio={(area) => cambiar({ area })}
            error={mensajeError("area")}
          />
          <BotonesOpcion
            nombre="seniority"
            etiqueta={t("form.seniority")}
            opciones={SENIORITY.map((s) => ({ valor: s, texto: tr(`seniority.${s}`) }))}
            valor={v.seniority}
            onCambio={(seniority) => cambiar({ seniority })}
            error={mensajeError("seniority")}
          />
          <SelectorTecnologias
            elegidas={v.tecnologias}
            onCambio={(tecnologias) => cambiar({ tecnologias })}
            enElTexto={enElTexto}
            ayuda={t("form.tecnologiasAyuda", { max: LIMITES.tecnologias.max })}
            area={v.area}
            error={mensajeError("tecnologias")}
          />
        </Seccion>

        <Seccion id="seccion-donde" numero={4} titulo={t("form.seccionDonde")}>
          <BotonesOpcion
            nombre="modalidad"
            etiqueta={t("form.modalidad")}
            opciones={MODALIDADES.map((m) => ({ valor: m, texto: tr(`modalidades.${m}`) }))}
            valor={v.modalidad}
            onCambio={(modalidad) => cambiar({ modalidad })}
            error={mensajeError("modalidad")}
          />
          {v.modalidad === "remoto" && (
            <BotonesOpcion
              nombre="remotoDesde"
              etiqueta={t("form.remotoDesde")}
              opciones={ZONAS_REMOTO.map((z) => ({ valor: z, texto: tr(`regiones.${z}`) }))}
              valor={v.remotoDesde}
              onCambio={(remotoDesde) => cambiar({ remotoDesde })}
              error={mensajeError("remotoDesde")}
            />
          )}
          {(v.modalidad === "hibrido" || v.modalidad === "presencial") && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo
                etiqueta={t("form.ciudad")}
                value={v.ciudad}
                maxLength={LIMITES.ciudad.max}
                onChange={(e) => cambiar({ ciudad: e.target.value })}
                error={mensajeError("ciudad")}
              />
              <div className="flex flex-col gap-2">
                <label htmlFor="pais-oferta" className="text-sm font-bold">
                  {t("form.pais")}
                </label>
                <select
                  id="pais-oferta"
                  value={v.pais}
                  onChange={(e) => cambiar({ pais: e.target.value })}
                  className={cn(clasesControl, "min-h-12 rounded-control px-5")}
                >
                  <option value="">{t("form.sinPais")}</option>
                  {paises.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {!v.modalidad && <p className="text-sm text-suave">{t("form.eligeModalidad")}</p>}
        </Seccion>

        <Seccion id="seccion-salario" numero={5} titulo={t("form.seccionSalario")} ayuda={t("form.salarioAyuda")}>
          <div className={cn("grid gap-5 sm:grid-cols-2", v.sinSalario && "opacity-50")}>
            <Campo
              etiqueta={t("form.salarioMin")}
              inputMode="decimal"
              placeholder={t("form.salarioEjemploMin")}
              value={v.salarioMin}
              disabled={v.sinSalario}
              onChange={(e) => cambiar({ salarioMin: e.target.value })}
              error={mensajeError("salarioMin")}
            />
            <Campo
              etiqueta={t("form.salarioMax")}
              inputMode="decimal"
              placeholder={t("form.salarioEjemploMax")}
              value={v.salarioMax}
              disabled={v.sinSalario}
              onChange={(e) => cambiar({ salarioMax: e.target.value })}
              error={mensajeError("salarioMax")}
            />
          </div>
          {!v.sinSalario && (
            <BotonesOpcion
              nombre="moneda"
              etiqueta={t("form.moneda")}
              opciones={MONEDAS.map((m) => ({ valor: m, texto: m }))}
              valor={v.moneda}
              onCambio={(moneda) => cambiar({ moneda })}
              error={mensajeError("moneda")}
              pequenos
            />
          )}
          {!v.sinSalario && lecturaSalario && (
            <p className="text-sm font-bold" aria-live="polite">
              {t("form.salarioLeido", { salario: lecturaSalario })}
            </p>
          )}
          <Casilla
            etiqueta={t("form.sinSalario")}
            checked={v.sinSalario}
            onChange={(e) => cambiar({ sinSalario: e.target.checked })}
          />
          <TextoError>{mensajeError("salario")}</TextoError>
        </Seccion>

        <Seccion id="seccion-idiomas" numero={6} titulo={t("form.idiomasQuePide")} ayuda={t("form.idiomasQuePideAyuda")}>
          <SelectorIdiomas pide={v.pide} onCambio={(pide) => cambiar({ pide })} error={mensajeError("idiomasRequeridos")} etiqueta={t("form.idiomasQuePide")} />
        </Seccion>
      </div>

      {/* A la derecha: vista previa, lo que falta y guardar */}
      <aside className="flex flex-col gap-5 lg:sticky lg:top-28">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("form.vistaPrevia")}</p>
          {/* inert: es solo para mirar, no se puede pulsar */}
          <div inert className="pointer-events-none">
            <FilaOferta oferta={vista} ahora={ahora} />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-tarjeta p-5 shadow-tarjeta">
          <p
            ref={alerta}
            tabIndex={-1}
            role={intentado && (faltan.length > 0 || errorGeneral) ? "alert" : undefined}
            className={cn("text-sm font-bold outline-none", faltan.length ? (intentado ? "text-peligro" : "text-texto") : "text-enlace")}
          >
            {errorGeneral ? t("errorGeneral") : faltan.length ? t("form.faltan", { count: faltan.length }) : t("form.listo")}
          </p>
          {faltan.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {faltan.map((c) => (
                <li key={c}>
                  <a
                    href={`#${SECCION_DE[c] ?? "seccion-salario"}`}
                    className="inline-flex min-h-8 items-center rounded-full bg-chip px-3 text-xs font-bold hover:bg-acento hover:text-ink"
                  >
                    {t(`form.campo.${c}` as "form.campo.titulo")}
                  </a>
                </li>
              ))}
            </ul>
          )}

          {nueva ? (
            <>
              <fieldset className="flex flex-col gap-1 border-t border-borde pt-4">
                <legend className="mb-1 pt-4 text-xs font-bold uppercase tracking-[0.12em] text-suave">{t("acciones.antesDePublicar")}</legend>
                {COMPROBACIONES.map((c) => (
                  <Casilla
                    key={c}
                    etiqueta={t(`comprobaciones.${c}`)}
                    checked={comprobaciones.includes(c)}
                    onChange={(e) => marcar((m) => (e.target.checked ? [...m, c] : m.filter((x) => x !== c)))}
                    className="items-start py-1 [&>input]:mt-0.5"
                  />
                ))}
              </fieldset>
              <Boton type="button" tamano="lg" className="w-full" disabled={guardando || !todasMarcadas} onClick={() => enviar(true)}>
                {guardando ? t("guardando") : t("form.crearYPublicar")}
              </Boton>
              {!todasMarcadas && <p className="-mt-2 text-xs text-suave">{t("form.paraPublicar")}</p>}
              <Boton type="submit" variante="secundario" className="w-full" disabled={guardando}>
                {t("form.guardarPendiente")}
              </Boton>
              <p className="-mt-2 text-xs text-suave">{t("form.guardarPendienteAyuda")}</p>
            </>
          ) : (
            <Boton type="submit" tamano="lg" className="w-full" disabled={guardando}>
              {guardando ? t("guardando") : t("guardarCambios")}
            </Boton>
          )}
        </div>
      </aside>
    </form>
  );
}
