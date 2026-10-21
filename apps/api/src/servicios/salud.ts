/**
 * Lógica pura, sin nada de Hono: recibe datos y devuelve datos.
 * Así se puede probar sola y, si algún día cambiamos de framework,
 * esta carpeta se queda tal cual.
 */
export type EstadoSalud = { estado: "ok"; servicio: "techtojob-api"; fecha: string };

export function comprobarSalud(ahora: Date = new Date()): EstadoSalud {
  return { estado: "ok", servicio: "techtojob-api", fecha: ahora.toISOString() };
}
