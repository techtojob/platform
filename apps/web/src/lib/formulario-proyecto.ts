import type { DatosProyecto } from "@techtojob/shared";

/** Lo que se escribe en el formulario de un proyecto (los enlaces, tal cual; el API les pone https://). */
export type ValoresProyecto = {
  titulo: string;
  descripcion: string;
  area: string;
  tecnologias: string[];
  repo: string;
  demo: string;
  video: string;
  estado: DatosProyecto["estado"];
};

export const PROYECTO_VACIO: ValoresProyecto = { titulo: "", descripcion: "", area: "", tecnologias: [], repo: "", demo: "", video: "", estado: "terminado" };
