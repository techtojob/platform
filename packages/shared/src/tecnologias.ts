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
  { id: "python", nombre: "Python", alias: ["py", "python3"], areas: ["desarrollo", "datos", "ia"] },
  { id: "java", nombre: "Java", alias: [], areas: ["desarrollo"] },
  { id: "csharp", nombre: "C#", alias: ["c sharp", "csharp"], areas: ["desarrollo"] },
  { id: "php", nombre: "PHP", alias: [], areas: ["desarrollo"] },
  { id: "go", nombre: "Go", alias: ["golang"], areas: ["desarrollo", "infra-devops"] },
  { id: "rust", nombre: "Rust", alias: [], areas: ["desarrollo"] },
  { id: "kotlin", nombre: "Kotlin", alias: [], areas: ["desarrollo"] },
  { id: "swift", nombre: "Swift", alias: [], areas: ["desarrollo"] },
  { id: "sql", nombre: "SQL", alias: [], areas: ["desarrollo", "datos"] },
  { id: "html", nombre: "HTML", alias: ["html5"], areas: ["desarrollo", "producto-diseno"] },
  { id: "css", nombre: "CSS", alias: ["css3"], areas: ["desarrollo", "producto-diseno"] },
  { id: "c", nombre: "C", alias: [], areas: ["desarrollo"] },
  { id: "cpp", nombre: "C++", alias: ["cpp", "c plus plus"], areas: ["desarrollo"] },
  { id: "ruby", nombre: "Ruby", alias: [], areas: ["desarrollo"] },
  { id: "scala", nombre: "Scala", alias: [], areas: ["desarrollo", "datos"] },
  { id: "r", nombre: "R", alias: ["rstats", "lenguaje r"], areas: ["datos", "ia"] },
  { id: "dart", nombre: "Dart", alias: [], areas: ["desarrollo"] },
  { id: "bash", nombre: "Bash", alias: ["shell", "shell scripting"], areas: ["infra-devops", "soporte-it"] },
  { id: "powershell", nombre: "PowerShell", alias: [], areas: ["infra-devops", "soporte-it"] },

  // Frontend
  { id: "react", nombre: "React", alias: ["reactjs", "react.js"], areas: ["desarrollo"] },
  { id: "nextjs", nombre: "Next.js", alias: ["next", "next.js"], areas: ["desarrollo"] },
  { id: "vue", nombre: "Vue", alias: ["vuejs", "vue.js"], areas: ["desarrollo"] },
  { id: "angular", nombre: "Angular", alias: ["angularjs"], areas: ["desarrollo"] },
  { id: "svelte", nombre: "Svelte", alias: ["sveltekit"], areas: ["desarrollo"] },
  { id: "tailwind", nombre: "Tailwind CSS", alias: ["tailwindcss", "tailwind"], areas: ["desarrollo"] },
  { id: "sass", nombre: "Sass", alias: ["scss"], areas: ["desarrollo"] },
  { id: "bootstrap", nombre: "Bootstrap", alias: [], areas: ["desarrollo"] },
  { id: "jquery", nombre: "jQuery", alias: [], areas: ["desarrollo"] },
  { id: "redux", nombre: "Redux", alias: [], areas: ["desarrollo"] },
  { id: "vite", nombre: "Vite", alias: ["vitejs"], areas: ["desarrollo"] },
  { id: "nuxt", nombre: "Nuxt", alias: ["nuxtjs", "nuxt.js"], areas: ["desarrollo"] },
  { id: "astro", nombre: "Astro", alias: [], areas: ["desarrollo"] },
  { id: "react-native", nombre: "React Native", alias: ["reactnative"], areas: ["desarrollo"] },
  { id: "flutter", nombre: "Flutter", alias: [], areas: ["desarrollo"] },
  { id: "android", nombre: "Android", alias: [], areas: ["desarrollo"] },
  { id: "ios", nombre: "iOS", alias: ["swiftui"], areas: ["desarrollo"] },
  { id: "wordpress", nombre: "WordPress", alias: [], areas: ["desarrollo", "producto-diseno"] },

  // Backend
  { id: "nodejs", nombre: "Node.js", alias: ["node", "node.js"], areas: ["desarrollo"] },
  { id: "spring", nombre: "Spring", alias: ["spring boot", "springboot"], areas: ["desarrollo"] },
  { id: "django", nombre: "Django", alias: [], areas: ["desarrollo"] },
  { id: "fastapi", nombre: "FastAPI", alias: [], areas: ["desarrollo"] },
  { id: "laravel", nombre: "Laravel", alias: [], areas: ["desarrollo"] },
  { id: "dotnet", nombre: ".NET", alias: ["dotnet", "asp.net"], areas: ["desarrollo"] },
  { id: "express", nombre: "Express", alias: ["express.js", "expressjs"], areas: ["desarrollo"] },
  { id: "nestjs", nombre: "NestJS", alias: ["nest.js"], areas: ["desarrollo"] },
  { id: "flask", nombre: "Flask", alias: [], areas: ["desarrollo"] },
  { id: "rails", nombre: "Ruby on Rails", alias: ["rails", "ror"], areas: ["desarrollo"] },
  { id: "graphql", nombre: "GraphQL", alias: [], areas: ["desarrollo"] },
  { id: "firebase", nombre: "Firebase", alias: [], areas: ["desarrollo"] },
  { id: "supabase", nombre: "Supabase", alias: [], areas: ["desarrollo"] },
  { id: "rabbitmq", nombre: "RabbitMQ", alias: [], areas: ["desarrollo"] },

  // Pruebas
  { id: "jest", nombre: "Jest", alias: [], areas: ["desarrollo"] },
  { id: "cypress", nombre: "Cypress", alias: [], areas: ["desarrollo"] },
  { id: "playwright", nombre: "Playwright", alias: [], areas: ["desarrollo"] },
  { id: "selenium", nombre: "Selenium", alias: [], areas: ["desarrollo"] },
  { id: "postman", nombre: "Postman", alias: [], areas: ["desarrollo"] },

  // Videojuegos
  { id: "unity", nombre: "Unity", alias: ["unity3d"], areas: ["desarrollo"] },
  { id: "godot", nombre: "Godot", alias: [], areas: ["desarrollo"] },

  // Datos
  { id: "postgresql", nombre: "PostgreSQL", alias: ["postgres", "psql"], areas: ["desarrollo", "datos"] },
  { id: "mongodb", nombre: "MongoDB", alias: ["mongo"], areas: ["desarrollo", "datos"] },
  { id: "mysql", nombre: "MySQL", alias: ["mariadb"], areas: ["desarrollo", "datos"] },
  { id: "sql-server", nombre: "SQL Server", alias: ["mssql", "t-sql", "tsql"], areas: ["desarrollo", "datos"] },
  { id: "oracle", nombre: "Oracle Database", alias: ["oracle", "pl/sql", "plsql"], areas: ["desarrollo", "datos"] },
  { id: "redis", nombre: "Redis", alias: [], areas: ["desarrollo", "datos"] },
  { id: "elasticsearch", nombre: "Elasticsearch", alias: ["elastic", "opensearch"], areas: ["desarrollo", "datos"] },
  { id: "kafka", nombre: "Apache Kafka", alias: ["kafka"], areas: ["datos", "desarrollo"] },
  { id: "snowflake", nombre: "Snowflake", alias: [], areas: ["datos"] },
  { id: "bigquery", nombre: "BigQuery", alias: [], areas: ["datos"] },
  { id: "databricks", nombre: "Databricks", alias: [], areas: ["datos"] },
  { id: "numpy", nombre: "NumPy", alias: [], areas: ["datos", "ia"] },
  { id: "tableau", nombre: "Tableau", alias: [], areas: ["datos"] },
  { id: "looker", nombre: "Looker Studio", alias: ["looker", "data studio"], areas: ["datos"] },
  { id: "excel", nombre: "Excel", alias: ["microsoft excel"], areas: ["datos", "soporte-it"] },
  { id: "spark", nombre: "Apache Spark", alias: ["spark", "pyspark"], areas: ["datos"] },
  { id: "airflow", nombre: "Apache Airflow", alias: ["airflow"], areas: ["datos"] },
  { id: "dbt", nombre: "dbt", alias: [], areas: ["datos"] },
  { id: "pandas", nombre: "pandas", alias: [], areas: ["datos"] },
  { id: "power-bi", nombre: "Power BI", alias: ["powerbi"], areas: ["datos"] },

  // IA y machine learning
  { id: "pytorch", nombre: "PyTorch", alias: ["torch"], areas: ["ia", "datos"] },
  { id: "tensorflow", nombre: "TensorFlow", alias: ["tf"], areas: ["ia", "datos"] },
  { id: "scikit-learn", nombre: "scikit-learn", alias: ["sklearn", "scikit learn"], areas: ["ia", "datos"] },
  { id: "hugging-face", nombre: "Hugging Face", alias: ["huggingface", "transformers"], areas: ["ia"] },
  { id: "langchain", nombre: "LangChain", alias: [], areas: ["ia"] },
  { id: "openai", nombre: "OpenAI API", alias: ["openai", "chatgpt api"], areas: ["ia"] },
  { id: "llm", nombre: "LLMs", alias: ["llm", "large language models"], areas: ["ia"] },
  { id: "rag", nombre: "RAG", alias: ["retrieval augmented generation"], areas: ["ia"] },
  { id: "nlp", nombre: "NLP", alias: ["procesamiento de lenguaje natural", "natural language processing"], areas: ["ia", "datos"] },
  { id: "opencv", nombre: "OpenCV", alias: ["computer vision", "visión por computador"], areas: ["ia"] },

  // Infra y DevOps
  { id: "docker", nombre: "Docker", alias: [], areas: ["infra-devops", "desarrollo"] },
  { id: "kubernetes", nombre: "Kubernetes", alias: ["k8s"], areas: ["infra-devops"] },
  { id: "aws", nombre: "AWS", alias: ["amazon web services"], areas: ["infra-devops"] },
  { id: "azure", nombre: "Azure", alias: ["microsoft azure"], areas: ["infra-devops"] },
  { id: "gcp", nombre: "Google Cloud", alias: ["gcp", "google cloud platform"], areas: ["infra-devops"] },
  { id: "terraform", nombre: "Terraform", alias: [], areas: ["infra-devops"] },
  { id: "linux", nombre: "Linux", alias: [], areas: ["infra-devops", "soporte-it"] },
  { id: "git", nombre: "Git", alias: [], areas: ["desarrollo", "infra-devops"] },
  { id: "github-actions", nombre: "GitHub Actions", alias: [], areas: ["infra-devops"] },
  { id: "gitlab-ci", nombre: "GitLab CI", alias: ["gitlab ci/cd"], areas: ["infra-devops"] },
  { id: "jenkins", nombre: "Jenkins", alias: [], areas: ["infra-devops"] },
  { id: "ci-cd", nombre: "CI/CD", alias: ["cicd", "ci cd"], areas: ["infra-devops"] },
  { id: "ansible", nombre: "Ansible", alias: [], areas: ["infra-devops"] },
  { id: "nginx", nombre: "Nginx", alias: [], areas: ["infra-devops"] },
  { id: "prometheus", nombre: "Prometheus", alias: [], areas: ["infra-devops"] },
  { id: "grafana", nombre: "Grafana", alias: [], areas: ["infra-devops"] },
  { id: "cloudflare", nombre: "Cloudflare", alias: [], areas: ["infra-devops"] },
  { id: "vmware", nombre: "VMware", alias: [], areas: ["infra-devops", "soporte-it"] },
  { id: "redes", nombre: "Redes (TCP/IP)", alias: ["tcp/ip", "ccna", "networking"], areas: ["infra-devops", "soporte-it", "ciberseguridad"] },

  // Ciberseguridad
  { id: "pentesting", nombre: "Pentesting", alias: ["pentest", "ethical hacking"], areas: ["ciberseguridad"] },
  { id: "siem", nombre: "SIEM", alias: [], areas: ["ciberseguridad"] },
  { id: "soc", nombre: "SOC", alias: [], areas: ["ciberseguridad"] },
  { id: "owasp", nombre: "OWASP", alias: [], areas: ["ciberseguridad"] },
  { id: "burp-suite", nombre: "Burp Suite", alias: ["burp"], areas: ["ciberseguridad"] },
  { id: "wireshark", nombre: "Wireshark", alias: [], areas: ["ciberseguridad", "infra-devops"] },
  { id: "nmap", nombre: "Nmap", alias: [], areas: ["ciberseguridad"] },
  { id: "metasploit", nombre: "Metasploit", alias: [], areas: ["ciberseguridad"] },
  { id: "kali", nombre: "Kali Linux", alias: ["kali"], areas: ["ciberseguridad"] },
  { id: "splunk", nombre: "Splunk", alias: [], areas: ["ciberseguridad"] },
  { id: "iso-27001", nombre: "ISO 27001", alias: ["iso27001", "iso/iec 27001"], areas: ["ciberseguridad"] },

  // Producto y Diseño
  { id: "figma", nombre: "Figma", alias: [], areas: ["producto-diseno"] },
  { id: "photoshop", nombre: "Photoshop", alias: ["adobe photoshop"], areas: ["producto-diseno"] },
  { id: "illustrator", nombre: "Illustrator", alias: ["adobe illustrator"], areas: ["producto-diseno"] },
  { id: "ux-research", nombre: "UX Research", alias: ["investigación ux", "user research"], areas: ["producto-diseno"] },
  { id: "jira", nombre: "Jira", alias: [], areas: ["producto-diseno", "desarrollo"] },
  { id: "scrum", nombre: "Scrum", alias: ["agile", "metodologías ágiles"], areas: ["producto-diseno", "desarrollo"] },

  // Soporte IT
  { id: "windows", nombre: "Windows", alias: ["windows server"], areas: ["soporte-it", "infra-devops"] },
  { id: "active-directory", nombre: "Active Directory", alias: ["entra id", "azure ad"], areas: ["soporte-it", "infra-devops"] },
  { id: "microsoft-365", nombre: "Microsoft 365", alias: ["office 365", "o365", "m365"], areas: ["soporte-it"] },
  { id: "itil", nombre: "ITIL", alias: ["itsm", "service desk", "helpdesk"], areas: ["soporte-it"] },
  { id: "sap", nombre: "SAP", alias: [], areas: ["soporte-it", "datos"] },
  { id: "salesforce", nombre: "Salesforce", alias: [], areas: ["desarrollo", "soporte-it"] },
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
