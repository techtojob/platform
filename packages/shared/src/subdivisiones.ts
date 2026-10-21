/**
 * Comunidades autónomas, estados, provincias, departamentos o regiones de España y Latinoamérica:
 * se pide al completar la cuenta (país + región). Para otros países no se pide región.
 * Se guarda el identificador (el nombre en minúsculas y sin acentos: "canarias", "jalisco").
 * Los nombres son propios: se enseñan igual en español y en inglés.
 */
export const SUBDIVISIONES: Record<string, readonly string[]> = {
  ES: [
    "Andalucía", "Aragón", "Asturias", "Illes Balears", "Canarias", "Cantabria", "Castilla y León",
    "Castilla-La Mancha", "Cataluña", "Comunitat Valenciana", "Extremadura", "Galicia", "Comunidad de Madrid",
    "Región de Murcia", "Navarra", "País Vasco", "La Rioja", "Ceuta", "Melilla",
  ],
  MX: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
    "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo",
    "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo",
    "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
  ],
  AR: [
    "Ciudad Autónoma de Buenos Aires", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
    "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro",
    "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
  ],
  CO: [
    "Bogotá D.C.", "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá", "Caldas", "Caquetá",
    "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira",
    "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
    "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada",
  ],
  CL: [
    "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Región Metropolitana",
    "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes",
  ],
  PE: [
    "Lima Metropolitana", "Lima (región)", "Callao", "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho",
    "Cajamarca", "Cusco", "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Loreto",
    "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
  ],
  VE: [
    "Distrito Capital", "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes",
    "Delta Amacuro", "Falcón", "Guárico", "La Guaira", "Lara", "Mérida", "Miranda", "Monagas", "Nueva Esparta",
    "Portuguesa", "Sucre", "Táchira", "Trujillo", "Yaracuy", "Zulia",
  ],
  EC: [
    "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas",
    "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha",
    "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe",
  ],
  BO: ["Beni", "Chuquisaca", "Cochabamba", "La Paz", "Oruro", "Pando", "Potosí", "Santa Cruz", "Tarija"],
  PY: [
    "Asunción", "Alto Paraguay", "Alto Paraná", "Amambay", "Boquerón", "Caaguazú", "Caazapá", "Canindeyú", "Central",
    "Concepción", "Cordillera", "Guairá", "Itapúa", "Misiones", "Ñeembucú", "Paraguarí", "Presidente Hayes", "San Pedro",
  ],
  UY: [
    "Montevideo", "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
    "Maldonado", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres",
  ],
  CR: ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"],
  PA: [
    "Panamá", "Panamá Oeste", "Bocas del Toro", "Chiriquí", "Coclé", "Colón", "Darién", "Herrera", "Los Santos",
    "Veraguas", "Emberá-Wounaan", "Guna Yala", "Ngäbe-Buglé", "Naso Tjër Di",
  ],
  GT: [
    "Guatemala", "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", "Escuintla",
    "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", "Petén", "Quetzaltenango", "Quiché", "Retalhuleu",
    "Sacatepéquez", "San Marcos", "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa",
  ],
  HN: [
    "Atlántida", "Choluteca", "Colón", "Comayagua", "Copán", "Cortés", "El Paraíso", "Francisco Morazán",
    "Gracias a Dios", "Intibucá", "Islas de la Bahía", "La Paz", "Lempira", "Ocotepeque", "Olancho",
    "Santa Bárbara", "Valle", "Yoro",
  ],
  SV: [
    "San Salvador", "Ahuachapán", "Cabañas", "Chalatenango", "Cuscatlán", "La Libertad", "La Paz", "La Unión",
    "Morazán", "San Miguel", "San Vicente", "Santa Ana", "Sonsonate", "Usulután",
  ],
  NI: [
    "Managua", "Boaco", "Carazo", "Chinandega", "Chontales", "Costa Caribe Norte", "Costa Caribe Sur", "Estelí",
    "Granada", "Jinotega", "León", "Madriz", "Masaya", "Matagalpa", "Nueva Segovia", "Río San Juan", "Rivas",
  ],
  CU: [
    "La Habana", "Pinar del Río", "Artemisa", "Mayabeque", "Matanzas", "Cienfuegos", "Villa Clara", "Sancti Spíritus",
    "Ciego de Ávila", "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba", "Guantánamo", "Isla de la Juventud",
  ],
  DO: [
    "Distrito Nacional", "Santo Domingo", "Azua", "Bahoruco", "Barahona", "Dajabón", "Duarte", "El Seibo",
    "Elías Piña", "Espaillat", "Hato Mayor", "Hermanas Mirabal", "Independencia", "La Altagracia", "La Romana",
    "La Vega", "María Trinidad Sánchez", "Monseñor Nouel", "Monte Cristi", "Monte Plata", "Pedernales", "Peravia",
    "Puerto Plata", "Samaná", "San Cristóbal", "San José de Ocoa", "San Juan", "San Pedro de Macorís",
    "Sánchez Ramírez", "Santiago", "Santiago Rodríguez", "Valverde",
  ],
  BR: [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás",
    "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco",
    "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina",
    "São Paulo", "Sergipe", "Tocantins",
  ],
};

/** "Castilla-La Mancha" → "castilla-la-mancha"; "O'Higgins" → "ohiggins". */
export const idSubdivision = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Las de un país, ordenadas como en la lista (la capital o la más habitual primero en algunos). */
export function subdivisionesDe(pais: string | null | undefined): Array<{ id: string; nombre: string }> {
  return (SUBDIVISIONES[(pais ?? "").toUpperCase()] ?? []).map((nombre) => ({ id: idSubdivision(nombre), nombre }));
}

/** ¿Hay que pedir región para este país? (España y Latinoamérica, salvo Puerto Rico). */
export const pideRegion = (pais: string | null | undefined) => subdivisionesDe(pais).length > 0;

/** El nombre de una región a partir de su identificador (o null si no existe en ese país). */
export function nombreSubdivision(pais: string | null | undefined, id: string | null | undefined): string | null {
  return subdivisionesDe(pais).find((s) => s.id === id)?.nombre ?? null;
}

/**
 * Comprueba país y región para la cuenta. Devuelve los datos limpios o el campo que falla:
 * { error: "pais" } (falta o no existe) · { error: "region" } (falta o no es de ese país).
 */
export function validarUbicacion(
  entrada: { pais?: unknown; region?: unknown },
  paisesValidos: readonly string[],
): { pais: string; region: string | null } | { error: "pais" | "region" } {
  const pais = typeof entrada.pais === "string" ? entrada.pais.trim().toUpperCase() : "";
  if (!paisesValidos.includes(pais)) return { error: "pais" };
  if (!pideRegion(pais)) return { pais, region: null };
  const region = typeof entrada.region === "string" ? entrada.region.trim() : "";
  if (!subdivisionesDe(pais).some((s) => s.id === region)) return { error: "region" };
  return { pais, region };
}
