# CHECKLIST DE PRODUÇÃO — CMIG Gestão
> Análise realizada em: 2026-05-20 | Tech Lead Review

---

## 1. SEGURANÇA

| Item | Status | Detalhe |
|------|--------|---------|
| Server actions validam autenticação | ⚠️ Atenção | `obras.ts`, `hh.ts`, `contratos.ts`, `servicos.ts`, `equipamentos.ts` têm actions **sem nenhuma verificação de auth** (ex: `atualizarStatusObra`, `excluirObra`, `registrarHH`, `definirHHContratado`, `excluirRegistroHH`, `criarContrato`) |
| Multi-tenancy (empresaId) em todas as listagens | ❌ Quebrado | `listarRdos()` e `listarHHDados()` para usuários internos retornam dados de **todas as empresas** — não filtra por `empresaId`. Um admin de empresa A vê RDOs da empresa B. |
| `aprovador_cliente` vê só obras do seu cliente | ✅ OK | `listarRdos` e `listarHHDados` filtram por `clienteId` quando `funcao === 'aprovador_cliente'` |
| `.env` no `.gitignore` | ✅ OK | `.gitignore` inclui `.env*` (cobre `.env`, `.env.local`, etc.) |
| Proteção de rotas via proxy | ✅ OK | `src/proxy.ts` existe (Clerk middleware) |

---

## 2. BUGS CRÍTICOS

| Item | Status | Detalhe |
|------|--------|---------|
| CRUD de Clientes | ✅ OK | Criar, editar, excluir com validação Zod e auth |
| CRUD de Obras | ⚠️ Atenção | `atualizarStatusObra` e `excluirObra` não verificam se a obra pertence à empresa do usuário — qualquer autenticado pode excluir obra alheia |
| CRUD de Contratos | ❌ Quebrado | `criarContrato`, `excluirContrato` sem qualquer verificação de auth — endpoints completamente abertos |
| CRUD de HH | ⚠️ Atenção | `registrarHH`, `definirHHContratado`, `excluirRegistroHH` sem verificação de auth |
| Build sem erros | ⚠️ Atenção | Não executado nesta análise; verificar antes do deploy |
| Alertas de HH (80%/100%) | ⚠️ Atenção | Lógica usa faixas muito estreitas (`pct >= 80 && pct < 81`) — alerta de 80% só dispara se o consumo cair exatamente nessa janela de 1%; na prática quase nunca dispara |

---

## 3. FUNCIONALIDADES ESSENCIAIS

| Item | Status | Detalhe |
|------|--------|---------|
| Login/logout | ✅ OK | Clerk gerencia — rotas protegidas pelo `proxy.ts` |
| RDO com assinatura touch | ✅ OK | `rdo-form.tsx` implementa canvas com eventos mouse e touch (`startDraw`, `getPos` com `touches`) |
| Notificações ao aprovador (RDO) | ✅ OK | `criarRdoCompleto` e `enviarRdoParaAprovacao` inserem na tabela `notificacoes` para `aprovadorClienteId` |
| Notificações ao aprovador (HH) | ✅ OK | `registrarHH` notifica `aprovadorClienteId` da obra |
| HH calculando saldo | ✅ OK | Saldo = `totalHH - consumidoHH` calculado via `coalesce(sum(horas_normais + horas_extras))` |
| Layout auth sem redirecionamento para usuário sem empresaId | ⚠️ Atenção | `AuthLayout` usa `funcao ?? 'admin'` como fallback — se usuário Clerk não tiver registro local, funcao vira 'admin' silenciosamente |

---

## 5 PROBLEMAS MAIS CRÍTICOS PARA PRODUÇÃO

### ❌ CRÍTICO 1 — Multi-tenancy quebrado nas listagens internas
**Impacto:** Empresa A pode ver RDOs, HH e dados da empresa B.

**Arquivo:** `src/lib/actions/rdo.ts:29-33` e `src/lib/actions/hh.ts:21-26`

**Solução:**
```ts
// Em listarRdos() — branch do usuário interno (não-cliente):
return db.select(...)
  .from(rdo)
  .leftJoin(obras, eq(rdo.obraId, obras.id))
  .where(eq(obras.empresaId, usuario.empresaId))  // ← adicionar isso
  .orderBy(rdo.data)

// Em listarHHDados() — mesmo padrão:
.where(eq(obras.empresaId, usuario.empresaId))
```

---

### ❌ CRÍTICO 2 — Actions de Contratos sem autenticação
**Impacto:** Qualquer requisição HTTP pode criar, editar ou excluir contratos de qualquer empresa.

**Arquivo:** `src/lib/actions/contratos.ts`

**Solução:** Adicionar no início de cada action:
```ts
const empresaId = await getEmpresaIdOuErro() // lança erro se não autenticado
```
E filtrar queries por `eq(contratos.empresaId, empresaId)` (se a coluna existir no schema) ou validar via join com cliente.

---

### ⚠️ CRÍTICO 3 — `excluirObra` e `atualizarStatusObra` sem verificação de ownership
**Impacto:** Um usuário autenticado de qualquer empresa pode excluir obras alheias passando um UUID.

**Arquivo:** `src/lib/actions/obras.ts:57-69`

**Solução:**
```ts
export async function excluirObra(id: string) {
  const empresaId = await getEmpresaIdOuErro()
  await db.delete(obras)
    .where(and(eq(obras.id, id), eq(obras.empresaId, empresaId)))
  revalidatePath('/obras')
}
```

---

### ⚠️ CRÍTICO 4 — Actions de HH sem autenticação
**Impacto:** `registrarHH`, `definirHHContratado`, `excluirRegistroHH` executam sem verificar sessão.

**Arquivo:** `src/lib/actions/hh.ts:61-141`

**Solução:** Adicionar `const usuario = await getUsuarioAtual(); if (!usuario) throw new Error('Não autenticado')` no início de cada uma. Para `excluirRegistroHH`, verificar também ownership via join com obras.

---

### ⚠️ CRÍTICO 5 — Alertas de consumo de HH nunca disparam
**Impacto:** Responsáveis não são notificados ao atingir 80% do HH contratado (janela de 1% nunca é capturada incrementalmente).

**Arquivo:** `src/lib/actions/hh.ts:122-131`

**Solução:** Trocar a lógica de faixa exata por verificação de cruzamento de limiar:
```ts
// Buscar consumo anterior (antes deste registro) para detectar cruzamento
// Ou simplificar: verificar se pct >= 80 && pctAnterior < 80
// Solução mais simples: checar apenas o limite superior
if (pct >= 80 && pct < 100) { /* alerta 80% */ }
if (pct >= 100) { /* alerta 100% */ }
```

---

## Resumo Executivo

| Área | Nota |
|------|------|
| Segurança | 4/10 — multi-tenancy quebrado, várias actions sem auth |
| Bugs | 6/10 — CRUD principal funciona, mas ações destrutivas sem proteção |
| Funcionalidades | 8/10 — fluxo principal (RDO, assinatura, notificações) operacional |

**Veredicto: NÃO está pronto para produção.** Os itens Crítico 1 e 2 expõem dados de todas as empresas e devem ser corrigidos antes de qualquer deploy.
