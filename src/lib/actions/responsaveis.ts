'use server'

import { db } from '@/app/db'
import { obraResponsaveis, obras, usuarios, clientes, empresas } from '@/app/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioOuErro } from '@/lib/server/getUsuario'

// ─── Helpers de autorização ──────────────────────────────────────────────────

async function getAdminOuErro() {
  const u = await getUsuarioOuErro()
  if (u.funcao !== 'admin' && u.funcao !== 'engenheiro') throw new Error('Acesso negado')
  return u
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Retorna todos os clientes (da empresa do admin) com suas obras */
export async function listarClientesComObras() {
  const admin = await getAdminOuErro()

  const obrasRows = await db
    .select({
      obraId: obras.id,
      obraNome: obras.nome,
      obraStatus: obras.status,
      clienteId: clientes.id,
      clienteNome: clientes.nome,
    })
    .from(obras)
    .innerJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(eq(obras.empresaId, admin.empresaId))
    .orderBy(clientes.nome, obras.nome)

  // Agrupa por cliente
  const map = new Map<string, { clienteId: string; clienteNome: string; obras: typeof obrasRows }>()
  for (const row of obrasRows) {
    if (!map.has(row.clienteId)) {
      map.set(row.clienteId, { clienteId: row.clienteId, clienteNome: row.clienteNome, obras: [] })
    }
    map.get(row.clienteId)!.obras.push(row)
  }
  return Array.from(map.values())
}

/** Retorna responsáveis de uma obra com nome e papel */
export async function listarResponsaveisObra(obraId: string) {
  return db
    .select({
      id: obraResponsaveis.id,
      usuarioId: obraResponsaveis.usuarioId,
      papel: obraResponsaveis.papel,
      nome: usuarios.nome,
      email: usuarios.email,
      funcao: usuarios.funcao,
    })
    .from(obraResponsaveis)
    .innerJoin(usuarios, eq(obraResponsaveis.usuarioId, usuarios.id))
    .where(eq(obraResponsaveis.obraId, obraId))
    .orderBy(obraResponsaveis.papel, usuarios.nome)
}

/** Retorna todas as atribuições de um usuário */
export async function listarObrasDoUsuario(usuarioId: string) {
  const admin = await getAdminOuErro()
  return db
    .select({
      id: obraResponsaveis.id,
      papel: obraResponsaveis.papel,
      obraId: obras.id,
      obraNome: obras.nome,
      clienteId: clientes.id,
      clienteNome: clientes.nome,
    })
    .from(obraResponsaveis)
    .innerJoin(obras, and(eq(obraResponsaveis.obraId, obras.id), eq(obras.empresaId, admin.empresaId)))
    .innerJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(eq(obraResponsaveis.usuarioId, usuarioId))
    .orderBy(clientes.nome, obras.nome)
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export type AtribuirPayload = {
  usuarioId: string
  papel: 'encarregado' | 'aprovador'
  obraIds: string[]
  /** Se fornecido, atualiza funcao + empresaId do usuário (para tirar do estado pendente) */
  setFuncao?: string
  setEmpresaId?: string
}

export async function atribuirResponsavel(
  payload: AtribuirPayload,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await getAdminOuErro()

    const { usuarioId, papel, obraIds, setFuncao, setEmpresaId } = payload
    if (!obraIds.length) return { success: false, error: 'Selecione ao menos uma obra' }

    // Verifica que as obras pertencem à empresa do admin
    const obrasValidas = await db
      .select({ id: obras.id })
      .from(obras)
      .where(and(inArray(obras.id, obraIds), eq(obras.empresaId, admin.empresaId)))

    if (obrasValidas.length !== obraIds.length) {
      return { success: false, error: 'Uma ou mais obras inválidas' }
    }

    // Insere novos vínculos (ignora duplicatas)
    await db
      .insert(obraResponsaveis)
      .values(obraIds.map((obraId) => ({ obraId, usuarioId, papel })))
      .onConflictDoNothing()

    // Atualiza funcao/empresaId se solicitado (retira do estado pendente)
    if (setFuncao && setEmpresaId) {
      await db
        .update(usuarios)
        .set({ funcao: setFuncao as any, empresaId: setEmpresaId, atualizadoEm: new Date() })
        .where(eq(usuarios.id, usuarioId))
    }

    revalidatePath('/usuarios')
    revalidatePath('/obras')
    obraIds.forEach((id) => revalidatePath(`/obras/${id}`))
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atribuir responsável'
    return { success: false, error: msg }
  }
}

/** Atribui usuário a TODAS as obras de um cliente (modo "cliente inteiro") */
export async function atribuirClienteInteiro(payload: {
  usuarioId: string
  papel: 'encarregado' | 'aprovador'
  clienteId: string
  setFuncao?: string
  setEmpresaId?: string
}): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const admin = await getAdminOuErro()
    const { usuarioId, papel, clienteId, setFuncao, setEmpresaId } = payload

    // Busca todas as obras desse cliente na empresa do admin
    const obrasCliente = await db
      .select({ id: obras.id })
      .from(obras)
      .innerJoin(clientes, eq(obras.clienteId, clientes.id))
      .where(and(eq(obras.clienteId, clienteId), eq(obras.empresaId, admin.empresaId)))

    if (!obrasCliente.length) {
      return { success: false, error: 'Nenhuma obra encontrada para este cliente' }
    }

    const obraIds = obrasCliente.map((o) => o.id)

    await db
      .insert(obraResponsaveis)
      .values(obraIds.map((obraId) => ({ obraId, usuarioId, papel })))
      .onConflictDoNothing()

    if (setFuncao && setEmpresaId) {
      await db
        .update(usuarios)
        .set({ funcao: setFuncao as any, empresaId: setEmpresaId, atualizadoEm: new Date() })
        .where(eq(usuarios.id, usuarioId))
    }

    revalidatePath('/usuarios')
    revalidatePath('/obras')
    return { success: true, count: obraIds.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atribuir cliente inteiro'
    return { success: false, error: msg }
  }
}

/** Retorna os IDs das obras às quais o usuário está atribuído */
export async function getObrasAtribuidasIds(usuarioId: string): Promise<string[]> {
  const rows = await db
    .select({ obraId: obraResponsaveis.obraId })
    .from(obraResponsaveis)
    .where(eq(obraResponsaveis.usuarioId, usuarioId))
  return rows.map((r) => r.obraId)
}

/** Verifica se o usuário está atribuído a uma obra específica */
export async function isUsuarioAtribuidoObra(usuarioId: string, obraId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: obraResponsaveis.id })
    .from(obraResponsaveis)
    .where(and(eq(obraResponsaveis.usuarioId, usuarioId), eq(obraResponsaveis.obraId, obraId)))
    .limit(1)
  return !!row
}

export async function removerResponsavel(
  responsavelId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getAdminOuErro()

    const [row] = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(eq(obraResponsaveis.id, responsavelId))
      .limit(1)

    await db.delete(obraResponsaveis).where(eq(obraResponsaveis.id, responsavelId))

    revalidatePath('/usuarios')
    if (row) revalidatePath(`/obras/${row.obraId}`)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover responsável'
    return { success: false, error: msg }
  }
}
