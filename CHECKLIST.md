# CHECKLIST — CMI Gestão

Última atualização: 2026-05-25

---

## ✅ Módulo Homem Hora (HH) — Concluído em 2026-05-25

### F0 — Diagnóstico
- [x] Schema auditado: `hhContratos`, `hhRegistros`, `rdoFuncionarios`, `contratos`, `obras`
- [x] Causa raiz do "0h / 0h": rota `/hh/contrato` não existia (404)
- [x] Causa dos "16h" em serviços avulsos: lançamentos manuais sem validação de tipo
- [x] Brecha de isolamento identificada: `ContratosPage` sem filtro `empresaId`

### F1 — Correção do 404
- [x] Criado `src/app/(auth)/hh/contrato/page.tsx`
- [x] Botão "Definir HH Contratado" agora funciona corretamente
- [x] Redireciona clientes (`aprovador_cliente`) de volta a `/hh`

### F2 — Saneamento de dados
- [x] 2 registros indevidos excluídos após confirmação (16h, obra "serviços avulsos", nomes "abc" e "JHJH")
- [x] `hh_registros` limpo

### F3 — Automação do consumo via RDO
- [x] Migração `0004_happy_bloodaxe.sql` aplicada no Neon:
  - Enum `tipo_contrato` criado (`homem_hora | valor_fechado`)
  - Campo `tipo` adicionado em `contratos` com DEFAULT `valor_fechado` — dados existentes preservados
- [x] Fonte oficial de consumo: `rdoFuncionarios.horasTrabalhadas` (RDOs com `status != 'rejeitado'`)
- [x] Estorno automático: RDO rejeitado sai do `SUM` → horas voltam ao saldo
- [x] Painel HH: INNER JOIN com `hhContratos` — só exibe obras com HH contratado definido
- [x] `hhRegistros` permanece como anotação manual (não afeta saldo)
- [x] Alertas 80%/100% atualizados para usar `rdoFuncionarios` como fonte (consistência)

### F4 — UI de contratos + isolamento
- [x] Campo `tipo` no formulário `/contratos/novo` (Valor Fechado / Homem Hora)
- [x] Actions `criarContrato` e `atualizarContrato` salvam o campo `tipo`
- [x] Listagem `/contratos`: coluna "Tipo" com badge visual
- [x] **Brecha de isolamento corrigida**: `ContratosPage` filtra por `empresaId` via INNER JOIN
- [x] `/contratos/novo`: queries filtradas por `empresaId`
- [x] `/hh/contrato`: exibe apenas obras com contrato `homem_hora`

### F5 — Build
- [x] `npx tsc --noEmit` — zero erros
- [x] `npm run build` — zero erros, todas as 27 rotas compiladas

---

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/app/db/schema.ts` | + enum `tipoContratoEnum`, + campo `tipo` em `contratos` |
| `drizzle/0004_happy_bloodaxe.sql` | Migração incremental (aplicada) |
| `src/lib/actions/hh.ts` | Fonte de consumo → `rdoFuncionarios`; INNER JOIN no painel |
| `src/lib/actions/contratos.ts` | + campo `tipo` em criar e atualizar |
| `src/app/(auth)/hh/contrato/page.tsx` | **Criado** — corrige o 404 |
| `src/app/(auth)/contratos/page.tsx` | + coluna Tipo; + filtro `empresaId` (fix isolamento crítico) |
| `src/app/(auth)/contratos/novo/page.tsx` | + campo tipo; + filtro `empresaId` nas queries |

---

## Regras de negócio implementadas

1. **Tipo de contrato**: `homem_hora` ou `valor_fechado` (DEFAULT). Existentes: `valor_fechado`.
2. **Saldo HH** = `hhContratos.totalHH` − `SUM(rdoFuncionarios.horasTrabalhadas)` de RDOs não-rejeitados. Calculado sob demanda — sem saldo fixo armazenado.
3. **Estorno automático**: rejeitar RDO devolve as horas ao saldo sem código extra.
4. **Painel HH**: exibe apenas obras com HH contratado definido (`hh_contratos`).
5. **`hhRegistros`**: anotação manual — não entra no saldo.
6. **Isolamento**: todas as queries filtram por `empresaId` do usuário autenticado.

---

## Variáveis de ambiente necessárias

### Local (`.env`)
```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_ADMIN_ID=user_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://cmiggestao.vercel.app
```

### Vercel (Settings → Environment Variables)
Mesmas variáveis acima. Atenção:
- `DATABASE_URL` — string Neon com `sslmode=require&channel_binding=require`
- `CLERK_WEBHOOK_SECRET` — Clerk Dashboard → Webhooks → endpoint `/api/webhooks/clerk`
- `CLERK_ADMIN_ID` — ID do usuário admin no Clerk

---

---

## ✅ Série de Itens 2026-05 — CONCLUÍDA (2026-05-26)

### ITEM 1 — Tela de Usuários mostra todos ✅
- [x] Migração `0006_pending_users.sql`: enum `funcao_usuario` ganha `'pendente'`; `empresa_id` vira nullable
- [x] Schema Drizzle atualizado (funcaoUsuarioEnum + empresaId nullable)
- [x] `getUsuario.ts`: trata usuários pendentes
- [x] Webhook `user.created`: auto-cadastros criam row `funcao='pendente'`
- [x] `UsuariosPage`: pendentes separados + ativos; apenas admin/engenheiro acessa
- [x] Build OK — zero erros TypeScript

### ITEM A — Atribuição de responsáveis ✅
- [x] Migração `0007_obra_responsaveis.sql`: tabela `obra_responsaveis` (N:N), enum `papel_responsavel`, migra dados existentes de `aprovadorClienteId` e `responsavelInternoId`
- [x] Schema Drizzle: tabela `obraResponsaveis` com `papelResponsavelEnum`
- [x] Actions: `atribuirResponsavel`, `atribuirClienteInteiro`, `removerResponsavel`, `getObrasAtribuidasIds`, `isUsuarioAtribuidoObra`
- [x] Form `/usuarios/[id]/editar`: toggle "Obras específicas" / "Cliente inteiro"; atribuição de pendente tira do estado pendente
- [x] Build OK

### ITEM B — Permissões aplicadas ✅
- [x] `listarRdos`: encarregado filtra por obras atribuídas via `obraResponsaveis`
- [x] `criarRdoCompleto`: encarregado só cria RDO de obras atribuídas
- [x] RDO detail page: encarregado/aprovador filtrado por `obraResponsaveis`
- [x] Sem 404: `redirect('/aguardando')` para acessos não autorizados
- [x] Admin/engenheiro: acesso total à empresa

### ITEM C — Três formas de validação do RDO ✅
- [x] Migração `0008_rdo_assinatura_externa.sql`: campos `nome_assinante_externo`, `cargo_assinante_externo` no DB
- [x] Schema: `nomeAssinanteExterno`, `cargoAssinanteExterno` em `rdo`
- [x] Action `assinarInLocoComConta`: aprovador presente assina no aparelho do encarregado; registra `aprovadoPorId`
- [x] Action `assinarInLocoSemConta`: nome + cargo + canvas; salva em campos externos
- [x] `rdo-acoes-interno.tsx`: 3 modos com tabs (Link, In loco c/ conta, In loco s/ conta)
- [x] RDO detail page: carrega aprovadores da obra; mostra identidade do assinante
- [x] Modo link (existente): mantido; geração e exibição do link de aprovação

### ITEM D — PDF ✅
- [x] `rdo-pdf.tsx`: exibe nome do assinante externo ou aprovadoPorNome na seção de assinaturas
- [x] `RdoPdfData`: campos `nomeAssinanteExterno`, `cargoAssinanteExterno`, `aprovadoPorNome`
- [x] **NOVO** `/api/hh/pdf?obraId=...`: PDF de controle de horas (HH)
  - Barra de progresso visual (verde/amarelo/vermelho)
  - Cards: Total Contratado, Consumido (%), Saldo Disponível
  - Tabela de lançamentos por RDO (fonte oficial do saldo)
  - Tabela de registros manuais
  - Acessível para admin/engenheiro e cliente dono do contrato
- [x] Botão `FileDown` em cada card de obra na tela `/hh`
- [x] Build OK — zero erros TypeScript, 35 rotas compiladas

---

## Próximos passos sugeridos

- [ ] Página de edição de contrato (`/contratos/[id]/editar`) com campo `tipo`
- [ ] Upload de fotos no RDO (Vercel Blob)
- [ ] Envio de e-mail com PDF após aprovação (RESEND_API_KEY)
