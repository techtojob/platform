import { useTranslations } from "next-intl";

/**
 * Pantalla de carga de una página: la portada (migas, título y entradilla) y, debajo, el contenido
 * en gris. Sale al momento al pulsar un enlace (loading.tsx), mientras llega la página de verdad.
 * - "listado": buscador y rejilla de tarjetas (Ofertas, Talento, Proyectos).
 * - "formulario": una columna de bloques (Mi cuenta, formularios).
 */
export function CargandoPagina({ tipo = "listado" }: { tipo?: "listado" | "formulario" }) {
  const t = useTranslations("cargando");
  const gris = "animate-pulse rounded-tarjeta bg-tarjeta motion-reduce:animate-none";
  return (
    <main id="contenido" aria-busy="true" className="flex flex-1 flex-col">
      <p className="sr-only" role="status">
        {t("texto")}
      </p>
      {/* La portada, con la misma altura que la de verdad para que nada salte al llegar. */}
      <section className="fondo-portada -mt-[4.25rem] px-[var(--margen)] pb-8 pt-[calc(4.25rem+clamp(1.25rem,3vw,2.25rem))] min-[50rem]:-mt-[5.25rem] min-[50rem]:pt-[calc(5.25rem+clamp(1.25rem,3vw,2.25rem))]">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-4">
          <div className={`h-4 w-48 ${gris}`} />
          <div className={`h-12 w-full max-w-xl ${gris}`} />
          <div className={`h-5 w-full max-w-2xl ${gris}`} />
        </div>
      </section>
      <section className="rejilla flex-1 px-[var(--margen)] py-10">
        {tipo === "listado" ? (
          <div className="mx-auto grid max-w-[80rem] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
            <div className={`hidden h-[28rem] lg:block ${gris}`} />
            <div className="flex flex-col gap-4">
              <div className={`h-14 ${gris}`} />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={`h-44 ${gris}`} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={`h-40 ${gris}`} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
