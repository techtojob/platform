CREATE TABLE "reportes" (
	"id" text PRIMARY KEY NOT NULL,
	"oferta_id" text,
	"recruiter_id" text,
	"reportado_por" text NOT NULL,
	"motivo" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_oferta_id_ofertas_id_fk" FOREIGN KEY ("oferta_id") REFERENCES "public"."ofertas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_recruiter_id_recruiters_usuario_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."recruiters"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_reportado_por_usuarios_id_fk" FOREIGN KEY ("reportado_por") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_oferta_unico_idx" ON "reportes" USING btree ("oferta_id","reportado_por");--> statement-breakpoint
CREATE UNIQUE INDEX "reportes_recruiter_unico_idx" ON "reportes" USING btree ("recruiter_id","reportado_por");--> statement-breakpoint
CREATE INDEX "reportes_estado_idx" ON "reportes" USING btree ("estado","creado_en");