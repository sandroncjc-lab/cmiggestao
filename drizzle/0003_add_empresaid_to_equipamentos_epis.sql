ALTER TABLE "epis" ADD COLUMN "empresa_id" uuid;--> statement-breakpoint
ALTER TABLE "equipamentos" ADD COLUMN "empresa_id" uuid;--> statement-breakpoint
ALTER TABLE "epis" ADD CONSTRAINT "epis_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;