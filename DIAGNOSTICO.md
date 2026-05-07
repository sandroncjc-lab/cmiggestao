# DIAGNOSTICO.md — CMI Gestão

> Gerado em 2026-05-06. Diagnóstico de onboarding — somente leitura.

---

## 1. Stack e Versões

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js | 16.2.4 |
| Runtime | React | 19.2.4 |
| Linguagem | TypeScript | ^5 |
| Banco de dados | Neon (PostgreSQL serverless) | @neondatabase/serverless ^1.1.0 |
| ORM | Drizzle ORM | ^0.45.2 |
| Migrações | Drizzle Kit | ^0.31.10 |
| Autenticação | Clerk | @clerk/nextjs ^7.3.0 |
| UI Components | shadcn (Radix UI) | shadcn ^4.6.0, radix-ui ^1.4.3 |
| CSS | Tailwind CSS v4 | ^4 |
| Ícones | Lucide React | ^1.14.0 |

---

## 2. Tabelas do Schema (`src/app/db/schema.ts`)

### `empresas`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| nome | varchar(255) | NOT NULL |
| documento | varchar(18) | NOT NULL, UNIQUE |
| email | varchar(255) | nullable |
| telefone | varchar(20) | nullable |
| endereco | text | nullable |
| criado_em | timestamp | defaultNow |

### `usuarios`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| nome | varchar(255) | NOT NULL |
| email | varchar(255) | NOT NULL, UNIQUE |
| senha_hash | text | NOT NULL |
| funcao | enum | admin \| engenheiro \| encarregado \| aprovador_cliente |
| empresa_id | uuid | FK → empresas |
| criado_em | timestamp | |
| atualizado_em | timestamp | |

### `clientes`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| nome | varchar(255) | NOT NULL |
| documento | varchar(18) | nullable |
| email | varchar(255) | nullable |
| telefone | varchar(20) | nullable |
| endereco | text | nullable |
| empresa_id | uuid | FK → empresas |
| criado_em / atualizado_em | timestamp | |

### `obras`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| nome | varchar(255) | NOT NULL |
| descricao | text | nullable |
| status | enum | planejada \| em_andamento \| pausada \| concluida |
| data_inicio | date | nullable |
| data_fim | date | nullable |
| cliente_id | uuid | FK → clientes |
| aprovador_cliente_id | uuid | FK → usuarios, nullable |
| responsavel_interno_id | uuid | FK → usuarios, nullable |
| empresa_id | uuid | FK → empresas |
| criado_em / atualizado_em | timestamp | |

### `servicos`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| nome | varchar(255) | NOT NULL |
| descricao | text | nullable |
| unidade | varchar(50) | NOT NULL |
| preco_unitario | numeric(10,2) | NOT NULL |
| status | enum | pendente \| em_andamento \| concluido |
| obra_id | uuid | FK → obras |
| criado_em / atualizado_em | timestamp | |

### `rdo`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid | PK |
| obra_id | uuid | FK → obras |
| data | date | NOT NULL |
| criado_por_id | uuid | FK → usuarios |
| status | enum | rascunho \| pendente_aprovacao \| aprovado \| rejeitado |
| clima | enum | ensolarado \| nublado \| chuvoso \| tempestade |
| assinatura_cliente | text | nullable |
| assinatura_interna | text | nullable |
| aprovado_em | timestamp | nullable |
| aprovado_por_id | uuid | FK → usuarios, nullable |
| motivo_rejeicao | text | nullable |
| criado_em / atualizado_em | timestamp | |

### `rdo_atividades`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| rdo_id | FK → rdo |
| descricao | text NOT NULL |
| hora_inicio / hora_fim | time, nullable |
| observacoes | text, nullable |
| criado_em | timestamp |

### `rdo_funcionarios`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| rdo_id | FK → rdo |
| nome_funcionario | varchar(255) |
| funcao | varchar(100), nullable |
| horas_trabalhadas | numeric(5,2) |
| criado_em | timestamp |

### `rdo_servicos`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| rdo_id | FK → rdo |
| servico_id | FK → servicos |
| quantidade_executada | numeric(10,2) |
| observacoes | text, nullable |
| criado_em | timestamp |

### `rdo_fotos`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| rdo_id | FK → rdo |
| url | text NOT NULL |
| legenda | text, nullable |
| tirada_em | timestamp, nullable |
| enviado_por_id | FK → usuarios |
| criado_em | timestamp |

### `documentos`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| titulo | varchar(255) | |
| tipo | enum | contrato \| alvara \| planta \| relatorio \| outro |
| url | text | |
| obra_id | uuid | FK → obras, nullable |
| cliente_id | uuid | FK → clientes, nullable |
| enviado_por_id | uuid | FK → usuarios |
| criado_em | timestamp | |

### `notificacoes`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| usuario_id | FK → usuarios |
| titulo | varchar(255) |
| mensagem | text |
| lida | boolean default false |
| tipo | varchar(100), nullable |
| referencia_id | uuid, nullable |
| tabela_referencia | varchar(100), nullable |
| criado_em | timestamp |

### `contratos`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| numero | varchar(100) | UNIQUE |
| cliente_id | FK → clientes | |
| obra_id | FK → obras | nullable |
| valor_total | numeric(14,2) | |
| data_inicio | date | |
| data_fim | date | nullable |
| status | enum | rascunho \| ativo \| suspenso \| encerrado |
| percentual_execucao | numeric(5,2) | default 0 |
| url_pdf | text | nullable |
| observacoes | text | nullable |
| criado_em / atualizado_em | timestamp | |

### `hh_contratos`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| obra_id | FK → obras |
| total_hh | numeric(10,2) |
| criado_em / atualizado_em | timestamp |

### `hh_registros`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| obra_id | FK → obras |
| nome_funcionario | varchar(255) |
| funcao | varchar(100), nullable |
| data | date |
| horas_normais | numeric(5,2) default 0 |
| horas_extras | numeric(5,2) default 0 |
| criado_em | timestamp |

### `equipamentos`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| nome | varchar(255) | |
| tipo | varchar(100), nullable | |
| numero_serie | varchar(100), nullable | |
| status | enum | disponivel \| em_uso \| manutencao |
| obra_id | FK → obras | nullable |
| criado_em / atualizado_em | timestamp | |

### `equipamento_movimentacoes`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| equipamento_id | FK → equipamentos |
| tipo | varchar(10) — 'entrada' \| 'saida' |
| obra_id | FK → obras, nullable |
| responsavel_id | FK → usuarios, nullable |
| data | date |
| observacoes | text, nullable |
| criado_em | timestamp |

### `epis`
| Campo | Tipo | Observação |
|---|---|---|
| id | uuid PK | |
| tipo | varchar(255) | |
| numero_ca | varchar(50), nullable | |
| validade | date | |
| funcionario_nome | varchar(255) | |
| data_entrega | date | |
| status | enum | ativo \| vencido |
| obra_id | FK → obras, nullable | |
| criado_em / atualizado_em | timestamp | |

### `obras_enderecos`
| Campo | Tipo |
|---|---|
| id | uuid PK |
| obra_id | FK → obras, UNIQUE |
| logradouro / numero / complemento / bairro / cidade / estado / cep | varchar, nullable |
| criado_em | timestamp |

**Total: 18 tabelas**

---

## 3. Multi-Tenant (`empresa_id`)

**Sim.** O sistema é multi-tenant por `empresa_id`.

- Tabelas com isolamento direto: `usuarios`, `clientes`, `obras`
- Tabelas isoladas indiretamente (via `obra_id`): `servicos`, `rdo`, `contratos`, `hh_contratos`, `hh_registros`, `equipamentos`, `epis`, `documentos`
- `getSessionUsuario()` (`src/data/session.ts`) retorna o `empresaId` do usuário logado, que é usado como filtro nas queries do dashboard e outras pages.
- **Atenção:** as server actions (ex: `criarCliente`) recebem `empresaId` via `FormData` — não há enforcement automático no nível do ORM; depende de o front sempre enviar o valor correto.

---

## 4. Sistema de Roles

**Sim.** Enum `funcao_usuario` na tabela `usuarios`:

| Valor | Papel |
|---|---|
| `admin` | Administrador da empresa |
| `engenheiro` | Engenheiro responsável |
| `encarregado` | Encarregado de obra |
| `aprovador_cliente` | Aprovador externo (cliente) |

- O campo `funcao` é exposto em `getSessionUsuario()` mas **não há middleware/guard** que bloqueie rotas com base no role — toda a proteção atual é feita via Clerk (autenticado vs não-autenticado).
- Não existe lógica de autorização por role nas Server Actions ou páginas.

---

## 5. Status de cada Módulo

| Módulo | Rota | Status | Observação |
|---|---|---|---|
| Dashboard | `/dashboard` | ✅ Funcional | Dados reais do banco, filtrados por empresa |
| Clientes | `/clientes` | ✅ Funcional | CRUD completo (listar, criar, editar, excluir) |
| Obras | `/obras` | ✅ Funcional | Listagem + detalhe, dados reais |
| Contratos | `/contratos` | ✅ Funcional | Listagem + formulário de criação |
| RDO | `/rdo` | ⚠️ Parcial | Listagem funcional; formulário de criação com server action; sub-tabelas (`rdo_atividades`, `rdo_funcionarios`, `rdo_servicos`) não usadas nas actions |
| HH | `/hh` | ✅ Funcional | Listagem de registros + formulário de criação |
| Equipamentos | `/equipamentos` | ✅ Funcional | Listagem com dados reais |
| EPIs | `/epis` | ✅ Funcional | Listagem + formulário de criação |
| Documentos | `/documentos` | ✅ Funcional | Listagem com dados reais |
| Usuários | `/usuarios` | ⚠️ Parcial | Listagem funcional; rota `/usuarios/novo` e `/usuarios/[id]/editar` não existem (links quebrados) |
| Diário de Obras | `/diario` | ❌ Mock | 100% mock data (`mockRdos`, `mockDocumentos`, `mockHH`); depende de `date-fns` não instalado |

---

## 6. Resultado de `npx tsc --noEmit`

```
src/app/(auth)/diario/page.tsx(4,24): error TS2307:
  Cannot find module 'date-fns' or its corresponding type declarations.

src/app/(auth)/diario/page.tsx(5,22): error TS2307:
  Cannot find module 'date-fns/locale' or its corresponding type declarations.
```

**2 erros** — todos no módulo Diário. Causa: pacote `date-fns` não está instalado.  
Correção: `npm install date-fns`

---

## 7. Resultado de `npm run lint` (ESLint)

**54 problemas: 14 erros, 40 warnings**

### Erros (14)

| Arquivo | Erro |
|---|---|
| `clientes/[id]/page.tsx` (×2) | `@typescript-eslint/no-explicit-any` |
| `contratos/page.tsx` | `@typescript-eslint/no-explicit-any` |
| `documentos/page.tsx` | `@typescript-eslint/no-explicit-any` |
| `epis/page.tsx` | `@typescript-eslint/no-explicit-any` + `react-hooks/purity` (`Date.now()` em render) |
| `equipamentos/page.tsx` | `@typescript-eslint/no-explicit-any` |
| `hh/page.tsx` | `@typescript-eslint/no-explicit-any` |
| `obras/[id]/page.tsx` (×2) | `@typescript-eslint/no-explicit-any` |
| `obras/page.tsx` | `@typescript-eslint/no-explicit-any` |
| `rdo/page.tsx` | `@typescript-eslint/no-explicit-any` |
| `usuarios/page.tsx` | `@typescript-eslint/no-explicit-any` |
| `components/layout/header.tsx` | `react-hooks/set-state-in-effect` (setState síncrono dentro de effect) |

### Warnings (40)
Majoritariamente imports não utilizados (`@typescript-eslint/no-unused-vars`) espalhados por várias páginas — resíduos de refatorações.

---

## 8. Variáveis de Ambiente (`.env`)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=***
CLERK_SECRET_KEY=***
DATABASE_URL=***
NEXT_PUBLIC_CLERK_SIGN_IN_URL=***
NEXT_PUBLIC_CLERK_SIGN_UP_URL=***
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=***
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=***
```

7 variáveis configuradas. Sem `.env.example` para referência.

---

## Resumo Executivo

- **Build:** provavelmente quebrado por falta do `date-fns` (TS error em `/diario`)
- **Lint:** 14 erros reais — `any` explícito generalizado e 2 violações de regras React
- **Maior risco:** server actions não validam `empresaId` no servidor — dependem do cliente enviá-lo corretamente (potencial vazamento cross-tenant)
- **Próximos passos prioritários:**
  1. `npm install date-fns` (fix imediato no build)
  2. Criar rota `/usuarios/novo` (links ativos na UI)
  3. Adicionar `getSessionUsuario()` nas server actions para enforcement server-side do `empresaId`
  4. Conectar `/diario` ao banco real substituindo os mocks
