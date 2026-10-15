import type { Area } from "./listas";

/**
 * Lista cerrada de tecnologías con sus alias.
 *
 * Los alias permiten que "ReactJS" o "react.js" se guarden como "react", para que
 * los filtros funcionen. Para añadir una tecnología, abre un PR que añada una
 * entrada a esta lista. Los `id` no se cambian una vez en producción.
 *
 * Es una lista inicial: el equipo la irá ampliando.
 */
export interface Tecnologia {
  id: string;
  nombre: string;
  alias: readonly string[];
  areas: readonly Area[];
}

export const TECNOLOGIAS = [
  // Lenguajes
  { id: "javascript", nombre: "JavaScript", alias: ["js", "ecmascript"], areas: ["desarrollo"] },
  { id: "typescript", nombre: "TypeScript", alias: ["ts"], areas: ["desarrollo"] },
  { id: "python", nombre: "Python", alias: ["py", "python3"], areas: ["desarrollo", "datos-ia"] },
  { id: "java", nombre: "Java", alias: [], areas: ["desarrollo"] },
  { id: "csharp", nombre: "C#", alias: ["c sharp", "csharp"], areas: ["desarrollo"] },
  { id: "php", nombre: "PHP", alias: [], areas: ["desarrollo"] },
  { id: "go", nombre: "Go", alias: ["golang"], areas: ["desarrollo", "infra-devops"] },
  { id: "rust", nombre: "Rust", alias: [], areas: ["desarrollo"] },
  { id: "kotlin", nombre: "Kotlin", alias: [], areas: ["desarrollo"] },
  { id: "swift", nombre: "Swift", alias: [], areas: ["desarrollo"] },
  { id: "sql", nombre: "SQL", alias: [], areas: ["desarrollo", "datos-ia"] },

  // Frontend
  { id: "react", nombre: "React", alias: ["reactjs", "react.js"], areas: ["desarrollo"] },
  { id: "nextjs", nombre: "Next.js", alias: ["next", "next.js"], areas: ["desarrollo"] },
  { id: "vue", nombre: "Vue", alias: ["vuejs", "vue.js"], areas: ["desarrollo"] },
  { id: "angular", nombre: "Angular", alias: ["angularjs"], areas: ["desarrollo"] },
  { id: "svelte", nombre: "Svelte", alias: ["sveltekit"], areas: ["desarrollo"] },
  { id: "tailwind", nombre: "Tailwind CSS", alias: ["tailwindcss", "tailwind"], areas: ["desarrollo"] },

  // Backend
  { id: "nodejs", nombre: "Node.js", alias: ["node", "node.js"], areas: ["desarrollo"] },
  { id: "spring", nombre: "Spring", alias: ["spring boot", "springboot"], areas: ["desarrollo"] },
  { id: "django", nombre: "Django", alias: [], areas: ["desarrollo"] },
  { id: "fastapi", nombre: "FastAPI", alias: [], areas: ["desarrollo"] },
  { id: "laravel", nombre: "Laravel", alias: [], areas: ["desarrollo"] },
  { id: "dotnet", nombre: ".NET", alias: ["dotnet", "asp.net"], areas: ["desarrollo"] },

  // Datos e IA
  { id: "postgresql", nombre: "PostgreSQL", alias: ["postgres", "psql"], areas: ["desarrollo", "datos-ia"] },
  { id: "mongodb", nombre: "MongoDB", alias: ["mongo"], areas: ["desarrollo", "datos-ia"] },
  { id: "spark", nombre: "Apache Spark", alias: ["spark", "pyspark"], areas: ["datos-ia"] },
  { id: "airflow", nombre: "Apache Airflow", alias: ["airflow"], areas: ["datos-ia"] },
  { id: "dbt", nombre: "dbt", alias: [], areas: ["datos-ia"] },
  { id: "pandas", nombre: "pandas", alias: [], areas: ["datos-ia"] },
  { id: "power-bi", nombre: "Power BI", alias: ["powerbi"], areas: ["datos-ia"] },
  { id: "pytorch", nombre: "PyTorch", alias: ["torch"], areas: ["datos-ia"] },
  { id: "tensorflow", nombre: "TensorFlow", alias: ["tf"], areas: ["datos-ia"] },

  // Infra y DevOps
  { id: "docker", nombre: "Docker", alias: [], areas: ["infra-devops", "desarrollo"] },
  { id: "kubernetes", nombre: "Kubernetes", alias: ["k8s"], areas: ["infra-devops"] },
  { id: "aws", nombre: "AWS", alias: ["amazon web services"], areas: ["infra-devops"] },
  { id: "azure", nombre: "Azure", alias: ["microsoft azure"], areas: ["infra-devops"] },
  { id: "gcp", nombre: "Google Cloud", alias: ["gcp", "google cloud platform"], areas: ["infra-devops"] },
  { id: "terraform", nombre: "Terraform", alias: [], areas: ["infra-devops"] },
  { id: "linux", nombre: "Linux", alias: [], areas: ["infra-devops", "soporte-it"] },

  // Ciberseguridad
  { id: "pentesting", nombre: "Pentesting", alias: ["pentest", "ethical hacking"], areas: ["ciberseguridad"] },
  { id: "siem", nombre: "SIEM", alias: [], areas: ["ciberseguridad"] },

  // Producto y Diseño
  { id: "figma", nombre: "Figma", alias: [], areas: ["producto-diseno"] },
] as const satisfies readonly Tecnologia[];

export type TecnologiaId = (typeof TECNOLOGIAS)[number]["id"];

const normalizar = (texto: string) =>
  texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Traduce lo que escribe un usuario o lo que llega de una oferta a una tecnología
 * de la lista. Devuelve `undefined` si no la conoce.
 *
 * @example buscarTecnologia("ReactJS") // → la entrada de "react"
 */
export function buscarTecnologia(texto: string): Tecnologia | undefined {
  const buscado = normalizar(texto);
  return TECNOLOGIAS.find(
    (t) =>
      t.id === buscado ||
      normalizar(t.nombre) === buscado ||
      t.alias.some((a) => normalizar(a) === buscado),
  );
}
