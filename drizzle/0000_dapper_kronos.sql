CREATE TYPE "public"."clima_rdo" AS ENUM('ensolarado', 'nublado', 'chuvoso', 'tempestade');--> statement-breakpoint
CREATE TYPE "public"."funcao_usuario" AS ENUM('admin', 'engenheiro', 'encarregado', 'aprovador_cliente');--> statement-breakpoint
CREATE TYPE "public"."status_contrato" AS ENUM('rascunho', 'ativo', 'suspenso', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."status_epi" AS ENUM('ativo', 'vencido');--> statement-breakpoint
CREATE TYPE "public"."status_equipamento" AS ENUM('disponivel', 'em_uso', 'manutencao');--> statement-breakpoint
CREATE TYPE "public"."status_obra" AS ENUM('planejada', 'em_andamento', 'pausada', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."status_rdo" AS ENUM('rascunho', 'pendente_aprovacao', 'aprovado', 'rejeitado');--> statement-breakpoint
CREATE TYPE "public"."status_servico" AS ENUM('pendente', 'em_andamento', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('contrato', 'alvara', 'planta', 'relatorio', 'outro');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"documento" varchar(18),
	"email" varchar(255),
	"telefone" varchar(20),
	"endereco" text,
	"empresa_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"numero" varchar(100) NOT NULL,
	"cliente_id" uuid NOT NULL,
	"obra_id" uuid,
	"valor_total" numeric(14, 2) NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"status" "status_contrato" DEFAULT 'rascunho' NOT NULL,
	"percentual_execucao" numeric(5, 2) DEFAULT '0' NOT NULL,
	"url_pdf" text,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contratos_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"url" text NOT NULL,
	"obra_id" uuid,
	"cliente_id" uuid,
	"enviado_por_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"documento" varchar(18) NOT NULL,
	"email" varchar(255),
	"telefone" varchar(20),
	"endereco" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_documento_unique" UNIQUE("documento")
);
--> statement-breakpoint
CREATE TABLE "epis" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tipo" varchar(255) NOT NULL,
	"numero_ca" varchar(50),
	"validade" date NOT NULL,
	"funcionario_nome" varchar(255) NOT NULL,
	"data_entrega" date NOT NULL,
	"status" "status_epi" DEFAULT 'ativo' NOT NULL,
	"obra_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipamento_movimentacoes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"equipamento_id" uuid NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"obra_id" uuid,
	"responsavel_id" uuid,
	"data" date NOT NULL,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipamentos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(100),
	"numero_serie" varchar(100),
	"status" "status_equipamento" DEFAULT 'disponivel' NOT NULL,
	"obra_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hh_contratos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"obra_id" uuid NOT NULL,
	"total_hh" numeric(10, 2) NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hh_registros" (
	"id" uuid PRIMARY KEY NOT NULL,
	"obra_id" uuid NOT NULL,
	"nome_funcionario" varchar(255) NOT NULL,
	"funcao" varchar(100),
	"data" date NOT NULL,
	"horas_normais" numeric(5, 2) DEFAULT '0' NOT NULL,
	"horas_extras" numeric(5, 2) DEFAULT '0' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"mensagem" text NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"tipo" varchar(100),
	"referencia_id" uuid,
	"tabela_referencia" varchar(100),
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"status" "status_obra" DEFAULT 'planejada' NOT NULL,
	"data_inicio" date,
	"data_fim" date,
	"cliente_id" uuid NOT NULL,
	"aprovador_cliente_id" uuid,
	"responsavel_interno_id" uuid,
	"empresa_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras_enderecos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"obra_id" uuid NOT NULL,
	"logradouro" varchar(255),
	"numero" varchar(20),
	"complemento" varchar(100),
	"bairro" varchar(100),
	"cidade" varchar(100),
	"estado" varchar(2),
	"cep" varchar(9),
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "obras_enderecos_obra_id_unique" UNIQUE("obra_id")
);
--> statement-breakpoint
CREATE TABLE "rdo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"obra_id" uuid NOT NULL,
	"data" date NOT NULL,
	"criado_por_id" uuid NOT NULL,
	"status" "status_rdo" DEFAULT 'rascunho' NOT NULL,
	"clima" "clima_rdo" NOT NULL,
	"assinatura_cliente" text,
	"assinatura_interna" text,
	"aprovado_em" timestamp,
	"aprovado_por_id" uuid,
	"motivo_rejeicao" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rdo_atividades" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rdo_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"hora_inicio" time,
	"hora_fim" time,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rdo_fotos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rdo_id" uuid NOT NULL,
	"url" text NOT NULL,
	"legenda" text,
	"tirada_em" timestamp,
	"enviado_por_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rdo_funcionarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rdo_id" uuid NOT NULL,
	"nome_funcionario" varchar(255) NOT NULL,
	"funcao" varchar(100),
	"horas_trabalhadas" numeric(5, 2) NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rdo_servicos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"rdo_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	"quantidade_executada" numeric(10, 2) NOT NULL,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"unidade" varchar(50) NOT NULL,
	"preco_unitario" numeric(10, 2) NOT NULL,
	"status" "status_servico" DEFAULT 'pendente' NOT NULL,
	"obra_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha_hash" text NOT NULL,
	"funcao" "funcao_usuario" NOT NULL,
	"empresa_id" uuid NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_enviado_por_id_usuarios_id_fk" FOREIGN KEY ("enviado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epis" ADD CONSTRAINT "epis_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento_movimentacoes" ADD CONSTRAINT "equipamento_movimentacoes_equipamento_id_equipamentos_id_fk" FOREIGN KEY ("equipamento_id") REFERENCES "public"."equipamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento_movimentacoes" ADD CONSTRAINT "equipamento_movimentacoes_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamento_movimentacoes" ADD CONSTRAINT "equipamento_movimentacoes_responsavel_id_usuarios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hh_contratos" ADD CONSTRAINT "hh_contratos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hh_registros" ADD CONSTRAINT "hh_registros_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_aprovador_cliente_id_usuarios_id_fk" FOREIGN KEY ("aprovador_cliente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_responsavel_interno_id_usuarios_id_fk" FOREIGN KEY ("responsavel_interno_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras_enderecos" ADD CONSTRAINT "obras_enderecos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo" ADD CONSTRAINT "rdo_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo" ADD CONSTRAINT "rdo_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo" ADD CONSTRAINT "rdo_aprovado_por_id_usuarios_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo_atividades" ADD CONSTRAINT "rdo_atividades_rdo_id_rdo_id_fk" FOREIGN KEY ("rdo_id") REFERENCES "public"."rdo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo_fotos" ADD CONSTRAINT "rdo_fotos_rdo_id_rdo_id_fk" FOREIGN KEY ("rdo_id") REFERENCES "public"."rdo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo_fotos" ADD CONSTRAINT "rdo_fotos_enviado_por_id_usuarios_id_fk" FOREIGN KEY ("enviado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo_funcionarios" ADD CONSTRAINT "rdo_funcionarios_rdo_id_rdo_id_fk" FOREIGN KEY ("rdo_id") REFERENCES "public"."rdo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo_servicos" ADD CONSTRAINT "rdo_servicos_rdo_id_rdo_id_fk" FOREIGN KEY ("rdo_id") REFERENCES "public"."rdo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rdo_servicos" ADD CONSTRAINT "rdo_servicos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;