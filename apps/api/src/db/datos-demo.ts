import { mesDe, nivelPorExperiencia, slugProyecto, type Area, type Disponibilidad, type Modalidad } from "@techtojob/shared";
import { inArray, like, or } from "drizzle-orm";
import type { Db } from "./cliente";
import {
  cuentas,
  emblemas,
  empresas,
  estadoDiscord,
  megustaPortfolios,
  megustaProyectos,
  ofertaIdiomas,
  ofertas,
  perfiles,
  portfolios,
  proyectos,
  recruiters,
  reportes,
  reportesPerfil,
  usuarios,
} from "./esquema";

/**
 * Datos de demostración para ver la bolsa llena en local: personas con perfil, recruiters, ofertas en
 * todos los estados, proyectos, portfolios, me gusta, "Tu portfolio a juicio" y reportes.
 *
 * - Todo lo inventado lleva un prefijo ("demo-usr-…", "demo-emp-…", ofertas "demo0001"…) y emails
 *   @demo.techtojob.invalid: nadie puede entrar con esas cuentas.
 * - Cargarlo otra vez lo deja igual (primero quita lo de antes). No toca nada real.
 * - Solo para la rama dev de Neon: `pnpm --filter api db:demo` y `pnpm --filter api db:quitar-demo`.
 */

const DIA = 86_400_000;
const hace = (dias: number, ahora: Date) => new Date(ahora.getTime() - dias * DIA);

/** Inicio del mes actual en España (día 1 a medianoche; con un margen de 2 horas por el horario de verano). */
function inicioDeEsteMes(ahora: Date): Date {
  return new Date(new Date(`${mesDe(ahora)}-01T00:00:00Z`).getTime() + 2 * 3_600_000);
}

/** Números "al azar" pero siempre los mismos (así la demo sale igual cada vez). */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s / 2_147_483_648;
  };
}

/* ───────────── Empresas ───────────── */

const EMPRESAS = [
  { id: "demo-emp-guagua", nombre: "Guagua Tech", slug: "demo-guagua-tech", web: "https://example.com/guagua" },
  { id: "demo-emp-alisios", nombre: "Alisios Data", slug: "demo-alisios-data", web: "https://example.com/alisios" },
  { id: "demo-emp-roque", nombre: "Roque Security", slug: "demo-roque-security", web: "https://example.com/roque" },
  { id: "demo-emp-malpais", nombre: "Malpaís Cloud", slug: "demo-malpais-cloud", web: "https://example.com/malpais" },
  { id: "demo-emp-barlovento", nombre: "Barlovento Studio", slug: "demo-barlovento-studio", web: "https://example.com/barlovento" },
  { id: "demo-emp-norte", nombre: "Northwind Labs", slug: "demo-northwind-labs", web: "https://example.com/northwind" },
];

/* ───────────── Personas ───────────── */

type Persona = {
  n: number;
  nombre: string;
  alias: string;
  titular: string;
  area: Area;
  anos: number;
  lidera?: boolean;
  ciudad: string;
  pais: string;
  modalidades: Modalidad[];
  disponibilidad: Disponibilidad;
  tecnologias: string[];
  ingles: "b1" | "b2" | "c1" | "c2" | null;
  sobreMi: string;
  visibilidad?: "publico" | "registrados" | "oculto";
  verificado?: boolean;
  emblema?: { tipo: "torneo" | "quiz"; nombre: string };
};

const PERSONAS: Persona[] = [
  { n: 1, nombre: "Aitana Rodríguez", alias: "aitana-front", titular: "Frontend developer · React y accesibilidad", area: "desarrollo", anos: 2, ciudad: "Santa Cruz de Tenerife", pais: "ES", modalidades: ["remoto", "hibrido"], disponibilidad: "buscando", tecnologias: ["react", "typescript", "nextjs", "tailwind"], ingles: "b2", sobreMi: "Hice el DAW y llevo dos años haciendo webs para una agencia. Me obsesiona que todo se pueda usar con teclado.\n\nBusco un equipo de producto donde aprender de gente senior.", emblema: { tipo: "torneo", nombre: "Torneo #1 · Landing" } },
  { n: 2, nombre: "Javier Cabrera", alias: "javi-datos", titular: "Data engineer · PySpark, Airflow y dbt", area: "datos", anos: 4, ciudad: "Las Palmas de Gran Canaria", pais: "ES", modalidades: ["remoto"], disponibilidad: "abierto", tecnologias: ["python", "spark", "airflow", "dbt", "sql", "aws"], ingles: "c1", sobreMi: "Cuatro años moviendo datos de un sitio a otro sin que se rompa nada. Ahora monto un lakehouse para una eléctrica." },
  { n: 3, nombre: "Lucía Afonso", alias: "lucia-ia", titular: "ML engineer · NLP y LLMs", area: "ia", anos: 3, ciudad: "Madrid", pais: "ES", modalidades: ["remoto", "hibrido"], disponibilidad: "buscando", tecnologias: ["python", "pytorch", "hugging-face", "langchain"], ingles: "c1", sobreMi: "Entreno y despliego modelos de lenguaje para atención al cliente. Me interesa sobre todo evaluar bien lo que hacen.", emblema: { tipo: "quiz", nombre: "Top 1 del quiz · septiembre" } },
  { n: 4, nombre: "Daniel Pérez", alias: "dani-sec", titular: "Pentester junior · OSCP en camino", area: "ciberseguridad", anos: 1, ciudad: "Valencia", pais: "ES", modalidades: ["presencial", "hibrido"], disponibilidad: "buscando", tecnologias: ["pentesting", "linux", "python"], ingles: "b2", sobreMi: "Del ASIR a la ciberseguridad. Hago CTFs cada fin de semana y escribo los writeups en mi blog." },
  { n: 5, nombre: "Carmen Díaz", alias: "carmen-devops", titular: "Senior DevOps · Kubernetes y Terraform", area: "infra-devops", anos: 9, lidera: true, ciudad: "Bilbao", pais: "ES", modalidades: ["remoto"], disponibilidad: "freelance", tecnologias: ["kubernetes", "terraform", "aws", "docker", "go"], ingles: "c1", sobreMi: "Nueve años con sistemas en producción, los últimos cuatro liderando un equipo de plataforma. Ahora trabajo por proyectos." },
  { n: 6, nombre: "Valentina Gómez", alias: "vale-ux", titular: "Diseñadora de producto UX/UI", area: "producto-diseno", anos: 5, ciudad: "Buenos Aires", pais: "AR", modalidades: ["remoto"], disponibilidad: "abierto", tecnologias: ["figma"], ingles: "b2", sobreMi: "Diseño apps de banca y salud. Me gusta hablar con usuarios antes de abrir Figma." },
  { n: 7, nombre: "Mateo Herrera", alias: "mateo-back", titular: "Backend developer · Java y Spring", area: "desarrollo", anos: 6, ciudad: "Ciudad de México", pais: "MX", modalidades: ["remoto"], disponibilidad: "no-busca", tecnologias: ["java", "spring", "postgresql", "docker", "kubernetes"], ingles: "b2", sobreMi: "Backend de pagos en una fintech. Ahora mismo no busco, pero me gusta estar en la comunidad." },
  { n: 8, nombre: "Sofía Martín", alias: "sofia-analytics", titular: "Data analyst · SQL y Power BI", area: "datos", anos: 1, ciudad: "Sevilla", pais: "ES", modalidades: ["hibrido", "presencial"], disponibilidad: "buscando", tecnologias: ["sql", "power-bi", "python", "pandas"], ingles: "b1", sobreMi: "Vengo de administración de empresas y me pasé a los datos con un bootcamp. Hago dashboards que la gente entiende." },
  { n: 9, nombre: "Andrés Castillo", alias: "andres-cloud", titular: "Cloud engineer · Azure", area: "infra-devops", anos: 3, ciudad: "Bogotá", pais: "CO", modalidades: ["remoto"], disponibilidad: "buscando", tecnologias: ["azure", "terraform", "docker", "linux"], ingles: "b2", sobreMi: "Migro aplicaciones a la nube y automatizo despliegues. Certificado AZ-104." },
  { n: 10, nombre: "Elena Navarro", alias: "elena-mobile", titular: "Mobile developer · Kotlin y Swift", area: "desarrollo", anos: 4, ciudad: "Barcelona", pais: "ES", modalidades: ["hibrido"], disponibilidad: "abierto", tecnologias: ["kotlin", "swift", "typescript"], ingles: "c1", sobreMi: "Apps nativas para Android e iOS en una startup de movilidad." },
  { n: 11, nombre: "Pedro Suárez", alias: "pedro-soporte", titular: "Técnico de soporte IT N2", area: "soporte-it", anos: 2, ciudad: "La Orotava", pais: "ES", modalidades: ["presencial"], disponibilidad: "buscando", tecnologias: ["linux"], ingles: "b1", sobreMi: "Soporte a oficinas y comercios del norte de Tenerife. Estudio para pasarme a sistemas.", verificado: false },
  { n: 12, nombre: "Camila Rojas", alias: "camila-fullstack", titular: "Full stack · Vue y Node.js", area: "desarrollo", anos: 3, ciudad: "Santiago", pais: "CL", modalidades: ["remoto"], disponibilidad: "freelance", tecnologias: ["vue", "nodejs", "typescript", "mongodb"], ingles: "b2", sobreMi: "Hago webs y paneles a medida para pymes. Trabajo sola o con equipos pequeños." },
  { n: 13, nombre: "Hugo Ramos", alias: "hugo-ml", titular: "Junior AI engineer", area: "ia", anos: 0, ciudad: "Granada", pais: "ES", modalidades: ["remoto", "hibrido", "presencial"], disponibilidad: "buscando", tecnologias: ["python", "scikit-learn", "tensorflow"], ingles: "b2", sobreMi: "Recién salido del máster de IA. Mi TFM fue detectar enfermedades en hojas de plátano con visión por computador.", visibilidad: "registrados" },
  { n: 14, nombre: "Irene Morales", alias: "irene-qa", titular: "QA automation · Playwright", area: "desarrollo", anos: 5, ciudad: "Málaga", pais: "ES", modalidades: ["remoto"], disponibilidad: "no-busca", tecnologias: ["typescript", "javascript"], ingles: "c1", sobreMi: "Automatizo pruebas para que los demás duerman tranquilos.", visibilidad: "oculto" },
];

/** Recruiters de demostración (sin perfil de talento). */
const RECRUITERS = [
  { id: "demo-usr-r1", nombre: "Marta Hernández", empresa: "Guagua Tech", empresaId: "demo-emp-guagua", cargo: "rrhh" as const, agencia: false, estado: "activo" as const },
  { id: "demo-usr-r2", nombre: "Óscar Pérez", empresa: "Talento Atlántico (agencia)", empresaId: null, cargo: "recruiter" as const, agencia: true, estado: "activo" as const },
  { id: "demo-usr-r3", nombre: "Raúl Gil", empresa: "Ofertas Fáciles S.L.", empresaId: null, cargo: "otro" as const, agencia: false, estado: "bloqueado" as const },
];

const idUsuario = (n: number) => `demo-usr-${String(n).padStart(2, "0")}`;

/* ───────────── Ofertas ───────────── */

type OfertaDemo = {
  id: string;
  titulo: string;
  empresaId: string;
  idioma: "es" | "en";
  area: Area;
  seniority: "sin-experiencia" | "junior" | "mid" | "senior" | "lead";
  modalidad: Modalidad;
  tecnologias: string[];
  pais?: string;
  ciudad?: string;
  remotoMundo?: boolean;
  remotoPaises?: string[];
  salario?: [number, number];
  resumen: string;
  responsabilidades: string[];
  requisitos: string[];
  ingles?: "b1" | "b2" | "c1";
  dias: number;
  estado?: "publicada" | "pendiente" | "rechazada" | "cerrada";
  autor?: string;
  descripcion?: string;
  editada?: boolean;
  motivoRechazo?: string;
};

const OFERTAS: OfertaDemo[] = [
  { id: "demo0001", titulo: "Desarrollador/a Frontend Junior (React)", empresaId: "demo-emp-guagua", idioma: "es", area: "desarrollo", seniority: "junior", modalidad: "hibrido", tecnologias: ["react", "typescript", "tailwind"], pais: "ES", ciudad: "Santa Cruz de Tenerife", salario: [24000, 28000], dias: 0, resumen: "App de horarios y billetes de guagua usada por medio millón de personas. Equipo de 8 con mentoría para juniors. Híbrido en Santa Cruz.", responsabilidades: ["Maquetar pantallas nuevas en React a partir de Figma", "Arreglar errores y escribir pruebas de los componentes", "Revisar código con el equipo"], requisitos: ["Algún proyecto con React (de clase o personal)", "Lo básico de TypeScript y Git", "Ganas de aprender"] },
  { id: "demo0002", titulo: "Data Engineer (Python + dbt)", empresaId: "demo-emp-alisios", idioma: "es", area: "datos", seniority: "mid", modalidad: "remoto", tecnologias: ["python", "dbt", "airflow", "sql", "aws"], pais: "ES", remotoPaises: ["ES"], salario: [38000, 45000], dias: 1, resumen: "Plataforma de datos de energía renovable. Montarás pipelines y modelos en dbt. Remoto desde España.", responsabilidades: ["Construir y mantener pipelines en Airflow", "Modelar tablas en dbt", "Vigilar la calidad de los datos"], requisitos: ["3+ años con Python y SQL", "Experiencia con algún orquestador", "Inglés B2 para documentación"], ingles: "b2" },
  { id: "demo0003", titulo: "Machine Learning Engineer (LLMs)", empresaId: "demo-emp-norte", idioma: "en", area: "ia", seniority: "senior", modalidad: "remoto", tecnologias: ["python", "pytorch", "hugging-face", "langchain"], remotoMundo: true, salario: [65000, 85000], dias: 2, resumen: "Build and evaluate LLM features for a customer-support product. Fully remote, anywhere.", responsabilidades: ["Fine-tune and evaluate language models", "Ship retrieval pipelines to production", "Define evaluation sets with the product team"], requisitos: ["5+ years in ML, 1+ with LLMs", "Strong Python and PyTorch", "Fluent English (C1)"], ingles: "c1" },
  { id: "demo0004", titulo: "Analista SOC N1", empresaId: "demo-emp-roque", idioma: "es", area: "ciberseguridad", seniority: "junior", modalidad: "presencial", tecnologias: ["siem", "linux"], pais: "ES", ciudad: "Madrid", salario: [26000, 30000], dias: 3, resumen: "SOC 24/7 para clientes de banca. Formación pagada y certificaciones. Presencial en Madrid con turnos.", responsabilidades: ["Vigilar alertas en el SIEM", "Escalar incidentes al N2", "Documentar cada caso"], requisitos: ["Conocimientos de redes y Linux", "Disponibilidad para turnos", "Valorable Security+ o similar"] },
  { id: "demo0005", titulo: "Platform Engineer (Kubernetes)", empresaId: "demo-emp-malpais", idioma: "en", area: "infra-devops", seniority: "mid", modalidad: "remoto", tecnologias: ["kubernetes", "terraform", "go", "aws"], remotoPaises: ["ES", "PT", "MX", "CO", "AR", "CL"], salario: [42000, 52000], dias: 4, resumen: "Keep our Kubernetes platform healthy and help product teams ship faster. Remote from Spain, Portugal or Latin America.", responsabilidades: ["Run and upgrade Kubernetes clusters", "Write Terraform modules", "Improve CI/CD pipelines"], requisitos: ["3+ years running production systems", "Kubernetes and Terraform", "English B2"], ingles: "b2" },
  { id: "demo0006", titulo: "Diseñador/a UX/UI", empresaId: "demo-emp-barlovento", idioma: "es", area: "producto-diseno", seniority: "mid", modalidad: "remoto", tecnologias: ["figma"], remotoPaises: ["ES", "AR", "MX", "CO", "CL", "UY", "PE"], dias: 5, resumen: "Estudio pequeño que diseña apps de salud. Remoto desde España o Latinoamérica.", responsabilidades: ["Investigar con usuarios", "Diseñar flujos y prototipos en Figma", "Mantener el sistema de diseño"], requisitos: ["Portfolio con casos reales", "3+ años de experiencia", "Buena comunicación escrita"] },
  { id: "demo0007", titulo: "Técnico/a de soporte IT (sin experiencia)", empresaId: "demo-emp-guagua", idioma: "es", area: "soporte-it", seniority: "sin-experiencia", modalidad: "presencial", tecnologias: [], pais: "ES", ciudad: "La Laguna", salario: [18000, 20000], dias: 6, resumen: "Primer empleo en soporte: te formamos. Presencial en La Laguna, horario de mañana.", responsabilidades: ["Atender incidencias en persona y por teléfono", "Preparar equipos nuevos", "Llevar el inventario"], requisitos: ["Ganas de aprender", "Trato amable", "Carnet de conducir (valorable)"] },
  { id: "demo0008", titulo: "Backend Developer (Node.js)", empresaId: "demo-emp-norte", idioma: "en", area: "desarrollo", seniority: "senior", modalidad: "remoto", tecnologias: ["nodejs", "typescript", "postgresql", "docker"], remotoPaises: ["ES", "PT", "FR", "DE", "IT", "NL", "IE"], salario: [55000, 70000], dias: 8, resumen: "Payments API used by thousands of online shops. Remote from the EU.", responsabilidades: ["Design and build Node.js services", "Own on-call once a month", "Mentor mid-level engineers"], requisitos: ["5+ years with Node.js backends", "PostgreSQL in production", "Fluent English (C1)"], ingles: "c1" },
  { id: "demo0009", titulo: "Data Analyst Junior (Power BI)", empresaId: "demo-emp-alisios", idioma: "es", area: "datos", seniority: "junior", modalidad: "hibrido", tecnologias: ["sql", "power-bi", "python"], pais: "ES", ciudad: "Las Palmas de Gran Canaria", salario: [25000, 29000], dias: 10, resumen: "Dashboards de consumo energético para clientes. Híbrido en Las Palmas.", responsabilidades: ["Crear y mantener informes en Power BI", "Escribir consultas SQL", "Explicar los datos a negocio"], requisitos: ["SQL básico-intermedio", "Power BI o similar", "Ganas de aprender Python"] },
  { id: "demo0010", titulo: "Cloud Engineer (Azure)", empresaId: "demo-emp-malpais", idioma: "es", area: "infra-devops", seniority: "junior", modalidad: "remoto", tecnologias: ["azure", "terraform", "linux"], remotoPaises: ["ES", "MX", "CO", "AR", "CL", "PE", "UY", "EC"], dias: 12, resumen: "Migraciones a Azure para pymes. Remoto desde España o Latinoamérica.", responsabilidades: ["Migrar aplicaciones a Azure", "Automatizar con Terraform", "Documentar la infraestructura"], requisitos: ["1+ año con Azure", "Lo básico de Linux y redes", "AZ-900 (valorable)"] },
  // De recruiters (subidas desde la web).
  { id: "demo0011", titulo: "Mobile Developer (Flutter o nativo)", empresaId: "demo-emp-guagua", idioma: "es", area: "desarrollo", seniority: "mid", modalidad: "hibrido", tecnologias: ["kotlin", "swift"], pais: "ES", ciudad: "Santa Cruz de Tenerife", salario: [32000, 38000], dias: 2, autor: "demo-usr-r1", editada: true, resumen: "", responsabilidades: [], requisitos: [], descripcion: "Buscamos a alguien para nuestra app de horarios y billetes.\n\nHarás nuevas funciones en Android e iOS, con nuestro equipo de producto.\n\nPedimos 3 años con apps nativas o multiplataforma. Ofrecemos híbrido en Santa Cruz y horario flexible." },
  { id: "demo0012", titulo: "QA Automation Engineer", empresaId: "demo-emp-guagua", idioma: "es", area: "desarrollo", seniority: "mid", modalidad: "remoto", tecnologias: ["typescript", "javascript"], remotoPaises: ["ES"], dias: 0, estado: "pendiente", autor: "demo-usr-r1", resumen: "", responsabilidades: [], requisitos: [], descripcion: "Queremos automatizar las pruebas de la app y de la web con Playwright.\n\nBuscamos 2+ años automatizando pruebas end-to-end. Remoto desde España." },
  { id: "demo0013", titulo: "Consultor/a SAP (para cliente)", empresaId: "demo-emp-norte", idioma: "es", area: "desarrollo", seniority: "senior", modalidad: "presencial", tecnologias: [], pais: "ES", ciudad: "Madrid", dias: 1, estado: "pendiente", autor: "demo-usr-r2", resumen: "", responsabilidades: [], requisitos: [], descripcion: "Para un cliente del sector retail buscamos consultor/a SAP con 5 años de experiencia. Presencial en Madrid." },
  // Otras del staff, en otros estados.
  { id: "demo0014", titulo: "Ingeniero/a de datos (prácticas)", empresaId: "demo-emp-alisios", idioma: "es", area: "datos", seniority: "sin-experiencia", modalidad: "hibrido", tecnologias: ["python", "sql"], pais: "ES", ciudad: "Las Palmas de Gran Canaria", dias: 0, estado: "pendiente", resumen: "", responsabilidades: [], requisitos: [] },
  { id: "demo0015", titulo: "Vendedor/a de seguros (comisiones)", empresaId: "demo-emp-norte", idioma: "es", area: "soporte-it", seniority: "sin-experiencia", modalidad: "presencial", tecnologias: [], pais: "ES", ciudad: "Madrid", dias: 5, estado: "rechazada", motivoRechazo: "No es una oferta tech.", resumen: "", responsabilidades: [], requisitos: [] },
  { id: "demo0016", titulo: "Frontend Developer (Vue)", empresaId: "demo-emp-barlovento", idioma: "es", area: "desarrollo", seniority: "mid", modalidad: "remoto", tecnologias: ["vue", "typescript"], remotoPaises: ["ES"], dias: 40, estado: "cerrada", resumen: "Web de citas médicas en Vue. Ya no está disponible.", responsabilidades: ["Desarrollar la web en Vue"], requisitos: ["3 años con Vue"] },
];

/* ───────────── Proyectos y portfolios ───────────── */

const PROYECTOS: Array<{ id: string; autor: number; titulo: string; descripcion: string; area: Area; tecnologias: string[]; repo?: string; demo?: string; enCurso?: boolean; fijado?: boolean; dias: number }> = [
  { id: "demop001", autor: 1, titulo: "Horarios de guaguas accesibles", descripcion: "Web para consultar horarios de guaguas que se puede usar entera con teclado y lector de pantalla. Datos abiertos del Cabildo y Next.js.", area: "desarrollo", tecnologias: ["nextjs", "react", "typescript", "tailwind"], repo: "https://github.com/vercel/next.js", demo: "https://example.com/guaguas", fijado: true, dias: 9 },
  { id: "demop002", autor: 2, titulo: "Lakehouse de vivienda vacacional en Canarias", descripcion: "Pipeline con PySpark y Airflow que cruza los datos de vivienda vacacional con los del INE, modelado en dbt y con un dashboard al final.", area: "datos", tecnologias: ["python", "spark", "airflow", "dbt"], repo: "https://github.com/apache/airflow", fijado: true, dias: 14 },
  { id: "demop003", autor: 3, titulo: "Asistente que resume ofertas de empleo", descripcion: "Un LLM pequeño, ajustado para resumir ofertas en tres frases y sacar tecnologías y requisitos. Con su conjunto de evaluación.", area: "ia", tecnologias: ["python", "pytorch", "hugging-face"], repo: "https://github.com/huggingface/transformers", dias: 5 },
  { id: "demop004", autor: 4, titulo: "Writeups de CTF", descripcion: "Mis soluciones a retos de CTF de web y Linux, explicadas paso a paso para quien empieza.", area: "ciberseguridad", tecnologias: ["linux", "python", "pentesting"], repo: "https://gitlab.com/ejemplo/writeups", enCurso: true, dias: 3 },
  { id: "demop005", autor: 5, titulo: "Clúster k3s con Raspberry Pi", descripcion: "Cuatro Raspberry Pi con k3s, Terraform y ArgoCD. Todo el despliegue está en el repositorio, paso a paso.", area: "infra-devops", tecnologias: ["kubernetes", "terraform", "docker"], repo: "https://github.com/k3s-io/k3s", fijado: true, dias: 35 },
  { id: "demop006", autor: 6, titulo: "Rediseño de la app de citas del centro de salud", descripcion: "Caso de estudio: entrevistas con pacientes, nuevos flujos para pedir cita y prototipo probado con 12 personas.", area: "producto-diseno", tecnologias: ["figma"], demo: "https://example.com/caso-citas", dias: 20 },
  { id: "demop007", autor: 7, titulo: "API de pagos de ejemplo con Spring", descripcion: "Una API de pagos pequeña con Spring Boot, PostgreSQL y pruebas de integración con Testcontainers.", area: "desarrollo", tecnologias: ["java", "spring", "postgresql", "docker"], repo: "https://github.com/spring-projects/spring-boot", dias: 45 },
  { id: "demop008", autor: 8, titulo: "Dashboard del paro en Canarias", descripcion: "Power BI con los datos del paro por municipio desde 2015, actualizado cada mes con un script de Python.", area: "datos", tecnologias: ["power-bi", "python", "pandas"], demo: "https://example.com/paro", dias: 2 },
  { id: "demop009", autor: 9, titulo: "Plantillas de Terraform para Azure", descripcion: "Módulos de Terraform para montar una web con base de datos en Azure en diez minutos.", area: "infra-devops", tecnologias: ["azure", "terraform"], repo: "https://github.com/hashicorp/terraform", dias: 1 },
  { id: "demop010", autor: 12, titulo: "Panel de reservas para restaurantes", descripcion: "Panel en Vue y Node.js para que restaurantes pequeños gestionen reservas sin pagar comisiones.", area: "desarrollo", tecnologias: ["vue", "nodejs", "mongodb"], repo: "https://github.com/vuejs/core", enCurso: true, dias: 6 },
  { id: "demop011", autor: 13, titulo: "Detección de enfermedades en hojas de plátano", descripcion: "Mi TFM: una red convolucional que detecta tres enfermedades del plátano a partir de fotos hechas con el móvil.", area: "ia", tecnologias: ["python", "tensorflow"], repo: "https://github.com/tensorflow/tensorflow", dias: 11 },
  { id: "demop012", autor: 10, titulo: "App de rutas de senderismo offline", descripcion: "App nativa para Android e iOS con mapas sin conexión de los senderos de Tenerife.", area: "desarrollo", tecnologias: ["kotlin", "swift"], dias: 50 },
];

const PORTFOLIOS: Array<{ autor: number; descripcion: string; imagen?: string; juicio?: "pedido" | "revisado"; dias: number }> = [
  { autor: 1, descripcion: "Mis proyectos de frontend, artículos sobre accesibilidad y mi CV.", imagen: "https://opengraph.githubassets.com/1/vercel/next.js", juicio: "revisado", dias: 30 },
  { autor: 2, descripcion: "Data engineering: pipelines, dashboards y notas de lo que aprendo.", imagen: "https://opengraph.githubassets.com/1/apache/airflow", juicio: "pedido", dias: 12 },
  { autor: 3, descripcion: "Modelos, papers que leo y charlas que he dado.", juicio: "revisado", dias: 25 },
  { autor: 6, descripcion: "Casos de estudio de UX con el antes y el después.", juicio: "pedido", dias: 8 },
  { autor: 8, descripcion: "Mis dashboards y cómo los hice.", juicio: "pedido", dias: 4 },
  { autor: 9, descripcion: "Certificaciones, laboratorios y plantillas de Azure.", dias: 15 },
  { autor: 12, descripcion: "Webs que he hecho para clientes.", dias: 40 },
];

/* ───────────── Cargar y quitar ───────────── */

/** Quita todo lo de la demostración. Lo real (y lo de db:datos-prueba) se queda. */
export async function quitarDemo(db: Db): Promise<{ usuarios: number; ofertas: number; empresas: number }> {
  const idsEmpresas = EMPRESAS.map((e) => e.id);
  const sinOfertas = await db
    .delete(ofertas)
    .where(or(like(ofertas.id, "demo%"), inArray(ofertas.empresaId, idsEmpresas)))
    .returning({ id: ofertas.id });
  // Borrar a las personas borra en cascada sus perfiles, proyectos, portfolios, me gusta, reportes, emblemas…
  const sinUsuarios = await db.delete(usuarios).where(like(usuarios.id, "demo-usr-%")).returning({ id: usuarios.id });
  const sinEmpresas = await db.delete(empresas).where(inArray(empresas.id, idsEmpresas)).returning({ id: empresas.id });
  return { usuarios: sinUsuarios.length, ofertas: sinOfertas.length, empresas: sinEmpresas.length };
}

/** Carga la demostración (antes quita la que hubiera). */
export async function cargarDemo(db: Db, ahora = new Date()) {
  await quitarDemo(db);
  const r = azar(42);
  const email = (id: string) => `${id}@demo.techtojob.invalid`;

  await db.insert(empresas).values(EMPRESAS.map((e) => ({ ...e, origen: "staff" as const })));

  // Personas con perfil (cuentas de hace 1–3 meses: sus me gusta cuentan).
  for (const p of PERSONAS) {
    const id = idUsuario(p.n);
    await db.insert(usuarios).values({ id, name: p.nombre, email: email(id), emailVerified: true, pais: p.pais, createdAt: hace(30 + p.n * 4, ahora) });
    await db.insert(perfiles).values({
      userId: id,
      alias: p.alias,
      nombre: p.nombre,
      titular: p.titular,
      sobreMi: p.sobreMi,
      area: p.area,
      anosExperiencia: p.anos,
      lidera: !!p.lidera,
      seniority: nivelPorExperiencia(p.anos, !!p.lidera),
      ciudad: p.ciudad,
      pais: p.pais,
      modalidades: p.modalidades,
      disponibilidad: p.disponibilidad,
      tecnologias: p.tecnologias,
      idiomas: [{ idioma: "es", nivel: "nativo" }, ...(p.ingles ? [{ idioma: "en" as const, nivel: p.ingles }] : [])],
      linkedin: `https://linkedin.com/in/${p.alias}-demo`,
      github: p.area === "producto-diseno" ? null : `https://github.com/${p.alias}-demo`,
      visibilidad: p.visibilidad ?? "publico",
      foto: "ninguna",
      actualizadaEn: hace(p.n, ahora),
    });
    if (p.verificado !== false) {
      await db.insert(cuentas).values({ id: `${id}-discord`, accountId: `discord-${id}`, providerId: "discord", userId: id });
      await db.insert(estadoDiscord).values({ userId: id, discordId: `discord-${id}`, nombre: p.alias, enServidor: true, roles: [] });
    }
    if (p.emblema) await db.insert(emblemas).values({ id: `${id}-emblema`, userId: id, tipo: p.emblema.tipo, nombre: p.emblema.nombre, otorgadoEn: hace(20, ahora) });
  }

  // Recruiters.
  for (const [i, rec] of RECRUITERS.entries()) {
    await db.insert(usuarios).values({ id: rec.id, name: rec.nombre, email: email(rec.id), emailVerified: true, pais: "ES", createdAt: hace(25 + i, ahora) });
    await db.insert(recruiters).values({
      userId: rec.id,
      cargo: rec.cargo,
      empresaNombre: rec.empresa,
      empresaWeb: "https://example.com",
      linkedin: `https://linkedin.com/in/${rec.id}`,
      mensaje: rec.agencia ? "Somos una agencia y publicamos ofertas de varios clientes." : null,
      empresaId: rec.empresaId,
      agencia: rec.agencia,
      estado: rec.estado,
      ...(rec.estado === "bloqueado" && { motivo: "Publicaba ofertas que no eran de tecnología.", bloqueadoEn: hace(3, ahora) }),
    });
  }

  // Ofertas.
  for (const o of OFERTAS) {
    const estado = o.estado ?? "publicada";
    const publicada = estado === "publicada" || estado === "cerrada";
    const fecha = hace(o.dias, ahora);
    await db.insert(ofertas).values({
      id: o.id,
      slug: `${slugProyecto(o.titulo)}-${EMPRESAS.find((e) => e.id === o.empresaId)!.slug.replace(/^demo-/, "")}`,
      empresaId: o.empresaId,
      titulo: o.titulo,
      resumen: o.resumen || null,
      descripcion: o.descripcion ?? null,
      autorizada: !!o.autor,
      responsabilidades: o.responsabilidades,
      requisitos: o.requisitos,
      idioma: o.idioma,
      urlOriginal: `https://example.com/ofertas/${o.id}`,
      area: o.area,
      seniority: o.seniority,
      modalidad: o.modalidad,
      tecnologias: o.tecnologias,
      pais: o.pais ?? null,
      ciudad: o.ciudad ?? null,
      remotoMundo: !!o.remotoMundo,
      remotoPaises: o.remotoPaises ?? [],
      salarioMin: o.salario?.[0] ?? null,
      salarioMax: o.salario?.[1] ?? null,
      moneda: o.salario ? "EUR" : null,
      origen: o.autor ? "usuario" : "manual",
      autorId: o.autor ?? null,
      estado,
      motivoRechazo: o.motivoRechazo ?? null,
      editadaEn: o.editada ? hace(0.2, ahora) : null,
      publicadaEn: publicada ? fecha : null,
      revisadaEn: estado === "pendiente" ? null : fecha,
      caducaEn: publicada ? new Date(fecha.getTime() + 45 * DIA) : null,
      creadaEn: fecha,
    });
    await db.insert(ofertaIdiomas).values([
      { ofertaId: o.id, idioma: o.idioma, nivel: null },
      ...(o.ingles && o.idioma !== "en" ? [{ ofertaId: o.id, idioma: "en" as const, nivel: o.ingles }] : []),
    ]);
  }

  // Proyectos y portfolios.
  for (const p of PROYECTOS) {
    await db.insert(proyectos).values({
      id: p.id,
      userId: idUsuario(p.autor),
      titulo: p.titulo,
      descripcion: p.descripcion,
      area: p.area,
      tecnologias: p.tecnologias,
      repo: p.repo ?? null,
      demo: p.demo ?? null,
      estado: p.enCurso ? "en_curso" : "terminado",
      fijado: !!p.fijado,
      creadaEn: hace(p.dias, ahora),
    });
  }
  for (const pf of PORTFOLIOS) {
    const persona = PERSONAS.find((x) => x.n === pf.autor)!;
    const id = idUsuario(pf.autor);
    const revisado = pf.juicio === "revisado" ? hace(8 + pf.autor, ahora) : null;
    await db.insert(portfolios).values({
      userId: id,
      url: `https://${persona.alias}.example.com/`,
      descripcion: pf.descripcion,
      imagen: pf.imagen ?? null,
      juicioPedidoEn: pf.juicio ? hace(pf.juicio === "revisado" ? 20 : 2 + pf.autor, ahora) : null,
      juicioRevisadoEn: revisado,
      juicioVideo: revisado ? "https://youtube.com/watch?v=demo" : null,
      creadaEn: hace(pf.dias, ahora),
    });
    if (revisado) await db.insert(emblemas).values({ id: `juicio-${id}`, userId: id, tipo: "juicio", otorgadoEn: revisado });
  }

  // Me gusta: cada persona da a unos cuantos, en fechas de este mes, de la última semana y del mes pasado.
  const inicioMes = inicioDeEsteMes(ahora);
  const fechaMg = () => {
    const x = r();
    if (x < 0.35) return new Date(ahora.getTime() - r() * 6 * DIA); // esta semana
    if (x < 0.7) return new Date(inicioMes.getTime() + r() * Math.max(ahora.getTime() - inicioMes.getTime(), 1)); // este mes
    return new Date(inicioMes.getTime() - (2 + r() * 40) * DIA); // antes
  };
  const quien = PERSONAS.filter((p) => p.verificado !== false).map((p) => idUsuario(p.n));
  const mgProyectos: Array<typeof megustaProyectos.$inferInsert> = [];
  for (const [i, p] of PROYECTOS.entries()) {
    const cuantos = Math.max(1, Math.round((PROYECTOS.length - i) * 0.9 * r() + 2));
    for (const u of quien.filter((u) => u !== idUsuario(p.autor)).slice(0, cuantos)) mgProyectos.push({ proyectoId: p.id, userId: u, creadoEn: fechaMg() });
  }
  await db.insert(megustaProyectos).values(mgProyectos);
  const mgPortfolios: Array<typeof megustaPortfolios.$inferInsert> = [];
  for (const [i, pf] of PORTFOLIOS.entries()) {
    const cuantos = Math.max(1, Math.round((PORTFOLIOS.length - i) * 1.2 * r() + 1));
    for (const u of [...quien].reverse().filter((u) => u !== idUsuario(pf.autor)).slice(0, cuantos)) mgPortfolios.push({ portfolioId: idUsuario(pf.autor), userId: u, creadoEn: fechaMg() });
  }
  await db.insert(megustaPortfolios).values(mgPortfolios);

  // Reportes sin revisar, uno de cada tipo (para ver las pestañas del staff).
  await db.insert(reportesPerfil).values({ id: "demo-rep-perfil", perfilUserId: idUsuario(11), reportadoPor: idUsuario(4), motivo: "Creo que el perfil es falso: las fotos y el texto están copiados." });
  await db.insert(reportes).values([
    { id: "demo-rep-oferta", ofertaId: "demo0007", reportadoPor: idUsuario(8), motivo: "El enlace de la oferta ya no funciona." },
    { id: "demo-rep-recruiter", recruiterId: "demo-usr-r2", reportadoPor: idUsuario(1), motivo: "Me escribió por LinkedIn ofreciendo un curso de pago." },
    { id: "demo-rep-proyecto", proyectoId: "demop007", reportadoPor: idUsuario(12), motivo: "El repositorio es el de Spring Boot, no es suyo." },
    { id: "demo-rep-portfolio", portfolioId: idUsuario(9), reportadoPor: idUsuario(2), motivo: "La web es una plantilla sin cambiar." },
  ]);

  return { personas: PERSONAS.length, recruiters: RECRUITERS.length, ofertas: OFERTAS.length, proyectos: PROYECTOS.length, portfolios: PORTFOLIOS.length, megusta: mgProyectos.length + mgPortfolios.length };
}
