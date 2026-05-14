import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  boolean,
  time,
  date,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const funcaoUsuarioEnum = pgEnum('funcao_usuario', [
  'admin',
  'engenheiro',
  'encarregado',
  'aprovador_cliente',
])

export const statusObraEnum = pgEnum('status_obra', [
  'planejada',
  'em_andamento',
  'pausada',
  'concluida',
])

export const statusServicoEnum = pgEnum('status_servico', [
  'pendente',
  'em_andamento',
  'concluido',
])

export const statusRdoEnum = pgEnum('status_rdo', [
  'rascunho',
  'pendente_aprovacao',
  'aprovado',
  'rejeitado',
])

export const climaRdoEnum = pgEnum('clima_rdo', [
  'ensolarado',
  'nublado',
  'chuvoso',
  'tempestade',
])

export const tipoDocumentoEnum = pgEnum('tipo_documento', [
  'contrato',
  'alvara',
  'planta',
  'relatorio',
  'outro',
])

// ─── Tables ──────────────────────────────────────────────────────────────────

export const empresas = pgTable('empresas', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: varchar('nome', { length: 255 }).notNull(),
  documento: varchar('documento', { length: 18 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  telefone: varchar('telefone', { length: 20 }),
  endereco: text('endereco'),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: varchar('nome', { length: 255 }).notNull(),
  documento: varchar('documento', { length: 18 }),
  email: varchar('email', { length: 255 }),
  telefone: varchar('telefone', { length: 20 }),
  endereco: text('endereco'),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  clerkId: varchar('clerk_id', { length: 255 }).unique(),
  nome: varchar('nome', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  senhaHash: text('senha_hash'),
  funcao: funcaoUsuarioEnum('funcao').notNull(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id),
  clienteId: uuid('cliente_id').references(() => clientes.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

export const obras = pgTable('obras', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: varchar('nome', { length: 255 }).notNull(),
  descricao: text('descricao'),
  status: statusObraEnum('status').notNull().default('planejada'),
  dataInicio: date('data_inicio'),
  dataFim: date('data_fim'),
  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id),
  aprovadorClienteId: uuid('aprovador_cliente_id').references(() => usuarios.id),
  responsavelInternoId: uuid('responsavel_interno_id').references(() => usuarios.id),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

export const servicos = pgTable('servicos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: varchar('nome', { length: 255 }).notNull(),
  descricao: text('descricao'),
  unidade: varchar('unidade', { length: 50 }).notNull(),
  precoUnitario: numeric('preco_unitario', { precision: 10, scale: 2 }).notNull(),
  status: statusServicoEnum('status').notNull().default('pendente'),
  obraId: uuid('obra_id')
    .notNull()
    .references(() => obras.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

export const rdo = pgTable('rdo', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  obraId: uuid('obra_id')
    .notNull()
    .references(() => obras.id),
  data: date('data').notNull(),
  criadoPorId: uuid('criado_por_id')
    .notNull()
    .references(() => usuarios.id),
  status: statusRdoEnum('status').notNull().default('rascunho'),
  clima: climaRdoEnum('clima').notNull(),
  assinaturaCliente: text('assinatura_cliente'),
  assinaturaInterna: text('assinatura_interna'),
  aprovadoEm: timestamp('aprovado_em'),
  aprovadoPorId: uuid('aprovado_por_id').references(() => usuarios.id),
  motivoRejeicao: text('motivo_rejeicao'),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

export const rdoAtividades = pgTable('rdo_atividades', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rdoId: uuid('rdo_id')
    .notNull()
    .references(() => rdo.id),
  descricao: text('descricao').notNull(),
  horaInicio: time('hora_inicio'),
  horaFim: time('hora_fim'),
  observacoes: text('observacoes'),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

export const rdoFuncionarios = pgTable('rdo_funcionarios', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rdoId: uuid('rdo_id')
    .notNull()
    .references(() => rdo.id),
  nomeFuncionario: varchar('nome_funcionario', { length: 255 }).notNull(),
  funcao: varchar('funcao', { length: 100 }),
  horasTrabalhadas: numeric('horas_trabalhadas', { precision: 5, scale: 2 }).notNull(),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

export const rdoServicos = pgTable('rdo_servicos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rdoId: uuid('rdo_id')
    .notNull()
    .references(() => rdo.id),
  servicoId: uuid('servico_id')
    .notNull()
    .references(() => servicos.id),
  quantidadeExecutada: numeric('quantidade_executada', { precision: 10, scale: 2 }).notNull(),
  observacoes: text('observacoes'),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

export const rdoFotos = pgTable('rdo_fotos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rdoId: uuid('rdo_id')
    .notNull()
    .references(() => rdo.id),
  url: text('url').notNull(),
  legenda: text('legenda'),
  tiradaEm: timestamp('tirada_em'),
  enviadoPorId: uuid('enviado_por_id')
    .notNull()
    .references(() => usuarios.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

export const documentos = pgTable('documentos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  tipo: tipoDocumentoEnum('tipo').notNull(),
  url: text('url').notNull(),
  obraId: uuid('obra_id').references(() => obras.id),
  clienteId: uuid('cliente_id').references(() => clientes.id),
  enviadoPorId: uuid('enviado_por_id')
    .notNull()
    .references(() => usuarios.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

export const notificacoes = pgTable('notificacoes', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  mensagem: text('mensagem').notNull(),
  lida: boolean('lida').notNull().default(false),
  tipo: varchar('tipo', { length: 100 }),
  referenciaId: uuid('referencia_id'),
  tabelaReferencia: varchar('tabela_referencia', { length: 100 }),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

// ─── Contratos ───────────────────────────────────────────────────────────────

export const statusContratoEnum = pgEnum('status_contrato', [
  'rascunho',
  'ativo',
  'suspenso',
  'encerrado',
])

export const contratos = pgTable('contratos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  numero: varchar('numero', { length: 100 }).notNull().unique(),
  clienteId: uuid('cliente_id')
    .notNull()
    .references(() => clientes.id),
  obraId: uuid('obra_id').references(() => obras.id),
  valorTotal: numeric('valor_total', { precision: 14, scale: 2 }).notNull(),
  dataInicio: date('data_inicio').notNull(),
  dataFim: date('data_fim'),
  status: statusContratoEnum('status').notNull().default('rascunho'),
  percentualExecucao: numeric('percentual_execucao', { precision: 5, scale: 2 }).notNull().default('0'),
  urlPdf: text('url_pdf'),
  observacoes: text('observacoes'),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

// ─── Homem Hora (HH) ─────────────────────────────────────────────────────────

export const hhContratos = pgTable('hh_contratos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  obraId: uuid('obra_id')
    .notNull()
    .references(() => obras.id),
  totalHH: numeric('total_hh', { precision: 10, scale: 2 }).notNull(),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

export const hhRegistros = pgTable('hh_registros', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  obraId: uuid('obra_id')
    .notNull()
    .references(() => obras.id),
  nomeFuncionario: varchar('nome_funcionario', { length: 255 }).notNull(),
  funcao: varchar('funcao', { length: 100 }),
  data: date('data').notNull(),
  horasNormais: numeric('horas_normais', { precision: 5, scale: 2 }).notNull().default('0'),
  horasExtras: numeric('horas_extras', { precision: 5, scale: 2 }).notNull().default('0'),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

// ─── Equipamentos ─────────────────────────────────────────────────────────────

export const statusEquipamentoEnum = pgEnum('status_equipamento', [
  'disponivel',
  'em_uso',
  'manutencao',
])

export const equipamentos = pgTable('equipamentos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nome: varchar('nome', { length: 255 }).notNull(),
  tipo: varchar('tipo', { length: 100 }),
  numeroSerie: varchar('numero_serie', { length: 100 }),
  status: statusEquipamentoEnum('status').notNull().default('disponivel'),
  obraId: uuid('obra_id').references(() => obras.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

export const equipamentoMovimentacoes = pgTable('equipamento_movimentacoes', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  equipamentoId: uuid('equipamento_id')
    .notNull()
    .references(() => equipamentos.id),
  tipo: varchar('tipo', { length: 10 }).notNull(), // 'entrada' | 'saida'
  obraId: uuid('obra_id').references(() => obras.id),
  responsavelId: uuid('responsavel_id').references(() => usuarios.id),
  data: date('data').notNull(),
  observacoes: text('observacoes'),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})

// ─── EPIs ─────────────────────────────────────────────────────────────────────

export const statusEpiEnum = pgEnum('status_epi', ['ativo', 'vencido'])

export const epis = pgTable('epis', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tipo: varchar('tipo', { length: 255 }).notNull(),
  numeroCa: varchar('numero_ca', { length: 50 }),
  validade: date('validade').notNull(),
  funcionarioNome: varchar('funcionario_nome', { length: 255 }).notNull(),
  dataEntrega: date('data_entrega').notNull(),
  status: statusEpiEnum('status').notNull().default('ativo'),
  obraId: uuid('obra_id').references(() => obras.id),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
})

// ─── Endereços de Obras (normalização) ───────────────────────────────────────

export const obrasEnderecos = pgTable('obras_enderecos', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  obraId: uuid('obra_id')
    .notNull()
    .unique()
    .references(() => obras.id),
  logradouro: varchar('logradouro', { length: 255 }),
  numero: varchar('numero', { length: 20 }),
  complemento: varchar('complemento', { length: 100 }),
  bairro: varchar('bairro', { length: 100 }),
  cidade: varchar('cidade', { length: 100 }),
  estado: varchar('estado', { length: 2 }),
  cep: varchar('cep', { length: 9 }),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
})
