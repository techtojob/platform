CREATE TABLE "megusta_proyectos" (
	"proyecto_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "megusta_proyectos_proyecto_id_usuario_id_pk" PRIMARY KEY("proyecto_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "proyectos" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"area" text NOT NULL,
	"tecnologias" text[] DEFAULT '{}'::text[] NOT NULL,
	"repo" text,
	"demo" text,
	"video" text,
	"estado" text DEFAULT 'terminado' NOT NULL,
	"fijado" boolean DEFAULT false NOT NULL,
	"oculto" boolean DEFAULT false NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reportes" ADD COLUMN "proyecto_id" text;--> statement-breakpoint
ALTER TABLE "megusta_proyectos" ADD CONSTRAINT "megusta_proyectos_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "megusta_proyectos" ADD CONSTRAINT "megusta_proyectos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "megusta_proyectos_fecha_idx" ON "megusta_proyectos" USING btree ("creado_en");--> statement-breakpoint
CREATE INDEX "proyectos_usuario_idx" ON "proyectos" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "proyectos_creado_idx" ON "proyectos" USING btree ("creada_en");--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_proyecto_unico_idx" ON "reportes" USING btree ("proyecto_id","reportado_por");